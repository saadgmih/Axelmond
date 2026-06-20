import { getFreshSessionToken } from "./api";
import { bindUploadProgress, getUploadedFileUrl, getUploadErrorMessage, uploadFiles } from "./uploadthing-client";
import type { MessageAttachment } from "./types/messaging";

export type OutgoingMessageAttachment = Pick<
  MessageAttachment,
  "kind" | "fileName" | "mimeType" | "sizeBytes" | "url"
> & {
  storageKey: string;
};

export async function uploadMessageAttachmentFile(
  file: File,
  conversationId: string,
  onUploadProgress?: (progress: number) => void,
): Promise<OutgoingMessageAttachment> {
  const token = await getFreshSessionToken();
  if (!token) {
    throw new Error("Session expirée. Reconnectez-vous.");
  }

  const uploaded = await (uploadFiles as any)("messageAttachment", {
    files: [file],
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
    throw new Error(getUploadErrorMessage(entry));
  }

  return {
    kind: kind as OutgoingMessageAttachment["kind"],
    fileName: (typeof meta?.fileName === "string" && meta.fileName) || file.name,
    mimeType: (typeof meta?.mimeType === "string" && meta.mimeType) || file.type,
    sizeBytes: (typeof meta?.sizeBytes === "number" && meta.sizeBytes) || file.size,
    url,
    storageKey,
  };
}
