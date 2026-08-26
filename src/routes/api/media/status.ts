import { createFileRoute } from "@tanstack/react-router";
import { corsJson, corsOptions } from "@/lib/cors.server";
export const Route = createFileRoute("/api/media/status")({
  server: {
    handlers: {
      OPTIONS: corsOptions,
      GET: async ({ request }) => {
        const jobId = new URL(request.url).searchParams.get("jobId") || "";
        const { getJob } = await import("@/lib/media-server/jobs");
        const job = getJob(jobId);
        return job ? corsJson(job) : corsJson({ error: "Download job not found." }, { status: 404 });
      },
    },
  },
});
