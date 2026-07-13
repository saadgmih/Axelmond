import { isAllowedRasterImageUpload } from "./avatar-security";
import {
  detectMessageAttachmentKind,
  normalizeMessageAttachmentMimeType,
  type MessageAttachmentInput,
  validateMessageAttachmentInput,
} from "./messaging";
import { utapi } from "./uploadthing-api";

export interface MessageAttachmentConfirmationInput {
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export class MessageAttachmentConfirmationError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "MessageAttachmentConfirmationError";
  }
}

type GetFileUrls = (storageKey: string) => Promise<{
  data: readonly { key: string; url: string }[];
}>;

async function getUploadThingFileUrls(storageKey: string) {
  return utapi.getFileUrls(storageKey);
}

export async function resolveConfirmedMessageAttachment(
  input: MessageAttachmentConfirmationInput,
  getFileUrls: GetFileUrls = getUploadThingFileUrls,
): Promise<MessageAttachmentInput> {
  const storageKey = String(input.storageKey || "").trim();
  const fileName = String(input.fileName || "").trim();
  const mimeType = normalizeMessageAttachmentMimeType(input.mimeType, fileName);
  const kind = detectMessageAttachmentKind(mimeType, fileName);

  if (!storageKey || !fileName || !kind) {
    throw new MessageAttachmentConfirmationError("Pièce jointe invalide", 400);
  }
  if (kind === "IMAGE" && !isAllowedRasterImageUpload(fileName, mimeType)) {
    throw new MessageAttachmentConfirmationError("Type de fichier non autorisé", 400);
  }

  let remoteFiles: Awaited<ReturnType<GetFileUrls>>;
  try {
    remoteFiles = await getFileUrls(storageKey);
  } catch {
    throw new MessageAttachmentConfirmationError(
      "Le stockage n'a pas pu confirmer le fichier. Réessayez dans quelques instants.",
      502,
    );
  }

  const remoteFile = remoteFiles.data.find((file) => file.key === storageKey);
  if (!remoteFile?.url) {
    throw new MessageAttachmentConfirmationError("Fichier transféré introuvable", 404);
  }

  const attachment: MessageAttachmentInput = {
    kind,
    fileName,
    mimeType,
    sizeBytes: input.sizeBytes,
    url: remoteFile.url,
    storageKey,
  };
  const validationError = validateMessageAttachmentInput(attachment);
  if (validationError) {
    throw new MessageAttachmentConfirmationError(validationError, 400);
  }

  return attachment;
}
