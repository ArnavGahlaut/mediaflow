import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/media/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { url?: string };
          const url = String(body.url || "").trim();
          if (!url || url.length > 2000) return Response.json({ error: "Invalid URL." }, { status: 400 });
          const { probeUrl } = await import("@/lib/media-server/ytdlp");
          return Response.json(await probeUrl(url));
        } catch (error) {
          return Response.json({ error: error instanceof Error ? error.message : "Could not analyze this URL." }, { status: 400 });
        }
      },
    },
  },
});
