import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Inbox } from "lucide-react";

import { RecentDownloads } from "@/components/RecentDownloads";
import { TopNav } from "@/components/TopNav";

export const Route = createFileRoute("/downloads")({
  head: () => ({
    meta: [
      { title: "Active Downloads — MediaFlow" },
      {
        name: "description",
        content:
          "Track your active MediaFlow download jobs and pick up finished files in video, audio or combined formats.",
      },
      { property: "og:title", content: "Active Downloads — MediaFlow" },
      {
        property: "og:description",
        content: "Track active download jobs and grab finished files.",
      },
    ],
  }),
  component: DownloadsPage,
});

function DownloadsPage() {
  return (
    <div className="app-bg min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold">Downloads</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Active jobs appear here while they process.
        </p>

        <section className="glass mt-8 flex flex-col items-center rounded-3xl px-6 py-14 text-center">
          <span className="bg-brand-gradient flex size-14 items-center justify-center rounded-2xl">
            <Inbox className="size-6 text-primary-foreground" aria-hidden />
          </span>
          <h2 className="mt-5 text-lg font-semibold">No active downloads</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Start one from the dashboard and you'll see live progress right here.
          </p>
          <Link
            to="/"
            className="bg-brand-gradient mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            Analyze a URL
          </Link>
        </section>

        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CheckCircle2 className="size-4 text-success" aria-hidden /> Completed
          </h2>
          <div className="mt-4">
            <RecentDownloads />
          </div>
        </section>
      </main>
    </div>
  );
}
