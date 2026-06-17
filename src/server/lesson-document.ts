import type { AppUser } from "./route-types";
import { prisma } from "../db";
import { sanitizeCourseAttachmentUrl } from "../external-url-security";
import { verifyCourseAccess } from "./route-ownership";

const LESSON_DOCUMENT_FETCH_TIMEOUT_MS = 30_000;
const LESSON_DOCUMENT_MAX_BYTES = 40 * 1024 * 1024;

export async function canViewLessonDocument(
  authUser: AppUser,
  content: {
    courseId: number;
    published: boolean;
    sectionId: string | null;
    section: { published: boolean } | null;
  },
): Promise<boolean> {
  if (authUser.role === "ADMIN") return true;

  if (authUser.role === "STUDENT") {
    if (!authUser.enrolledCourses.includes(content.courseId)) return false;
    if (!content.published) return false;
    if (content.sectionId && content.section && !content.section.published) return false;
    return true;
  }

  return verifyCourseAccess(authUser, content.courseId);
}

export async function streamLessonContentDocument(contentId: string, authUser: AppUser) {
  const content = await prisma.lessonContent.findUnique({
    where: { id: contentId },
    include: {
      attachments: { orderBy: { createdAt: "asc" } },
      section: { select: { published: true } },
    },
  });

  if (!content) {
    return { ok: false as const, status: 404, error: "Contenu introuvable" };
  }

  if (content.type !== "PDF" && content.type !== "IMAGE") {
    return { ok: false as const, status: 400, error: "Ce contenu n'est pas un document consultable" };
  }

  if (!(await canViewLessonDocument(authUser, content))) {
    return { ok: false as const, status: 403, error: "Accès refusé pour consulter ce document" };
  }

  const attachment = content.attachments.find((item) => item.type === content.type) ?? content.attachments[0];
  if (!attachment) {
    return { ok: false as const, status: 404, error: "Fichier introuvable" };
  }

  const safeUrl = sanitizeCourseAttachmentUrl(attachment.url);
  if (!safeUrl) {
    return { ok: false as const, status: 403, error: "URL du document non autorisée" };
  }

  const upstream = await fetch(safeUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(LESSON_DOCUMENT_FETCH_TIMEOUT_MS),
  });

  if (!upstream.ok) {
    return { ok: false as const, status: 502, error: "Impossible de récupérer le fichier" };
  }

  const contentLength = Number(upstream.headers.get("content-length") || 0);
  if (contentLength > LESSON_DOCUMENT_MAX_BYTES) {
    return { ok: false as const, status: 413, error: "Fichier trop volumineux pour l'aperçu intégré" };
  }

  const bytes = Buffer.from(await upstream.arrayBuffer());
  if (bytes.byteLength > LESSON_DOCUMENT_MAX_BYTES) {
    return { ok: false as const, status: 413, error: "Fichier trop volumineux pour l'aperçu intégré" };
  }

  const contentType =
    content.type === "IMAGE"
      ? attachment.mimeType || upstream.headers.get("content-type") || "image/jpeg"
      : "application/pdf";

  return {
    ok: true as const,
    fileName: attachment.fileName || `${content.title}${content.type === "IMAGE" ? ".jpg" : ".pdf"}`,
    bytes,
    contentType,
  };
}
