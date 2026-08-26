import type { Platform } from "./types";

const YT_HOSTS = new Set([
  "youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com",
  "youtu.be", "www.youtu.be", "youtube-nocookie.com", "www.youtube-nocookie.com",
]);
const IG_HOSTS = new Set(["instagram.com", "www.instagram.com", "m.instagram.com", "instagr.am", "www.instagr.am"]);
const FB_HOSTS = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "mbasic.facebook.com", "fb.watch"]);

function toUrl(raw: string): URL | null {
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw.trim() : `https://${raw.trim()}`);
  } catch { return null; }
}

export type ParsedMediaUrl =
  | { platform: "youtube"; id: string; url: string }
  | { platform: "instagram"; id: string; url: string }
  | { platform: "facebook"; id: string; url: string };

function youtubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  }
  const v = url.searchParams.get("v");
  if (v && /^[\w-]{11}$/.test(v)) return v;
  const parts = url.pathname.split("/").filter(Boolean);
  if (["shorts", "embed", "live", "v"].includes(parts[0] ?? "")) {
    const id = parts[1];
    if (id && /^[\w-]{11}$/.test(id)) return id;
  }
  return null;
}

export function parseMediaUrl(raw: string): ParsedMediaUrl | null {
  const url = toUrl(raw);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  if (YT_HOSTS.has(host)) {
    const id = youtubeId(url);
    return id ? { platform: "youtube", id, url: `https://www.youtube.com/watch?v=${id}` } : null;
  }
  if (IG_HOSTS.has(host)) {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    if (!["p", "reel", "reels", "tv"].includes(parts[0] ?? "")) return null;
    const id = parts[1];
    if (!id || id.length < 5) return null;
    const kind = parts[0] === "reels" ? "reel" : parts[0];
    return { platform: "instagram", id, url: `https://www.instagram.com/${kind}/${id}/` };
  }
  if (FB_HOSTS.has(host)) {
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts.at(-1) || "facebook";
    return { platform: "facebook", id, url: url.toString() };
  }
  return null;
}

export function detectPlatform(raw: string): Platform | null {
  return parseMediaUrl(raw)?.platform ?? null;
}
