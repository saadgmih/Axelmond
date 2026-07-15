import { createHash, randomUUID } from "node:crypto";
import { isAllowedAvatarUrl } from "./avatar-security";
import { utapi } from "./uploadthing-api";

const LESSON_ASSET_CUSTOM_ID_PREFIX = "lesson-asset-v1";

export type LessonAssetContentType = "VIDEO" | "PDF" | "IMAGE";

export interface LessonAssetIntent {
  courseId: number;
  sectionId: string | null;
  title: string;
  contentType: LessonAssetContentType;
  published: boolean;
  fileName: string;
  mimeType: string;
  size: number;
}

function lessonAssetUserScope(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 16);
}

export function normalizeLessonAssetIntent(intent: LessonAssetIntent): LessonAssetIntent {
  return {
    courseId: intent.courseId,
    sectionId: String(intent.sectionId || "").trim() || null,
    title: String(intent.title || "").trim(),
    contentType: intent.contentType,
    published: Boolean(intent.published),
    fileName: String(intent.fileName || "").trim(),
    mimeType: String(intent.mimeType || "")
      .trim()
      .toLowerCase(),
    size: Math.trunc(intent.size),
  };
}

function lessonAssetIntentScope(intent: LessonAssetIntent): string {
  return createHash("sha256")
    .update(JSON.stringify(normalizeLessonAssetIntent(intent)))
    .digest("hex")
    .slice(0, 24);
}

function lessonAssetCustomIdPrefix(intent: LessonAssetIntent, userId: string): string {
  return `${LESSON_ASSET_CUSTOM_ID_PREFIX}-${intent.courseId}-${lessonAssetUserScope(userId)}-${lessonAssetIntentScope(intent)}-`;
}

export function buildLessonAssetCustomId(
  intent: LessonAssetIntent,
  userId: string,
  nonce = randomUUID().replace(/-/g, ""),
): string {
  return `${lessonAssetCustomIdPrefix(intent, userId)}${nonce}`;
}

export function isLessonAssetCustomIdFor(customId: string, intent: LessonAssetIntent, userId: string): boolean {
  const prefix = lessonAssetCustomIdPrefix(intent, userId);
  const nonce = customId.slice(prefix.length);
  return customId.startsWith(prefix) && /^[a-f0-9]{32}$/i.test(nonce);
}

export function lessonAssetContentId(customId: string): string {
  return `asset_${createHash("sha256").update(customId).digest("hex").slice(0, 24)}`;
}

export interface ConfirmedLessonAsset {
  fileKey: string;
  url: string;
}

export class LessonAssetConfirmationError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "LessonAssetConfirmationError";
  }
}

type GetFileUrls = (
  customId: string,
  options: { keyType: "customId" },
) => Promise<{
  data: readonly { key: string; url: string }[];
}>;

async function getUploadThingFileUrls(customId: string, options: { keyType: "customId" }) {
  return utapi.getFileUrls(customId, options);
}

export async function resolveConfirmedLessonAsset(
  customId: string,
  intent: LessonAssetIntent,
  userId: string,
  getFileUrls: GetFileUrls = getUploadThingFileUrls,
): Promise<ConfirmedLessonAsset> {
  const normalizedCustomId = String(customId || "").trim();
  if (!isLessonAssetCustomIdFor(normalizedCustomId, intent, userId)) {
    throw new LessonAssetConfirmationError("Confirmation du média pédagogique invalide", 403);
  }

  let remoteFiles: Awaited<ReturnType<GetFileUrls>>;
  try {
    remoteFiles = await getFileUrls(normalizedCustomId, { keyType: "customId" });
  } catch {
    throw new LessonAssetConfirmationError(
      "Le stockage n'a pas pu confirmer le média. Réessayez dans quelques instants.",
      502,
    );
  }

  const remoteFile = remoteFiles.data[0];
  if (!remoteFile?.key || !remoteFile.url) {
    throw new LessonAssetConfirmationError("Média téléversé introuvable", 404);
  }
  if (!isAllowedAvatarUrl(remoteFile.url)) {
    throw new LessonAssetConfirmationError("URL du média pédagogique non autorisée", 400);
  }

  return { fileKey: remoteFile.key, url: remoteFile.url };
}
