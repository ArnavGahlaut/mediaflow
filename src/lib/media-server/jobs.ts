import { rm } from "node:fs/promises";
import { downloadToTemp } from "./ytdlp";
import type { FormatKind, Job, QualityLabel } from "./types";

type InternalJob = Job & { dir?: string };
const jobs = new Map<string, InternalJob>();

export function createDownloadJob(opts: { url: string; quality: QualityLabel; kind: FormatKind; title?: string }) {
  const jobId = crypto.randomUUID();
  jobs.set(jobId, { jobId, status: "queued", progress: 0 });

  void (async () => {
    const job = jobs.get(jobId)!;
    job.status = "downloading";
    try {
      const result = await downloadToTemp({
        url: opts.url,
        quality: opts.quality,
        kind: opts.kind,
        onProgress: (progress) => {
          const current = jobs.get(jobId);
          if (current) current.progress = progress;
        },
      });
      job.status = "completed";
      job.progress = 100;
      job.filePath = result.filePath;
      job.filename = makeFilename(opts.title || "media", result.ext);
      job.mime = result.mime;
      job.sizeBytes = result.sizeBytes;
      job.dir = result.dir;
      job.cleanupAt = Date.now() + 30 * 60_000;
      setTimeout(() => void cleanupJob(jobId), 30 * 60_000).unref();
    } catch (error) {
      job.status = "failed";
      job.message = error instanceof Error ? error.message : "Download failed.";
    }
  })();

  return { jobId };
}

export function getJob(jobId: string): Job | null {
  const job = jobs.get(jobId);
  if (!job) return null;
  const { dir: _dir, ...publicJob } = job;
  return publicJob;
}

export function takeCompletedJob(jobId: string) {
  return jobs.get(jobId) ?? null;
}

export async function cleanupJob(jobId: string) {
  const job = jobs.get(jobId);
  if (!job) return;
  jobs.delete(jobId);
  if (job.dir) await rm(job.dir, { recursive: true, force: true });
}

function makeFilename(title: string, ext: string) {
  const safe = title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) || "media";
  return `${safe}.${ext}`;
}
