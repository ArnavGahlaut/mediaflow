import { contentDisposition, sanitizeFilename } from "./filename";
import { downloadWithYtDlp } from "./ytdlp.server";
import type { QualityLabel } from "./types";

export async function streamDownload(opts: { url: string; quality: QualityLabel; kind: "video" | "audio" | "video+audio"; filename?: string }) {
  const result = await downloadWithYtDlp({ url: opts.url, quality: opts.quality, kind: opts.kind });
  const filename = sanitizeFilename(opts.filename || "media", result.ext);
  const headers = new Headers();
  headers.set("Content-Type", result.mime);
  headers.set("Content-Disposition", contentDisposition(filename));
  headers.set("Content-Length", String(result.size));
  headers.set("Cache-Control", "no-store");
  const { fileStreamResponse } = await import("./ytdlp.server");
  return fileStreamResponse(result.filePath, headers, result.cleanup);
}
