import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/media/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const jobId = new URL(request.url).searchParams.get("jobId") || "";
        const { getJob } = await import("@/lib/media-server/jobs");
        const job = getJob(jobId);
        return job ? Response.json(job) : Response.json({ error: "Download job not found." }, { status: 404 });
      },
    },
  },
});
