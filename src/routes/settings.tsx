import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";

import { TopNav } from "@/components/TopNav";
import { Switch } from "@/components/ui/switch";
import { KIND_LABEL, type FormatKind, type QualityLabel } from "@/lib/media-api";

const QUALITIES: QualityLabel[] = [
  "360p",
  "480p",
  "720p HD",
  "1080p Full HD",
];

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — MediaFlow" },
      {
        name: "description",
        content:
          "Set your default MediaFlow format, preferred quality and notification preferences for authorized downloads.",
      },
      { property: "og:title", content: "Settings — MediaFlow" },
      {
        property: "og:description",
        content: "Default format, preferred quality and notification preferences.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [kind, setKind] = useState<FormatKind>("video+audio");
  const [quality, setQuality] = useState<QualityLabel>("720p HD");
  const [notify, setNotify] = useState(true);
  const [autoAnalyze, setAutoAnalyze] = useState(false);

  return (
    <div className="app-bg min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Defaults applied to every new job.</p>

        <section className="glass mt-8 space-y-6 rounded-3xl p-6">
          <div>
            <h2 className="text-sm font-semibold">Default format</h2>
            <div
              role="radiogroup"
              aria-label="Default format"
              className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-secondary/60 p-1"
            >
              {(Object.keys(KIND_LABEL) as FormatKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  onClick={() => setKind(k)}
                  className={`rounded-xl px-3 py-2.5 text-xs font-medium transition-all sm:text-sm ${
                    kind === k
                      ? "bg-brand-gradient text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {KIND_LABEL[k]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold">Preferred quality</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {QUALITIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  aria-pressed={quality === q}
                  onClick={() => setQuality(q)}
                  className={`rounded-xl border px-4 py-2 text-sm transition-colors ${
                    quality === q
                      ? "border-primary/60 bg-primary/15 text-foreground"
                      : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between gap-4 border-t border-border pt-5">
            <span>
              <span className="block text-sm font-medium">Notify when a download finishes</span>
              <span className="block text-xs text-muted-foreground">
                Show a toast the moment a file is ready.
              </span>
            </span>
            <Switch checked={notify} onCheckedChange={setNotify} />
          </label>

          <label className="flex items-center justify-between gap-4 border-t border-border pt-5">
            <span>
              <span className="block text-sm font-medium">Analyze on paste</span>
              <span className="block text-xs text-muted-foreground">
                Start analyzing as soon as a supported URL is pasted.
              </span>
            </span>
            <Switch checked={autoAnalyze} onCheckedChange={setAutoAnalyze} />
          </label>
        </section>

        <section className="glass mt-6 flex gap-4 rounded-3xl p-6">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
          <p className="text-sm text-muted-foreground">
            MediaFlow only processes public media you're authorized to download. We never bypass
            DRM, private accounts, logins, paywalls or platform restrictions.
          </p>
        </section>
      </main>
    </div>
  );
}
