import { createFileRoute } from "@tanstack/react-router";
import { analyzeUrl } from "@/lib/media/probe.server";
import { corsJson, corsOptions } from "@/lib/cors.server";
export const Route = createFileRoute("/api/analyze")({
  server: {
    handlers: {
      OPTIONS: corsOptions,
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { url?: unknown };
          if (typeof body.url !== "string" || body.url.trim().length < 4) return corsJson({ error: "Missing URL" }, { status: 400 });
          return corsJson(await analyzeUrl(body.url));
        } catch (err) {
          return corsJson({ error: err instanceof Error ? err.message : "Could not analyze media." }, { status: 400 });
        }
      },
    },
  },
});
