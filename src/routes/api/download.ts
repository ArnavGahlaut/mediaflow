import { createFileRoute } from "@tanstack/react-router";
import { streamDownload } from "@/lib/media/download.server";
import { QUALITY_ORDER, type QualityLabel } from "@/lib/media/types";
import { CORS_HEADERS, corsJson, corsOptions } from "@/lib/cors.server";
export const Route = createFileRoute("/api/download")({
  server: {
    handlers: {
      OPTIONS: corsOptions,
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const source = url.searchParams.get("url")?.trim() || "";
        const quality = url.searchParams.get("quality") as QualityLabel;
        const kindRaw = url.searchParams.get("kind") || "video+audio";
        const filename = url.searchParams.get("filename") || undefined;
        if (!source) return corsJson({ error: "Missing url" }, { status: 400 });
        if (!QUALITY_ORDER.includes(quality)) return corsJson({ error: "Unsupported quality" }, { status: 400 });
        const kind = kindRaw === "audio" || kindRaw === "video" || kindRaw === "video+audio" ? kindRaw : "video+audio";
        try {
          const res = await streamDownload({ url: source, quality, kind, ...(filename !== undefined ? { filename } : {}) });
          const headers = new Headers(res.headers);
          for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
          return new Response(res.body, { status: res.status, headers });
        } catch (err) {
          return corsJson({ error: err instanceof Error ? err.message : "Download failed." }, { status: 502 });
        }
      },
    },
  },
});
