import { createFileRoute } from "@tanstack/react-router";
import { analyzeUrl } from "@/lib/media/probe.server";

export const Route = createFileRoute("/api/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { url?: unknown };
          if (typeof body.url !== "string" || body.url.trim().length < 4) return Response.json({ error: "Missing URL" }, { status: 400 });
          return Response.json(await analyzeUrl(body.url));
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "Could not analyze media." }, { status: 400 });
        }
      },
    },
  },
});
