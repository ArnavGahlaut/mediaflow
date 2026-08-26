import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardPaste,
  Clock,
  Download,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { RecentDownloads } from "@/components/RecentDownloads";
import { SourceBadge } from "@/components/SourceBadge";
import { TopNav } from "@/components/TopNav";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ERROR_COPY,
  KIND_LABEL,
  MediaError,
  analyzeMedia,
  formatDuration,
  formatSize,
  getDownloadStatus,
  openDownload,
  recordDownload,
  startDownload,
  type FormatKind,
  type MediaErrorCode,
  type MediaInfo,
  type QualityLabel,
} from "@/lib/media-api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediaFlow — Download Authorized YouTube & Instagram Media" },
      {
        name: "description",
        content:
          "Paste an authorized YouTube or Instagram URL, preview the media, then pick your format and quality up to 1080p Full HD.",
      },
      { property: "og:title", content: "MediaFlow — Authorized Media Downloader" },
      {
        property: "og:description",
        content:
          "Analyze a public YouTube or Instagram link and choose your format and quality in a premium dark dashboard.",
      },
    ],
  }),
  component: Dashboard,
});

const KINDS: FormatKind[] = ["video", "audio", "video+audio"];
const ALL_QUALITIES: QualityLabel[] = [
  "144p",
  "240p",
  "360p",
  "480p",
  "720p HD",
  "1080p Full HD",
];

function Dashboard() {
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [media, setMedia] = useState<MediaInfo | null>(null);
  const [error, setError] = useState<MediaErrorCode | null>(null);
  const [kind, setKind] = useState<FormatKind>("video+audio");
  const [quality, setQuality] = useState<QualityLabel | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const jobRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  const kindFormats = useMemo(
    () => (media ? media.formats.filter((f) => f.kind === kind) : []),
    [media, kind],
  );

  const selected = useMemo(
    () => kindFormats.find((f) => f.quality === quality) ?? kindFormats[0],
    [kindFormats, quality],
  );

  useEffect(() => {
    if (kindFormats.length && !kindFormats.some((f) => f.quality === quality)) {
      setQuality(kindFormats[kindFormats.length - 1]!.quality);
    }
  }, [kindFormats, quality]);

  useEffect(() => {
    const fromHistory = new URLSearchParams(window.location.search).get("url");
    if (fromHistory && !url) {
      setUrl(fromHistory);
      void analyzeMedia(fromHistory).then((info) => {
        setMedia(info);
        setKind("video+audio");
        setQuality(null);
      }).catch(() => {
        // Keep the normal empty state if the historical URL is no longer available.
      });
    }
  }, []);

  async function handleAnalyze(e?: React.FormEvent) {
    e?.preventDefault();
    if (analyzing) return;
    setError(null);
    setMedia(null);
    setDone(false);
    setProgress(null);
    setAnalyzing(true);
    try {
      const info = await analyzeMedia(url);
      setMedia(info);
      setKind("video+audio");
      setQuality(null);
      toast.success("Media ready", { description: info.title });
    } catch (err) {
      const code = err instanceof MediaError ? err.code : "network";
      setError(code);
      toast.error(ERROR_COPY[code].title, { description: ERROR_COPY[code].body });
    } finally {
      setAnalyzing(false);
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) throw new Error("empty");
      setUrl(text);
      toast.success("Pasted from clipboard");
    } catch {
      toast.error("Clipboard unavailable", {
        description: "Paste the link manually with Ctrl/Cmd + V.",
      });
    }
  }

  async function handleDownload() {
    if (!media || !selected) return;
    setDone(false);
    setProgress(0);
    setError(null);
    try {
      const job = await startDownload(url, selected, media.title);
      jobRef.current = job.jobId;
      let current = 0;
      while (current < 100) {
        const status = await getDownloadStatus(job.jobId);
        if (status.status === "failed") throw new MediaError("download_unavailable", status.message || ERROR_COPY.download_unavailable.body);
        current = status.progress;
        setProgress(current);
        if (status.status !== "completed") await new Promise((resolve) => setTimeout(resolve, 900));
      }

      openDownload(job.jobId);
      recordDownload({
        id: job.jobId,
        title: media.title,
        thumbnail: media.thumbnail,
        source: media.source,
        kind: selected.kind,
        quality: selected.quality,
        sizeMb: selected.sizeMb,
        date: new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" }),
        url,
      });
      await queryClient.invalidateQueries({ queryKey: ["download-history"] });
      setDone(true);
      toast.success("Download complete", {
        description: `${KIND_LABEL[selected.kind]} · ${selected.quality}`,
      });
    } catch (err) {
      const code = err instanceof MediaError ? err.code : "network";
      setProgress(null);
      setError(code);
      toast.error(ERROR_COPY[code].title, { description: err instanceof Error ? err.message : ERROR_COPY[code].body });
    }
  }

  return (
    <div className="app-bg min-h-screen">
      <TopNav />

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        {/* Hero */}
        <section className="pt-14 pb-10 text-center sm:pt-20">
          <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-ig-orange" aria-hidden />
            YouTube, Instagram &amp; Facebook ready
          </span>
          <h1 className="mt-6 text-4xl font-semibold sm:text-6xl">
            Download your <span className="text-brand-gradient">media.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            Paste an authorized media URL and choose your preferred format and quality.
          </p>

          <form
            onSubmit={handleAnalyze}
            className="glass mx-auto mt-9 flex max-w-3xl flex-col gap-2.5 rounded-3xl p-2.5 sm:flex-row sm:items-center"
          >
            <div className="relative flex-1">
              <label htmlFor="media-url" className="sr-only">
                Media URL
              </label>
              <input
                id="media-url"
                type="text"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste YouTube, Instagram, or Facebook URL..."
                className="h-14 w-full rounded-2xl bg-secondary/50 pr-12 pl-5 text-sm outline-none transition-shadow placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-primary/60 sm:text-base"
              />
              <button
                type="button"
                onClick={handlePaste}
                aria-label="Paste from clipboard"
                className="absolute top-1/2 right-2.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ClipboardPaste className="size-4" aria-hidden />
              </button>
            </div>
            <button
              type="submit"
              disabled={analyzing || !url.trim()}
              className="bg-brand-gradient inline-flex h-14 items-center justify-center gap-2 rounded-2xl px-7 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
            >
              {analyzing ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Analyzing
                </>
              ) : (
                <>
                  Analyze URL <ArrowRight className="size-4" aria-hidden />
                </>
              )}
            </button>
          </form>
          <p className="mx-auto mt-4 flex max-w-xl items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-success" aria-hidden />
            Public, user-authorized media only — no DRM or restriction bypassing.
          </p>
        </section>

        {/* Skeleton */}
        {analyzing && <AnalyzeSkeleton />}

        {/* Error state */}
        {!analyzing && error && (
          <section
            role="alert"
            className="glass mx-auto flex max-w-2xl flex-col items-center rounded-3xl px-6 py-10 text-center"
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
              <AlertTriangle className="size-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-semibold">{ERROR_COPY[error].title}</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">{ERROR_COPY[error].body}</p>
            <button
              type="button"
              onClick={() => handleAnalyze()}
              className="mt-6 rounded-xl border border-border bg-secondary/60 px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary/50 hover:bg-primary/15"
            >
              Try again
            </button>
          </section>
        )}

        {/* Empty state */}
        {!analyzing && !media && !error && (
          <section className="glass mx-auto flex max-w-2xl flex-col items-center rounded-3xl px-6 py-14 text-center">
            <span className="bg-brand-gradient flex size-14 items-center justify-center rounded-2xl shadow-[var(--glow-brand)]">
              <ClipboardPaste className="size-6 text-primary-foreground" aria-hidden />
            </span>
            <h2 className="mt-5 text-lg font-semibold">Paste a URL above to get started.</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              We'll pull the title, creator, duration and every available format for you.
            </p>
          </section>
        )}

        {/* Media result */}
        {!analyzing && media && (
          <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
            <section className="glass overflow-hidden rounded-3xl">
              <div className="relative">
                <img
                  src={media.thumbnail}
                  alt={media.title}
                  width={1280}
                  height={720}
                  className="aspect-video w-full object-cover"
                />
                <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-lg bg-background/80 px-2 py-1 text-xs backdrop-blur-md">
                  <Clock className="size-3" aria-hidden />
                  {formatDuration(media.durationSeconds)}
                </span>
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <SourceBadge source={media.source} />
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs text-success">
                    <ShieldCheck className="size-3.5" aria-hidden /> Authorized
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-semibold sm:text-xl">{media.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{media.creator}</p>

                <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-5 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Duration</dt>
                    <dd className="mt-1 font-medium">{formatDuration(media.durationSeconds)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Formats</dt>
                    <dd className="mt-1 font-medium">{media.formats.length}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Est. size</dt>
                    <dd className="mt-1 font-medium">
                      {selected ? formatSize(selected.sizeMb) : "—"}
                    </dd>
                  </div>
                </dl>

                {/* Format selector */}
                <h3 className="mt-7 text-sm font-semibold">Format</h3>
                <div
                  role="radiogroup"
                  aria-label="Format"
                  className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-secondary/60 p-1"
                >
                  {KINDS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={kind === k}
                      onClick={() => {
                        setKind(k);
                        setProgress(null);
                        setDone(false);
                      }}
                      className={`rounded-xl px-2 py-2.5 text-xs font-medium transition-all sm:text-sm ${
                        kind === k
                          ? "bg-brand-gradient text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {KIND_LABEL[k]}
                    </button>
                  ))}
                </div>

                {/* Quality selector */}
                <h3 className="mt-6 text-sm font-semibold">Quality</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Only qualities available for this authorized source are selectable.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {kind === "audio" ? (
                    <button
                      type="button"
                      aria-pressed
                      className="rounded-xl border border-primary/60 bg-primary/15 px-4 py-2 text-sm"
                    >
                      Audio only
                    </button>
                  ) : (
                    ALL_QUALITIES.map((q) => {
                      const available = kindFormats.some((f) => f.quality === q);
                      const active = selected?.quality === q;
                      return (
                        <button
                          key={q}
                          type="button"
                          disabled={!available}
                          aria-pressed={active}
                          onClick={() => {
                            setQuality(q);
                            setProgress(null);
                            setDone(false);
                          }}
                          className={`rounded-xl border px-4 py-2 text-sm transition-all ${
                            active
                              ? "border-primary/60 bg-primary/15 text-foreground"
                              : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
                          } disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:text-muted-foreground`}
                        >
                          {q}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </section>

            {/* Download panel */}
            <section className="glass h-fit rounded-3xl p-5 sm:p-6 lg:sticky lg:top-24">
              <h2 className="text-sm font-semibold">Download</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <Row label="Format" value={selected ? KIND_LABEL[selected.kind] : "—"} />
                <Row label="Quality" value={selected?.quality ?? "—"} />
                <Row
                  label="Container"
                  value={selected ? `.${selected.container}` : "—"}
                />
                <Row
                  label="Estimated size"
                  value={selected ? formatSize(selected.sizeMb) : "—"}
                />
              </dl>

              {progress !== null && (
                <div className="mt-5">
                  <div
                    role="progressbar"
                    aria-valuenow={Math.round(progress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Download progress"
                    className="h-2 w-full overflow-hidden rounded-full bg-secondary"
                  >
                    <div
                      className="bg-brand-gradient h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {done ? "Finished" : `Downloading… ${Math.round(progress)}%`}
                  </p>
                </div>
              )}

              {done ? (
                <div className="mt-5 flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4">
                  <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
                  <div className="text-sm">
                    <p className="font-medium">Download completed</p>
                    <p className="text-xs text-muted-foreground">
                      Saved to your device · {selected ? formatSize(selected.sizeMb) : ""}
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!selected || (progress !== null && !done)}
                  className="bg-brand-gradient mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {progress !== null ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden /> Preparing file
                    </>
                  ) : (
                    <>
                      <Download className="size-4" aria-hidden /> Download
                    </>
                  )}
                </button>
              )}

              <p className="mt-4 text-xs text-muted-foreground">
                By downloading you confirm you have permission to use this media.
              </p>
            </section>
          </div>
        )}

        {/* Recent downloads */}
        <section className="mt-14">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="text-lg font-semibold sm:text-xl">Recent downloads</h2>
            <a
              href="/history"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
            </a>
          </div>
          <RecentDownloads limit={3} />
        </section>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-3 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function AnalyzeSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      <div className="glass overflow-hidden rounded-3xl">
        <Skeleton className="aspect-video w-full rounded-none" />
        <div className="space-y-3 p-6">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-4 h-12 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
      <div className="glass h-fit space-y-3 rounded-3xl p-6">
        <Skeleton className="h-4 w-20" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    </div>
  );
}
