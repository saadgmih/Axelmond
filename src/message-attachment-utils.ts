import { isAllowedRasterImageMime } from "./avatar-security";
import type { MessageAttachment } from "./types/messaging";

export type MessageAttachmentKind = MessageAttachment["kind"];

export function normalizeMessageMimeType(mimeType: string): string {
  return String(mimeType || "")
    .toLowerCase()
    .split(";")[0]
    .trim();
}

export function detectMessageAttachmentKind(
  mimeType: string | null | undefined,
  fileName = "",
): MessageAttachmentKind | null {
  const mime = normalizeMessageMimeType(mimeType || "");
  if (isAllowedRasterImageMime(mime)) return "IMAGE";
  if (mime.startsWith("video/")) return "VIDEO";
  if (mime.startsWith("audio/")) return "AUDIO";
  if (
    mime === "application/pdf" ||
    mime === "application/msword" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "DOCUMENT";
  }

  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "IMAGE";
  if (fileName.includes("message-vocal") || ["mp3", "wav", "ogg", "m4a", "weba"].includes(ext)) return "AUDIO";
  if (ext === "webm" && fileName.includes("message-vocal")) return "AUDIO";
  if (["mp4", "mov", "webm"].includes(ext)) return "VIDEO";
  if (ext === "pdf" || ext === "doc" || ext === "docx") return "DOCUMENT";
  return null;
}
