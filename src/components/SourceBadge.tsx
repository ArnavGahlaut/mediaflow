import { Globe, Instagram, Youtube } from "lucide-react";
import type { MediaSource } from "@/lib/media-api";

export function SourceBadge({ source }: { source: MediaSource }) {
  if (source === "instagram") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-ig-pink/40 bg-ig-pink/12 px-2.5 py-1 text-xs font-medium text-ig-pink">
        <Instagram className="size-3.5" aria-hidden /> Instagram
      </span>
    );
  }
  if (source === "facebook") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <Globe className="size-3.5" aria-hidden /> Facebook
      </span>
    );
  }
  if (source === "youtube") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/12 px-2.5 py-1 text-xs font-medium text-primary">
        <Youtube className="size-3.5" aria-hidden /> YouTube
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <Globe className="size-3.5" aria-hidden /> Public source
    </span>
  );
}
