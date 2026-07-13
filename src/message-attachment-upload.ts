import { getFreshSessionToken } from "./api";
import { normalizeMessageAttachmentMimeType } from "./message-attachment-utils";
import { bindUploadProgress, getUploadedFileUrl, getUploadErrorMessage, uploadFiles } from "./uploadthing-client";
import type { MessageAttachment } from "./types/messaging";

export type OutgoingMessageAttachment = Pick<
  MessageAttachment,
  "kind" | "fileName" | "mimeType" | "sizeBytes" | "url"
> & {
  storageKey: string;
};

export function normalizeMessageUploadFile(file: File): File {
  const normalizedType = normalizeMessageAttachmentMimeType(file.type, file.name);
  if (normalizedType) {
    if (normalizedType === file.type) return file;
    return new File([file], file.name, { type: normalizedType, lastModified: file.lastModified });
  }
  return file;
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
    if (url && (!kind || !storageKey)) {
      throw new Error(
        "Le fichier a été transféré, mais le serveur n'a pas confirmé l'envoi. Réessayez dans quelques instants.",
      );
    }
    const entryError = getUploadEntryErrorMessage(entry);
    throw new Error(getUploadErrorMessage(entryError || entry));
  }

  return {
    kind: kind as OutgoingMessageAttachment["kind"],
    fileName: (typeof meta?.fileName === "string" && meta.fileName) || normalizedFile.name,
    mimeType:
      (typeof meta?.mimeType === "string" &&
        normalizeMessageAttachmentMimeType(meta.mimeType, String(meta?.fileName || normalizedFile.name))) ||
      normalizeMessageAttachmentMimeType(normalizedFile.type, normalizedFile.name),
    sizeBytes: (typeof meta?.sizeBytes === "number" && meta.sizeBytes) || normalizedFile.size,
    url,
    storageKey,
  };
}
