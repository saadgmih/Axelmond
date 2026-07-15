import { createHash, randomUUID } from "node:crypto";
import { isAllowedAvatarUrl } from "./avatar-security";
import { utapi } from "./uploadthing-api";

const COURSE_IMAGE_CUSTOM_ID_PREFIX = "course-image-v1";

function courseImageUserScope(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 16);
}

function courseImageCustomIdPrefix(courseId: number, userId: string): string {
  return `${COURSE_IMAGE_CUSTOM_ID_PREFIX}-${courseId}-${courseImageUserScope(userId)}-`;
}

export function buildCourseImageCustomId(
  courseId: number,
  userId: string,
  nonce = randomUUID().replace(/-/g, ""),
): string {
  return `${courseImageCustomIdPrefix(courseId, userId)}${nonce}`;
}

export function isCourseImageCustomIdFor(customId: string, courseId: number, userId: string): boolean {
  const prefix = courseImageCustomIdPrefix(courseId, userId);
  const nonce = customId.slice(prefix.length);
  return customId.startsWith(prefix) && /^[a-f0-9]{32}$/i.test(nonce);
}

export interface ConfirmedCourseImage {
  imageUrl: string;
  imageKey: string;
}

export class CourseImageConfirmationError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "CourseImageConfirmationError";
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

export async function resolveConfirmedCourseImage(
  customId: string,
  courseId: number,
  userId: string,
  getFileUrls: GetFileUrls = getUploadThingFileUrls,
): Promise<ConfirmedCourseImage> {
  const normalizedCustomId = String(customId || "").trim();
  if (!isCourseImageCustomIdFor(normalizedCustomId, courseId, userId)) {
    throw new CourseImageConfirmationError("Confirmation de l'image du module invalide", 403);
  }

  let remoteFiles: Awaited<ReturnType<GetFileUrls>>;
  try {
    remoteFiles = await getFileUrls(normalizedCustomId, { keyType: "customId" });
  } catch {
    throw new CourseImageConfirmationError(
      "Le stockage n'a pas pu confirmer l'image. Réessayez dans quelques instants.",
      502,
    );
  }

  const remoteFile = remoteFiles.data[0];
  if (!remoteFile?.key || !remoteFile.url) {
    throw new CourseImageConfirmationError("Image téléversée introuvable", 404);
  }
  if (!isAllowedAvatarUrl(remoteFile.url)) {
    throw new CourseImageConfirmationError("URL de l'image du module non autorisée", 400);
  }

  return {
    imageUrl: remoteFile.url,
    imageKey: remoteFile.key,
  };
}
