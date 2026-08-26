export const QUALITY_ORDER = ["144p", "240p", "360p", "480p", "720p", "1080p"] as const;
export type QualityLabel = (typeof QUALITY_ORDER)[number];
export type Platform = "youtube" | "instagram" | "facebook";

export type RawFormat = {
  format_id?: string;
  format_note?: string;
  ext?: string;
  width?: number | null;
  height?: number | null;
  vcodec?: string | null;
  acodec?: string | null;
  filesize?: number | null;
  filesize_approx?: number | null;
  url?: string;
  protocol?: string;
};

export type YtDlpInfo = {
  id?: string;
  title?: string;
  uploader?: string;
  channel?: string;
  thumbnail?: string;
  duration?: number;
  webpage_url?: string;
  formats?: RawFormat[];
  url?: string;
  ext?: string;
};
