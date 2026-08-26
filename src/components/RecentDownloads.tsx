import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { SourceBadge } from "@/components/SourceBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { KIND_LABEL, formatSize, getDownloadHistory } from "@/lib/media-api";

export function RecentDownloads({ limit }: { limit?: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["download-history"],
    queryFn: getDownloadHistory,
  });

  const items = limit ? data?.slice(0, limit) : data;

  return (
    <div className="space-y-3">
      {isLoading &&
        Array.from({ length: limit ?? 3 }).map((_, i) => (
          <div key={i} className="glass flex items-center gap-4 rounded-2xl p-3">
            <Skeleton className="h-16 w-28 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}

      {items?.map((item) => (
        <article
          key={item.id}
          className="glass glass-hover flex flex-col gap-4 rounded-2xl p-3 sm:flex-row sm:items-center"
        >
          <img
            src={item.thumbnail}
            alt=""
            loading="lazy"
            width={1280}
            height={720}
            className="h-28 w-full rounded-xl object-cover sm:h-16 sm:w-28"
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium">{item.title}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <SourceBadge source={item.source} />
              <span className="rounded-full bg-secondary px-2 py-1">{KIND_LABEL[item.kind]}</span>
              <span className="rounded-full bg-secondary px-2 py-1">{item.quality}</span>
              <span>{formatSize(item.sizeMb)}</span>
              <span aria-hidden>·</span>
              <span>{item.date}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (item.url) {
                window.location.href = `/?url=${encodeURIComponent(item.url)}`;
              } else {
                toast.success("Queued again", { description: item.title });
              }
            }}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary/50 hover:bg-primary/15 hover:text-foreground"
          >
            <Download className="size-4" aria-hidden /> Download again
          </button>
        </article>
      ))}
    </div>
  );
}
