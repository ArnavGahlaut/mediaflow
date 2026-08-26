import { createFileRoute } from "@tanstack/react-router";

import { RecentDownloads } from "@/components/RecentDownloads";
import { TopNav } from "@/components/TopNav";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Download History — MediaFlow" },
      {
        name: "description",
        content:
          "Review every authorized YouTube, Instagram, and Facebook download you've made, with format, quality and file size.",
      },
      { property: "og:title", content: "Download History — MediaFlow" },
      {
        property: "og:description",
        content: "Every authorized media download, with format, quality and file size.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  return (
    <div className="app-bg min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold">History</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Everything you've downloaded with MediaFlow.
        </p>
        <div className="mt-8">
          <RecentDownloads />
        </div>
      </main>
    </div>
  );
}
