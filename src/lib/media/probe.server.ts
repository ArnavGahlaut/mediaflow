import { parseMediaUrl } from "./parse-url";
import { buildFormats, probeWithYtDlp, selectAudio } from "./ytdlp.server";
import type { QualityLabel, Platform } from "./types";

export type BackendFormat = {
  kind: "video" | "audio" | "video+audio";
  quality: QualityLabel | "Audio only";
  sizeMb: number | null;
  container: string;
};

export type BackendMedia = {
  id: string;
  title: string;
  creator: string;
  durationSeconds: number;
  source: Platform;
  thumbnail: string;
  authorized: true;
  sourceUrl: string;
  formats: BackendFormat[];
};

export async function analyzeUrl(raw: string): Promise<BackendMedia> {
  const parsed = parseMediaUrl(raw);
  if (!parsed) throw new Error("Paste a valid public YouTube, Instagram, or Facebook URL.");
  const info = await probeWithYtDlp(parsed.url, parsed.platform);
  const rawFormats = info.formats ?? [];
  const mapped = buildFormats(rawFormats);
  const audio = selectAudio(rawFormats);
  const formats: BackendFormat[] = [];
  for (const { q, f } of mapped) {
    const videoSize = f.filesize ?? f.filesize_approx ?? null;
    const audioSize = audio?.filesize ?? audio?.filesize_approx ?? null;
    const videoMb = videoSize ? videoSize / 1024 / 1024 : null;
    const audioMb = audioSize ? audioSize / 1024 / 1024 : null;
    formats.push({ kind: "video", quality: q, sizeMb: videoMb, container: f.ext || "mp4" });
    if (audio) formats.push({ kind: "video+audio", quality: q, sizeMb: videoMb !== null && audioMb !== null ? videoMb + audioMb : videoMb, container: "mp4" });
  }
  if (audio) formats.push({ kind: "audio", quality: "Audio only", sizeMb: (audio.filesize ?? audio.filesize_approx ?? 0) / 1024 / 1024 || null, container: audio.ext === "webm" ? "webm" : "m4a" });
  if (!formats.length) throw new Error("No downloadable formats were found for this public media.");
  const thumbnail = info.thumbnail || (parsed.platform === "youtube" ? `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg` : "");
  return {
    id: info.id || parsed.id,
    title: info.title || "Untitled media",
    creator: info.uploader || info.channel || (parsed.platform === "youtube" ? "YouTube" : parsed.platform === "facebook" ? "Facebook" : "Instagram"),
    durationSeconds: typeof info.duration === "number" ? Math.round(info.duration) : 0,
    source: parsed.platform,
    thumbnail,
    authorized: true,
    sourceUrl: parsed.url,
    formats,
  };
}
