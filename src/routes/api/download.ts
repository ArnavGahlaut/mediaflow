import { createFileRoute } from "@tanstack/react-router";
import { streamDownload } from "@/lib/media/download.server";
import { QUALITY_ORDER, type QualityLabel } from "@/lib/media/types";

export const Route = createFileRoute("/api/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const source = url.searchParams.get("url")?.trim() || "";
        const quality = url.searchParams.get("quality") as QualityLabel;
        const kindRaw = url.searchParams.get("kind") || "video+audio";
        const filename = url.searchParams.get("filename") || undefined;
        if (!source) return Response.json({ error: "Missing url" }, { status: 400 });
        if (!QUALITY_ORDER.includes(quality)) return Response.json({ error: "Unsupported quality" }, { status: 400 });
        const kind = kindRaw === "audio" || kindRaw === "video" || kindRaw === "video+audio" ? kindRaw : "video+audio";
        try {
          return await streamDownload({ url: source, quality, kind, ...(filename !== undefined ? { filename } : {}) });
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "Download failed." }, { status: 502 });
        }
      },
    },
  },
});
