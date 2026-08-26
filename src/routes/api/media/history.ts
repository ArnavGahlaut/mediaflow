import { createFileRoute } from "@tanstack/react-router";
import { corsJson, corsOptions } from "@/lib/cors.server";
export const Route = createFileRoute("/api/media/history")({
  server: {
    handlers: {
      OPTIONS: corsOptions,
      GET: async () => corsJson([]),
    },
  },
});
