import { Readable } from "node:stream";
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Platform, QualityLabel, RawFormat, YtDlpInfo } from "./types";

const QUALITY_ORDER: QualityLabel[] = ["144p", "240p", "360p", "480p", "720p", "1080p"];

function heightToQuality(height: number): QualityLabel {
  if (height <= 144) return "144p";
  if (height <= 240) return "240p";
  if (height <= 360) return "360p";
  if (height <= 480) return "480p";
  if (height <= 720) return "720p";
  return "1080p";
}
function none(codec?: string | null) { return !codec || codec === "none"; }

export function runYtDlp(args: string[], timeoutMs = 120_000): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const pythonBin = process.env["MEDIAFLOW_PYTHON"] || "python3";
    const child = spawn(pythonBin, ["-m", "yt_dlp", ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });
    let stdout = "", stderr = "";
    let settled = false;
    const finish = (fn: () => void) => { if (settled) return; settled = true; clearTimeout(timer); fn(); };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(() => reject(new Error("Timed out while processing the media. Try a lower quality or a shorter public video.")));
    }, timeoutMs);
    child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
    child.stdout.on("data", c => { stdout += c; });
    child.stderr.on("data", c => { stderr += c; });
    child.on("error", err => finish(() => reject(err)));
    child.on("close", code => finish(() => resolve({ stdout, stderr, code: code ?? 1 })));
  });
}

const commonArgs = [
  "--force-ipv4",
  "--js-runtimes", process.env["MEDIAFLOW_JS_RUNTIME"] || "node",
  "--remote-components", "ejs:github",
  "--no-warnings",
  "--no-playlist",
];

const youtubeFallbackArgs = [
  "--extractor-args",
  "youtube:player_client=android_vr,web_embedded",
];

export async function probeWithYtDlp(url: string, platform: Platform): Promise<YtDlpInfo> {
  let result = await runYtDlp([...commonArgs, "--skip-download", "-J", url], 120_000);
  // YouTube is currently rolling out PO-token enforcement for some clients.
  // If the default client exposes no usable formats, retry with clients that
  // yt-dlp currently documents as not requiring a PO token for GVS.
  if (result.code !== 0 && /403|forbidden|po token|proof of origin|sign in|not a bot|429|too many requests/i.test(result.stderr || result.stdout)) {
    result = await runYtDlp([...commonArgs, ...youtubeFallbackArgs, "--skip-download", "-J", url], 120_000);
  }
  const { stdout, stderr, code } = result;
  if (code !== 0) {
    const err = stderr || stdout;
    if (/not a bot|sign in|login required/i.test(err)) throw new Error("The platform requires sign-in for this request. Public media only.");
    if (/429|too many requests/i.test(err)) throw new Error("The platform is rate-limiting this request. Try again later.");
    if (/private|restricted|members-only/i.test(err)) throw new Error("This media is private or restricted.");
    throw new Error("Could not read that link. Check that it is public and try again.");
  }
  const info = JSON.parse(stdout) as YtDlpInfo;
  if (!info.id && !info.url) throw new Error("No media information was returned.");
  return info;
}

function directCandidates(raw: RawFormat[]) {
  return raw.filter(f => f.url && (!f.protocol || ["https", "http"].includes(f.protocol)) && !none(f.vcodec));
}
function size(f?: RawFormat | null) { return f ? (f.filesize ?? f.filesize_approx ?? null) : null; }

export function buildFormats(raw: RawFormat[]) {
  const videos = directCandidates(raw).filter(f => (f.height ?? 0) > 0 && (f.height ?? 0) <= 1080);
  const best = new Map<QualityLabel, RawFormat>();
  for (const f of videos) {
    const q = heightToQuality(f.height ?? 0);
    const score = (none(f.acodec) ? 0 : 2_000_000_000) + (f.ext === "mp4" ? 100_000_000 : 0) + (size(f) ?? 0);
    const cur = best.get(q);
    const curScore = cur ? (none(cur.acodec) ? 0 : 2_000_000_000) + (cur.ext === "mp4" ? 100_000_000 : 0) + (size(cur) ?? 0) : -1;
    if (score > curScore) best.set(q, f);
  }
  return QUALITY_ORDER.filter(q => best.has(q)).map(q => {
    const f = best.get(q)!;
    return { q, f };
  });
}

export function selectAudio(raw: RawFormat[]) {
  return raw.filter(f => f.url && none(f.vcodec) && !none(f.acodec) && (!f.protocol || ["https", "http"].includes(f.protocol)))
    .sort((a,b) => (size(b) ?? 0) - (size(a) ?? 0))
    .find(f => f.ext === "m4a" || f.ext === "mp4") ?? null;
}

export function formatSelector(quality: QualityLabel, kind: "video" | "audio" | "video+audio") {
  if (kind === "audio") return "ba[ext=m4a]/ba";
  const h = Number(quality.slice(0, -1));
  if (kind === "video") return `bv*[height<=${h}][ext=mp4]/bv*[height<=${h}]/b[height<=${h}]`;
  return `bv*[height<=${h}][ext=mp4]+ba[ext=m4a]/bv*[height<=${h}]+ba/b[height<=${h}]`;
}

export async function downloadWithYtDlp(opts: { url: string; quality: QualityLabel; kind: "video" | "audio" | "video+audio" }) {
  const dir = await mkdtemp(join(tmpdir(), "mediaflow-"));
  const template = join(dir, "media.%(ext)s");
  const selector = formatSelector(opts.quality, opts.kind);
  const args = [
    ...commonArgs,
    "--retries", "10",
    "--fragment-retries", "10",
    "--concurrent-fragments", "4",
    "--socket-timeout", "30",
    "--newline",
    "-f", selector,
    "-o", template,
  ];
  if (opts.kind === "video+audio") args.push("--merge-output-format", "mp4");
  args.push(opts.url);

  let result = await runYtDlp(args, 60 * 60 * 1000);
  if (result.code !== 0 && /403|forbidden|po token|proof of origin|sign in|not a bot|429|too many requests/i.test(result.stderr || result.stdout)) {
    // Retry the same selection with YouTube clients that currently avoid the
    // affected GVS PO-token requirement where possible.
    result = await runYtDlp([...args.slice(0, commonArgs.length), ...youtubeFallbackArgs, ...args.slice(commonArgs.length)], 60 * 60 * 1000);
  }
  const { stderr, stdout, code } = result;
  if (code !== 0) {
    await rm(dir, { recursive: true, force: true });
    const text = stderr || stdout;
    if (/ffmpeg.*not found|ffmpeg is not installed/i.test(text)) throw new Error("FFmpeg is required for combined video + audio downloads.");
    if (/403|forbidden|po token|proof of origin/i.test(text)) throw new Error("YouTube rejected this media stream. The selected public format is currently unavailable from this network; try another available quality.");
    throw new Error("Download failed. The media may be private, restricted, geo-locked, or temporarily unavailable.");
  }
  const files = (await readdir(dir)).filter(f => !f.endsWith(".part") && !f.endsWith(".ytdl"));
  if (!files.length) { await rm(dir,{recursive:true,force:true}); throw new Error("yt-dlp finished without producing a file."); }
  const name = files[0]!;
  const filePath = join(dir, name);
  const info = await stat(filePath);
  if (info.size < 64) { await rm(dir,{recursive:true,force:true}); throw new Error("The downloaded file was empty."); }
  const ext = name.split(".").pop() || "mp4";
  const mime = ext === "m4a" ? "audio/mp4" : ext === "mp3" ? "audio/mpeg" : ext === "webm" ? (opts.kind === "audio" ? "audio/webm" : "video/webm") : "video/mp4";
  return { filePath, ext, mime, size: info.size, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

export function fileStreamResponse(filePath: string, headers: Headers, cleanup: () => Promise<void>) {
  const nodeStream = createReadStream(filePath);
  nodeStream.once("close", () => { void cleanup(); });
  nodeStream.once("error", () => { void cleanup(); });
  return new Response(Readable.toWeb(nodeStream) as ReadableStream, { status: 200, headers });
}
