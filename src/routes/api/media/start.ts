import { createFileRoute } from "@tanstack/react-router";
import { QUALITY_ORDER, type FormatKind, type QualityLabel } from "@/lib/media-server/types";
import { corsJson, corsOptions } from "@/lib/cors.server";
export const Route = createFileRoute("/api/media/start")({
  server: {
    handlers: {
      OPTIONS: corsOptions,
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { url?: string; quality?: string; kind?: string; title?: string };
          const url = String(body.url || "").trim();
          const quality = body.quality as QualityLabel;
          const kind = body.kind as FormatKind;
          if (!url || !QUALITY_ORDER.includes(quality) || !["video", "audio", "video+audio"].includes(kind)) {
            return corsJson({ error: "Invalid download options." }, { status: 400 });
          }
          const { createDownloadJob } = await import("@/lib/media-server/jobs");
          return corsJson(createDownloadJob({ url, quality, kind, ...(body.title !== undefined ? { title: body.title } : {}) }));
        } catch (error) {
          return corsJson({ error: error instanceof Error ? error.message : "Could not start the download." }, { status: 400 });
        }
      },
    },
  },
});
