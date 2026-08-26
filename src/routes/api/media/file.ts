import { createFileRoute } from "@tanstack/react-router";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

export const Route = createFileRoute("/api/media/file")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const jobId = new URL(request.url).searchParams.get("jobId") || "";
        const { takeCompletedJob, cleanupJob } = await import("@/lib/media-server/jobs");
        const job = takeCompletedJob(jobId);
        if (!job || job.status !== "completed" || !job.filePath) {
          return Response.json({ error: "The download is not ready." }, { status: 404 });
        }

        const nodeStream = createReadStream(job.filePath);
        nodeStream.on("close", () => void cleanupJob(jobId));
        const body = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;
        const headers = new Headers();
        headers.set("Content-Type", job.mime || "application/octet-stream");
        headers.set("Content-Length", String(job.sizeBytes || 0));
        headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(job.filename || "media")}`);
        headers.set("Cache-Control", "no-store");
        return new Response(body, { status: 200, headers });
      },
    },
  },
});
