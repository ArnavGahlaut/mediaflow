export type MediaSource = "youtube" | "instagram" | "facebook" | "other";

export type FormatKind = "video" | "audio" | "video+audio";

export type QualityLabel =
  | "144p"
  | "240p"
  | "360p"
  | "480p"
  | "720p HD"
  | "1080p Full HD";

export interface MediaFormat {
  kind: FormatKind;
  quality: QualityLabel;
  sizeMb: number;
  container: string;
  hasAudio?: boolean;
}

export interface MediaInfo {
  id: string;
  title: string;
  creator: string;
  durationSeconds: number;
  source: MediaSource;
  thumbnail: string;
  authorized: boolean;
  formats: MediaFormat[];
}

export interface DownloadJob {
  jobId: string;
  progress: number;
  status: "queued" | "downloading" | "completed" | "failed";
  message?: string;
  filename?: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  thumbnail: string;
  source: MediaSource;
  kind: FormatKind;
  quality: QualityLabel;
  sizeMb: number;
  date: string;
  url: string;
}

export type MediaErrorCode =
  | "invalid_url"
  | "unsupported_source"
  | "unavailable"
  | "download_unavailable"
  | "network";

export class MediaError extends Error {
  code: MediaErrorCode;

  constructor(code: MediaErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "MediaError";
  }
}

export const ERROR_COPY: Record<
  MediaErrorCode,
  { title: string; body: string }
> = {
  invalid_url: {
    title: "That doesn't look like a link",
    body:
      "Double-check the address you pasted — it should start with https:// and point to a public media page.",
  },
  unsupported_source: {
    title: "We don't support this source yet",
    body:
      "We couldn't process this URL. Check that it's a supported public URL and that you have permission to download the content.",
  },
  unavailable: {
    title: "This media isn't available",
    body:
      "The post may have been removed, private, or unavailable on this network. Only public media is supported.",
  },
  download_unavailable: {
    title: "Download isn't available",
    body:
      "The source did not provide a usable downloadable format. Try another available quality or another public video.",
  },
  network: {
    title: "Network hiccup",
    body:
      "We couldn't reach the media backend. Check your connection and make sure the local server is running.",
  },
};

const QUALITY_MAP: Record<string, QualityLabel> = {
  "144p": "144p",
  "240p": "240p",
  "360p": "360p",
  "480p": "480p",
  "720p": "720p HD",
  "1080p": "1080p Full HD",
};

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/$/, "");

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

function mapError(
  message: string,
  fallback: MediaErrorCode = "network",
) {
  const lower = message.toLowerCase();

  if (/invalid url|paste a|unsupported/i.test(lower)) {
    return new MediaError("invalid_url", message);
  }

  if (/private|restricted|unavailable|public media/i.test(lower)) {
    return new MediaError("unavailable", message);
  }

  if (/download|format|yt-dlp|ffmpeg|transfer/i.test(lower)) {
    return new MediaError("download_unavailable", message);
  }

  return new MediaError(fallback, message);
}

async function jsonFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(input, init);
  } catch {
    throw new MediaError(
      "network",
      ERROR_COPY.network.body,
    );
  }

  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };

  if (!response.ok) {
    throw mapError(
      data.error || "The media backend returned an error.",
    );
  }

  return data;
}

export function detectSource(url: string): MediaSource | null {
  const value = url.trim().toLowerCase();

  if (/youtube\.com|youtu\.be/.test(value)) {
    return "youtube";
  }

  if (value.includes("instagram.com")) {
    return "instagram";
  }

  if (/facebook\.com|fb\.watch/.test(value)) {
    return "facebook";
  }

  return null;
}

export async function analyzeMedia(
  url: string,
): Promise<MediaInfo> {
  if (!url.trim()) {
    throw new MediaError(
      "invalid_url",
      ERROR_COPY.invalid_url.body,
    );
  }

  const data = await jsonFetch<{
    id: string;
    title: string;
    creator: string;
    durationSeconds: number;
    source: MediaSource;
    thumbnail: string;
    authorized: boolean;
    formats: Array<{
      kind: FormatKind;
      quality: string;
      sizeMb: number;
      container: string;
      hasAudio?: boolean;
    }>;
  }>(apiUrl("/api/media/analyze"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      url: url.trim(),
    }),
  });

  return {
    ...data,
    formats: data.formats.map((format) => ({
      ...format,
      quality:
        QUALITY_MAP[format.quality] ||
        (format.quality as QualityLabel),
    })),
  };
}

export async function getAvailableFormats(
  _mediaId: string,
): Promise<MediaFormat[]> {
  return [];
}

export async function startDownload(
  url: string,
  format: MediaFormat,
  title?: string,
): Promise<DownloadJob> {
  return jsonFetch<DownloadJob>(
    apiUrl("/api/media/start"),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        url,
        quality: format.quality.startsWith("1080p")
          ? "1080p"
          : format.quality.replace(" HD", ""),
        kind: format.kind,
        title,
      }),
    },
  );
}

export async function getDownloadStatus(
  jobId: string,
): Promise<DownloadJob> {
  return jsonFetch<DownloadJob>(
    apiUrl(
      `/api/media/status?jobId=${encodeURIComponent(jobId)}`,
    ),
  );
}

export function openDownload(jobId: string) {
  const url = apiUrl(
    `/api/media/file?jobId=${encodeURIComponent(jobId)}`,
  );

  window.location.href = url;
}

const HISTORY_KEY = "mediaflow-history-v1";


export function recordDownload(item: HistoryItem) {
  if (typeof window === "undefined") return;

  const current = readHistory();

  const next = [
    item,
    ...current.filter((x) => x.id !== item.id),
  ].slice(0, 30);

  window.localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(next),
  );
}

export async function getDownloadHistory(): Promise<
  HistoryItem[]
> {
  return readHistory();
}

function readHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];

  try {
    const value = JSON.parse(
      window.localStorage.getItem(HISTORY_KEY) || "[]",
    ) as HistoryItem[];

    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "—";
  }

  const total = Math.floor(seconds);
  const s = total % 60;
  const m = Math.floor(total / 60);

  if (m >= 60) {
    return `${Math.floor(m / 60)}:${String(m % 60).padStart(
      2,
      "0",
    )}:${String(s).padStart(2, "0")}`;
  }

  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatSize(sizeMb: number): string {
  if (!Number.isFinite(sizeMb) || sizeMb <= 0) {
    return "Calculating…";
  }

  if (sizeMb >= 1024) {
    return `${(sizeMb / 1024).toFixed(1)} GB`;
  }

  return `${sizeMb.toFixed(sizeMb < 10 ? 1 : 0)} MB`;
}

export const KIND_LABEL: Record<FormatKind, string> = {
  video: "Video only",
  audio: "Audio only",
  "video+audio": "Video + audio",
};
