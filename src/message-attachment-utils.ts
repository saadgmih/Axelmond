import { isAllowedRasterImageMime } from "./avatar-security";
import type { MessageAttachment } from "./types/messaging";

export type MessageAttachmentKind = MessageAttachment["kind"];

const GENERIC_MIME_TYPES = new Set(["application/octet-stream", "binary/octet-stream", ""]);

export const MESSAGE_AUDIO_EXTENSIONS = [
  "3gp",
  "3gpp",
  "aac",
  "caf",
  "flac",
  "m4a",
  "mp3",
  "mp4a",
  "oga",
  "ogg",
  "opus",
  "wav",
  "weba",
] as const;

export const MESSAGE_AUDIO_MIME_TYPES = [
  "audio/3gpp",
  "audio/aac",
  "audio/flac",
  "audio/m4a",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/ogg",
  "audio/opus",
  "audio/wav",
  "audio/webm",
  "audio/x-aac",
  "audio/x-caf",
  "audio/x-flac",
  "audio/x-m4a",
  "audio/x-wav",
  "video/webm",
] as const;

export const MESSAGE_VIDEO_MIME_TYPES = ["video/mp4", "video/webm"] as const;

export const MESSAGE_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const MESSAGE_MIME_BY_EXTENSION: Record<string, string> = {
  "3gp": "audio/3gpp",
  "3gpp": "audio/3gpp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
  aac: "audio/aac",
  caf: "audio/x-caf",
  flac: "audio/flac",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  mp4a: "audio/mp4",
  oga: "audio/ogg",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  wav: "audio/wav",
  weba: "audio/webm",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export const MESSAGE_ATTACHMENT_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/webp",
  ...MESSAGE_VIDEO_MIME_TYPES,
  ...MESSAGE_AUDIO_MIME_TYPES.filter((mime) => mime !== "video/webm"),
  ...MESSAGE_AUDIO_EXTENSIONS.map((extension) => `.${extension}`),
  ...MESSAGE_DOCUMENT_MIME_TYPES,
  ".doc",
  ".docx",
].join(",");

function getMessageFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

export function normalizeMessageMimeType(mimeType: string): string {
  return String(mimeType || "")
    .toLowerCase()
    .split(";")[0]
    .trim();
}

export function inferMessageMimeType(fileName = ""): string {
  return MESSAGE_MIME_BY_EXTENSION[getMessageFileExtension(fileName)] || "";
}

export function normalizeMessageAttachmentMimeType(mimeType: string | null | undefined, fileName = ""): string {
  const normalized = normalizeMessageMimeType(mimeType || "");
  const inferred = inferMessageMimeType(fileName);
  const ext = getMessageFileExtension(fileName);

  if (!normalized || GENERIC_MIME_TYPES.has(normalized)) return inferred || normalized;

  if (
    inferred &&
    MESSAGE_AUDIO_EXTENSIONS.includes(ext as (typeof MESSAGE_AUDIO_EXTENSIONS)[number]) &&
    (normalized === "application/ogg" || normalized === "video/mp4" || normalized === "video/webm")
  ) {
    return inferred;
  }

  return normalized;
}

export function detectMessageAttachmentKind(
  mimeType: string | null | undefined,
  fileName = "",
): MessageAttachmentKind | null {
  if (fileName.includes("message-vocal")) return "AUDIO";

  const ext = getMessageFileExtension(fileName);
  if (MESSAGE_AUDIO_EXTENSIONS.includes(ext as (typeof MESSAGE_AUDIO_EXTENSIONS)[number])) return "AUDIO";

  const mime = normalizeMessageAttachmentMimeType(mimeType || "", fileName);
  if (isAllowedRasterImageMime(mime)) return "IMAGE";
  if (mime.startsWith("video/")) return "VIDEO";
  if (mime.startsWith("audio/")) return "AUDIO";
  if (MESSAGE_DOCUMENT_MIME_TYPES.includes(mime as (typeof MESSAGE_DOCUMENT_MIME_TYPES)[number])) {
    return "DOCUMENT";
  }

  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "IMAGE";
  if (["mp4", "mov", "webm"].includes(ext)) return "VIDEO";
  if (ext === "pdf" || ext === "doc" || ext === "docx") return "DOCUMENT";
  return null;
}
