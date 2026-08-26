const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN || "https://mediaflow-eight.vercel.app"\;

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function corsJson(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, {
    ...init,
    headers: { ...CORS_HEADERS, ...(init.headers as Record<string, string> | undefined) },
  });
}

export function corsOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
