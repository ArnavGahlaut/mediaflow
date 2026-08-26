export const QUALITY_ORDER = ["144p", "240p", "360p", "480p", "720p", "1080p"] as const;
export type QualityLabel = (typeof QUALITY_ORDER)[number];
export type FormatKind = "video" | "audio" | "video+audio";

export type ServerFormat = {
  kind: FormatKind;
  quality: QualityLabel;
  sizeMb: number;
  container: string;
  hasAudio: boolean;
};

export type MediaInfo = {
  id: string;
  title: string;
  creator: string;
  durationSeconds: number;
  source: "youtube" | "instagram" | "facebook" | "other";
  thumbnail: string;
  authorized: boolean;
  formats: ServerFormat[];
};

export type Job = {
  jobId: string;
  status: "queued" | "downloading" | "completed" | "failed";
  progress: number;
  message?: string;
  filePath?: string;
  filename?: string;
  mime?: string;
  sizeBytes?: number;
  cleanupAt?: number;
};
