import { spawn } from "node:child_process";
import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FormatKind, MediaInfo, QualityLabel, ServerFormat } from "./types";
import { QUALITY_ORDER } from "./types";

type YtDlpFormat = {
  format_id?: string;
  format_note?: string;
  ext?: string;
  width?: number | null;
  height?: number | null;
  vcodec?: string | null;
  acodec?: string | null;
  filesize?: number | null;
  filesize_approx?: number | null;
  protocol?: string;
  url?: string;
  duration?: number | null;
};

type YtDlpInfo = {
  id?: string;
  title?: string;
  uploader?: string;
  channel?: string;
  thumbnail?: string;
  duration?: number;
  duration_string?: string;
  webpage_url?: string;
  extractor?: string;
  formats?: YtDlpFormat[];
};

const command = process.env["YTDLP_BIN"] || "python3";

// YouTube currently requires a JavaScript challenge runtime plus the yt-dlp EJS
// challenge scripts for full format availability. The Python/PyPI install may
// not bundle EJS, so allow yt-dlp to fetch the pinned EJS package from GitHub.
// This is only a helper for public/authorized media; it does not bypass access controls.
const youtubeRuntimeArgs = ["--js-runtimes", process.env["MEDIAFLOW_JS_RUNTIME"] || "node", "--remote-components", "ejs:github"];

const commonArgs = [
  "--force-ipv4",
  ...youtubeRuntimeArgs,
  "--no-warnings",
  "--no-playlist",
];

function run(args: string[], timeoutMs: number, onLine?: (line: string) => void) {
  return new Promise<{ stdout: string; stderr: string; code: number }>((resolve, reject) => {
    const child = spawn(command, command === "python3" ? ["-m", "yt_dlp", ...args] : args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      if (!settled) {
        settled = true;
        reject(new Error("The operation timed out. The source may be slow or unavailable."));
      }
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      chunk.split(/\r?\n/).forEach((line) => onLine?.(line));
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
      chunk.split(/\r?\n/).forEach((line) => onLine?.(line));
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        resolve({ stdout, stderr, code: code ?? 1 });
      }
    });
  });
}

function quality(height: number): QualityLabel | null {
  if (!height || height <= 0) return null;

  // Some Instagram media reports non-standard heights such as
  // 1274 or 1914. Keep those streams instead of discarding them.
  if (height > 1080) return "1080p";

  if (height <= 144) return "144p";
  if (height <= 240) return "240p";
  if (height <= 360) return "360p";
  if (height <= 480) return "480p";
  if (height <= 720) return "720p";

  return "1080p";
}

function sizeBytes(f: YtDlpFormat) {
  return f.filesize ?? f.filesize_approx ?? null;
}

function extForVideo(formats: YtDlpFormat[]) {
  return formats.some((f) => f.ext === "mp4") ? "mp4" : formats[0]?.ext || "webm";
}


async function probeDirectMedia(url: string): Promise<{ duration: number; size: number }> {
  return new Promise((resolve) => {
    const child = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration,size",
      "-of", "default=noprint_wrappers=1:nokey=0",
      url,
    ], {
      stdio: ["ignore", "pipe", "ignore"],
    });

    let stdout = "";

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({ duration: 0, size: 0 });
    }, 20_000);

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.on("close", () => {
      clearTimeout(timer);

      let duration = 0;
      let size = 0;

      for (const line of stdout.split(/\r?\n/)) {
        const [key, value] = line.split("=", 2);
        if (key === "duration") duration = Number(value) || 0;
        if (key === "size") size = Number(value) || 0;
      }

      resolve({ duration, size });
    });

    child.on("error", () => {
      clearTimeout(timer);
      resolve({ duration: 0, size: 0 });
    });
  });
}

async function buildFormats(raw: YtDlpFormat[]): Promise<ServerFormat[]> {
  const valid = raw.filter((f) => f.url !== undefined || f.format_id !== undefined);
  const videoByQuality = new Map<QualityLabel, YtDlpFormat>();
  const audioByQuality = new Map<QualityLabel, YtDlpFormat>();

  for (const f of valid) {
    const q = quality(f.height ?? 0);
    const video = !!f.vcodec && f.vcodec !== "none";
    const audio = !!f.acodec && f.acodec !== "none";

    if (video && q) {
      const current = videoByQuality.get(q);

      const score = (x: YtDlpFormat) =>
        (x.ext === "mp4" ? 1_000_000_000 : 0) +
        (x.acodec && x.acodec !== "none" ? 100_000_000 : 0) +
        (sizeBytes(x) ?? 0) +
        (x.height ?? 0);

      if (!current || score(f) > score(current)) {
        videoByQuality.set(q, f);
      }
    }

    if (audio && !video) {
      const current = audioByQuality.get("144p");

      if (!current || (sizeBytes(f) ?? 0) > (sizeBytes(current) ?? 0)) {
        audioByQuality.set("144p", f);
      }
    }
  }

  const formats: ServerFormat[] = [];

  for (const q of QUALITY_ORDER) {
    const f = videoByQuality.get(q);
    if (!f) continue;

    const ytSize = sizeBytes(f);
    const stats = await probeDirectMedia(f.url || "");

    const size = ytSize ?? (stats.size > 0 ? stats.size : null);
    const container = f.ext || "mp4";

    formats.push({
      kind: "video",
      quality: q,
      sizeMb: size
        ? Math.round((size / 1024 / 1024) * 10) / 10
        : 0,
      container,
      hasAudio: !!f.acodec && f.acodec !== "none",
    });

    formats.push({
      kind: "video+audio",
      quality: q,
      sizeMb: size
        ? Math.round((size / 1024 / 1024) * 10) / 10
        : 0,
      container: "mp4",
      hasAudio: true,
    });
  }

  if (audioByQuality.size) {
    const a = audioByQuality.get("144p")!;
    const ytSize = sizeBytes(a);
    const stats = await probeDirectMedia(a.url || "");

    const size = ytSize ?? (stats.size > 0 ? stats.size : null);

    formats.push({
      kind: "audio",
      quality: "144p",
      sizeMb: size
        ? Math.round((size / 1024 / 1024) * 10) / 10
        : 0,
      container: a.ext === "mp4" ? "m4a" : a.ext || "m4a",
      hasAudio: true,
    });
  }

  return formats;
}

export async function probeUrl(url: string): Promise<MediaInfo> {
  const result = await run(
    [
      ...commonArgs,
      "--skip-download",
      "--socket-timeout",
      "30",
      "-j",
      url,
    ],
    90_000,
  );
  if (result.code !== 0) throw friendlyError(result.stderr || result.stdout);

  let info: YtDlpInfo;
  try {
    info = JSON.parse(result.stdout) as YtDlpInfo;
  } catch {
    throw new Error("The media metadata could not be read. Please try another public URL.");
  }

  const source = /instagram/i.test(info.extractor || "") ? "instagram" : /facebook/i.test(info.extractor || "") ? "facebook" : /youtube/i.test(info.extractor || "") ? "youtube" : "other";
  const formats = await buildFormats(info.formats || []);
  if (!formats.length) throw new Error("No downloadable formats were returned for this public media.");

  return {
    id: info.id || crypto.randomUUID(),
    title: info.title || "Untitled media",
    creator: info.uploader || info.channel || (source === "youtube" ? "YouTube" : source === "facebook" ? "Facebook" : "Instagram"),
    durationSeconds: await (async () => {
      const top = Number(info.duration);
      if (top > 0) return Math.round(top);

      const formatDuration = Math.max(
        0,
        ...(info.formats || [])
          .map((f) => Number(f.duration) || 0)
          .filter((d) => d > 0)
      );

      if (formatDuration > 0) return Math.round(formatDuration);

      const video = (info.formats || [])
        .filter(
          (f) =>
            f.url &&
            f.vcodec &&
            f.vcodec !== "none" &&
            (f.height ?? 0) > 0
        )
        .sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0];

      if (video?.url) {
        const stats = await probeDirectMedia(video.url);
        if (stats.duration > 0) return Math.round(stats.duration);
      }

      return 0;
    })(),
    source,
    thumbnail: info.thumbnail || "",
    authorized: true,
    formats,
  };
}

export function selector(qualityLabel: QualityLabel, kind: FormatKind) {
  const height = Number(qualityLabel.replace("p", ""));
  if (kind === "audio") return "ba[ext=m4a]/ba/bestaudio";
  // Video-only must never fall back to a combined format, otherwise audio can
  // sneak into a "Video only" download.
  if (kind === "video") return `bv*[height<=${height}][ext=mp4]/bv*[height<=${height}]`;
  return `bv*[height<=${height}][ext=mp4]+ba[ext=m4a]/bv*[height<=${height}]+ba/b[height<=${height}]`;
}

export async function downloadToTemp(opts: {
  url: string;
  quality: QualityLabel;
  kind: FormatKind;
  onProgress?: (progress: number) => void;
}) {
  const dir = await mkdtemp(join(tmpdir(), "mediaflow-"));
  const template = join(dir, "media.%(ext)s");
  const args = [
    ...commonArgs,
    "--continue",
    "--retries",
    "10",
    "--fragment-retries",
    "10",
    "--socket-timeout",
    "30",
    "--check-formats",
    "--newline",
    "--progress-template",
    "download:%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s",
    "-f",
    selector(opts.quality, opts.kind),
    "-o",
    template,
  ];
  if (opts.kind === "video+audio") args.push("--merge-output-format", "mp4");
  args.push(opts.url);

  const result = await run(args, 3_600_000, (line) => {
    const match = line.match(/download:\s*([0-9.]+)%/);
    if (match) opts.onProgress?.(Math.max(0, Math.min(99, Number(match[1]))));
  });

  if (result.code !== 0) {
    await rm(dir, { recursive: true, force: true });
    throw friendlyError(result.stderr || result.stdout);
  }

  const files = (await readdir(dir)).filter((name) => !name.endsWith(".part") && !name.endsWith(".ytdl"));
  const name = files.find((x) => /\.(mp4|webm|m4a|mp3|mov|mkv)$/i.test(x)) || files[0];
  if (!name) {
    await rm(dir, { recursive: true, force: true });
    throw new Error("yt-dlp completed but no media file was produced.");
  }
  const filePath = join(dir, name);
  const info = await stat(filePath);
  if (info.size < 1024) {
    await rm(dir, { recursive: true, force: true });
    throw new Error("The downloaded file is unexpectedly small. The source may have blocked the transfer.");
  }
  opts.onProgress?.(100);
  const ext = name.split(".").pop()?.toLowerCase() || "mp4";
  const mime = ext === "m4a" ? "audio/mp4" : ext === "webm" ? "video/webm" : ext === "mp3" ? "audio/mpeg" : "video/mp4";
  return { dir, filePath, filename: name, ext, mime, sizeBytes: info.size };
}

function friendlyError(text: string) {
  if (/ffmpeg.*not found|ffprobe.*not found/i.test(text)) return new Error("FFmpeg is required for video+audio downloads. Install ffmpeg and try again.");
  if (/sign in|not a bot|bot detection/i.test(text)) return new Error("YouTube is asking this network to sign in. Try another public video or update yt-dlp.");
  if (/403|forbidden/i.test(text)) return new Error("YouTube rejected the selected media stream (HTTP 403). The downloader now retries with yt-dlp EJS support and checks formats before transfer; if it still fails, the selected stream is not currently usable from this network.");
  if (/private|login required|members-only/i.test(text)) return new Error("This media is private or restricted. Only public, user-authorized media is supported.");
  if (/429|too many requests/i.test(text)) return new Error("The source is rate-limiting requests. Wait a little and try again.");
  return new Error("Could not process this media. Make sure it is public and your yt-dlp installation is up to date.");
}
