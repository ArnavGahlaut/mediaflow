import { createFileRoute } from "@tanstack/react-router";
import { corsJson, corsOptions } from "@/lib/cors.server";
export const Route = createFileRoute("/api/media/analyze")({
  server: {
    handlers: {
      OPTIONS: corsOptions,
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { url?: string };
          const url = String(body.url || "").trim();
          if (!url || url.length > 2000) return corsJson({ error: "Invalid URL." }, { status: 400 });
          const { probeUrl } = await import("@/lib/media-server/ytdlp");
          return corsJson(await probeUrl(url));
        } catch (error) {
          return corsJson({ error: error instanceof Error ? error.message : "Could not analyze this URL." }, { status: 400 });
        }
      },
    },
  },
});
