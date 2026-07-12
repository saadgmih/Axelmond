import { getFreshSessionToken } from "./api";
import { normalizeMessageMimeType } from "./messaging";
import { bindUploadProgress, getUploadedFileUrl, getUploadErrorMessage, uploadFiles } from "./uploadthing-client";
import type { MessageAttachment } from "./types/messaging";

export type OutgoingMessageAttachment = Pick<
  MessageAttachment,
  "kind" | "fileName" | "mimeType" | "sizeBytes" | "url"
> & {
  storageKey: string;
};

const MESSAGE_MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "audio/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function normalizeMessageUploadFile(file: File): File {
  const normalizedType = normalizeMessageMimeType(file.type);
  if (normalizedType) {
    if (normalizedType === file.type) return file;
    return new File([file], file.name, { type: normalizedType, lastModified: file.lastModified });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const inferredType = file.name.includes("message-vocal") && ext === "webm" ? "audio/webm" : MESSAGE_MIME_BY_EXTENSION[ext];
  if (!inferredType) return file;

  return new File([file], file.name, { type: inferredType, lastModified: file.lastModified });
}

function getUploadEntryErrorMessage(entry: unknown): string {
  if (!entry || typeof entry !== "object") return "";
  const record = entry as Record<string, unknown>;
  const serverData = record.serverData;
  if (serverData && typeof serverData === "object") {
    const serverError = (serverData as Record<string, unknown>).error;
    if (typeof serverError === "string" && serverError.trim()) return serverError;
  }
  if (typeof record.error === "string" && record.error.trim()) return record.error;
  if (typeof record.message === "string" && record.message.trim()) return record.message;
  return "";
}

export async function uploadMessageAttachmentFile(
  file: File,
  conversationId: string,
  onUploadProgress?: (progress: number) => void,
): Promise<OutgoingMessageAttachment> {
  const token = await getFreshSessionToken();
  if (!token) {
    throw new Error("Session expirée. Reconnectez-vous.");
  }

  const normalizedFile = normalizeMessageUploadFile(file);

  const uploaded = await (uploadFiles as any)("messageAttachment", {
    files: [normalizedFile],
    input: { conversationId },
    headers: { Authorization: `Bearer ${token}` },
    onUploadProgress: onUploadProgress ? bindUploadProgress(onUploadProgress) : undefined,
  });

  const entry = uploaded[0];
  const meta = entry?.serverData;
  const storageKey = typeof meta?.storageKey === "string" ? meta.storageKey.trim() : "";
  const kind = meta?.kind;
  const url = getUploadedFileUrl(entry) || (typeof meta?.url === "string" ? meta.url : "");

  if (!url || !kind || !storageKey) {
    const entryError = getUploadEntryErrorMessage(entry);
    throw new Error(getUploadErrorMessage(entryError || entry));
  }

  return {
    kind: kind as OutgoingMessageAttachment["kind"],
    fileName: (typeof meta?.fileName === "string" && meta.fileName) || normalizedFile.name,
    mimeType:
      (typeof meta?.mimeType === "string" && normalizeMessageMimeType(meta.mimeType)) ||
      normalizeMessageMimeType(normalizedFile.type),
    sizeBytes: (typeof meta?.sizeBytes === "number" && meta.sizeBytes) || normalizedFile.size,
    url,
    storageKey,
  };
}
