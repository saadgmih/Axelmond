import type { AppUser } from "./route-types";
import { prisma } from "../db";
import { sanitizeCourseAttachmentUrl } from "../external-url-security";
import { verifyCourseAccess } from "./route-ownership";

const LESSON_DOCUMENT_FETCH_TIMEOUT_MS = 30_000;
const LESSON_DOCUMENT_MAX_BYTES = 40 * 1024 * 1024;
const LESSON_UPSTREAM_MAX_ATTEMPTS = 3;
const LESSON_UPSTREAM_RETRY_BASE_DELAY_MS = 250;
const LESSON_VIDEO_HEADER_TIMEOUT_MS = 12_000;
const RETRYABLE_UPSTREAM_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function waitForUpstreamRetry(attempt: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, LESSON_UPSTREAM_RETRY_BASE_DELAY_MS * 2 ** attempt));
}

async function fetchUpstreamHeaders(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, redirect: "follow", signal: controller.signal });
  } finally {
    // Limit only the connection and response-header phase. Video streaming may
    // legitimately remain open for the full duration of playback.
    clearTimeout(timeout);
  }
}

function isExpectedVideoResponse(response: Response): boolean {
  const contentType = (response.headers.get("content-type") || "").toLowerCase().split(";", 1)[0].trim();
  return contentType.startsWith("video/") || contentType === "application/octet-stream";
}

function normalizeSingleRangeHeader(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^bytes=(?:\d+-\d*|-\d+)$/.test(trimmed)) return null;
  return trimmed;
}

function isExpectedDocumentPayload(type: "PDF" | "IMAGE", bytes: Buffer, contentType: string): boolean {
  const normalizedType = contentType.toLowerCase().split(";", 1)[0].trim();
  if (normalizedType === "text/html" || normalizedType === "application/json") return false;

  if (type === "PDF") {
    const mimeAllowed = normalizedType === "application/pdf" || normalizedType === "application/octet-stream";
    return mimeAllowed && bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  }

  const mimeAllowed = normalizedType.startsWith("image/") || normalizedType === "application/octet-stream";
  if (!mimeAllowed) return false;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isGif = ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"));
  const isWebp =
    bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return isJpeg || isPng || isGif || isWebp;
}

export async function canViewLessonContent(
  authUser: AppUser,
  content: {
    courseId: number;
    published: boolean;
    sectionId: string | null;
    section: { published: boolean } | null;
    status?: string;
  },
): Promise<boolean> {
  if (authUser.role === "ADMIN") return true;

  if (authUser.role === "STUDENT") {
    if (!authUser.enrolledCourses.includes(content.courseId)) return false;
    if (!content.published) return false;
    if (content.status && content.status !== "READY" && content.status !== "PUBLISHED") return false;
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

  if (!(await canViewLessonContent(authUser, content))) {
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

  for (let attempt = 0; attempt < LESSON_UPSTREAM_MAX_ATTEMPTS; attempt += 1) {
    try {
      const upstream = await fetch(safeUrl, {
        redirect: "follow",
        signal: AbortSignal.timeout(LESSON_DOCUMENT_FETCH_TIMEOUT_MS),
      });

      if (!upstream.ok) {
        await upstream.body?.cancel().catch(() => undefined);
        if (RETRYABLE_UPSTREAM_STATUSES.has(upstream.status) && attempt + 1 < LESSON_UPSTREAM_MAX_ATTEMPTS) {
          await waitForUpstreamRetry(attempt);
          continue;
        }
        return { ok: false as const, status: 502, error: "Impossible de récupérer le fichier" };
      }

      const contentLength = Number(upstream.headers.get("content-length") || 0);
      if (contentLength > LESSON_DOCUMENT_MAX_BYTES) {
        await upstream.body?.cancel().catch(() => undefined);
        return { ok: false as const, status: 413, error: "Fichier trop volumineux pour l'aperçu intégré" };
      }

      const bytes = Buffer.from(await upstream.arrayBuffer());
      if (bytes.byteLength > LESSON_DOCUMENT_MAX_BYTES) {
        return { ok: false as const, status: 413, error: "Fichier trop volumineux pour l'aperçu intégré" };
      }

      const upstreamContentType =
        upstream.headers.get("content-type") || attachment.mimeType || "application/octet-stream";
      if (!isExpectedDocumentPayload(content.type, bytes, upstreamContentType)) {
        if (attempt + 1 < LESSON_UPSTREAM_MAX_ATTEMPTS) {
          await waitForUpstreamRetry(attempt);
          continue;
        }
        return { ok: false as const, status: 502, error: "Le fournisseur de fichiers a renvoyé un contenu invalide" };
      }

      const contentType =
        content.type === "IMAGE" ? attachment.mimeType || upstreamContentType || "image/jpeg" : "application/pdf";

      return {
        ok: true as const,
        fileName: attachment.fileName || `${content.title}${content.type === "IMAGE" ? ".jpg" : ".pdf"}`,
        bytes,
        contentType,
      };
    } catch {
      if (attempt + 1 < LESSON_UPSTREAM_MAX_ATTEMPTS) {
        await waitForUpstreamRetry(attempt);
        continue;
      }
      return { ok: false as const, status: 502, error: "Le stockage du document est momentanément indisponible" };
    }
  }

  return { ok: false as const, status: 502, error: "Impossible de récupérer le fichier" };
}

export async function resolveLessonContentMediaSource(contentId: string, authUser: AppUser) {
  const content = await prisma.lessonContent.findUnique({
    where: { id: contentId },
    include: {
      attachments: { orderBy: { createdAt: "asc" } },
      section: { select: { published: true } },
    },
  });

  if (!content) return { ok: false as const, status: 404, error: "Contenu introuvable" };
  if (content.type !== "VIDEO") {
    return { ok: false as const, status: 400, error: "Ce contenu n’est pas une vidéo" };
  }
  if (!(await canViewLessonContent(authUser, content))) {
    return { ok: false as const, status: 403, error: "Accès refusé pour consulter cette vidéo" };
  }

  const attachment = content.attachments.find((item) => item.type === "VIDEO") ?? content.attachments[0];
  if (!attachment) return { ok: false as const, status: 404, error: "Fichier introuvable" };
  const safeUrl = sanitizeCourseAttachmentUrl(attachment.url);
  if (!safeUrl) return { ok: false as const, status: 403, error: "URL de la vidéo non autorisée" };

  const brandingJob = await prisma.videoProcessingJob.findUnique({
    where: { contentId },
    select: {
      status: true,
      outputVideoPath: true,
      sourceDuration: true,
      outputDuration: true,
    },
  });
  const measuredIntroDuration =
    brandingJob?.status === "READY" && brandingJob.outputVideoPath === safeUrl
      ? (brandingJob.outputDuration ?? 0) - (brandingJob.sourceDuration ?? 0)
      : 0;
  const brandedIntroDuration =
    Number.isFinite(measuredIntroDuration) && measuredIntroDuration >= 0.5 && measuredIntroDuration <= 30
      ? measuredIntroDuration
      : 0;

  return {
    ok: true as const,
    sourceUrl: safeUrl,
    mimeType: attachment.mimeType || "video/mp4",
    brandedIntroDuration,
  };
}

export async function streamLessonContentVideo(contentId: string, rangeHeader: unknown) {
  const content = await prisma.lessonContent.findUnique({
    where: { id: contentId },
    include: { attachments: { orderBy: { createdAt: "asc" } } },
  });

  if (!content) return { ok: false as const, status: 404, error: "Contenu introuvable" };
  if (content.type !== "VIDEO") return { ok: false as const, status: 400, error: "Ce contenu n’est pas une vidéo" };

  const attachment = content.attachments.find((item) => item.type === "VIDEO") ?? content.attachments[0];
  if (!attachment) return { ok: false as const, status: 404, error: "Fichier introuvable" };
  const safeUrl = sanitizeCourseAttachmentUrl(attachment.url);
  if (!safeUrl) return { ok: false as const, status: 403, error: "URL de la vidéo non autorisée" };

  const normalizedRange = normalizeSingleRangeHeader(rangeHeader);
  if (typeof rangeHeader === "string" && !normalizedRange) {
    return { ok: false as const, status: 416, error: "Plage vidéo non prise en charge" };
  }

  for (let attempt = 0; attempt < LESSON_UPSTREAM_MAX_ATTEMPTS; attempt += 1) {
    try {
      const upstream = await fetchUpstreamHeaders(
        safeUrl,
        { headers: normalizedRange ? { Range: normalizedRange } : undefined },
        LESSON_VIDEO_HEADER_TIMEOUT_MS,
      );
      const validStatus = upstream.status === 200 || upstream.status === 206;
      const validVideo = isExpectedVideoResponse(upstream);
      if (!validStatus || !validVideo || !upstream.body) {
        await upstream.body?.cancel().catch(() => undefined);
        const retryable = RETRYABLE_UPSTREAM_STATUSES.has(upstream.status) || (upstream.ok && !validVideo);
        if (retryable && attempt + 1 < LESSON_UPSTREAM_MAX_ATTEMPTS) {
          await waitForUpstreamRetry(attempt);
          continue;
        }
        return {
          ok: false as const,
          status: upstream.status === 404 ? 404 : upstream.status === 416 ? 416 : 502,
          error: "Le fournisseur vidéo ne répond pas correctement",
        };
      }

      return {
        ok: true as const,
        status: upstream.status,
        body: upstream.body,
        contentType: upstream.headers.get("content-type") || attachment.mimeType || "video/mp4",
        contentLength: upstream.headers.get("content-length"),
        contentRange: upstream.headers.get("content-range"),
        acceptRanges: upstream.headers.get("accept-ranges") || "bytes",
        etag: upstream.headers.get("etag"),
        lastModified: upstream.headers.get("last-modified"),
      };
    } catch {
      if (attempt + 1 < LESSON_UPSTREAM_MAX_ATTEMPTS) {
        await waitForUpstreamRetry(attempt);
        continue;
      }
      return { ok: false as const, status: 502, error: "Le stockage vidéo est momentanément indisponible" };
    }
  }

  return { ok: false as const, status: 502, error: "Impossible de charger la vidéo" };
}
