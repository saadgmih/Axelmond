import express from "express";
import { canAccessApiRoute, isRbacExemptRoute, normalizeApiRoutePath, normalizeRole } from "../rbac";
import { verifyAuthToken } from "../auth-token";
import { APP_USER_BILLING_INCLUDE, persistCoursePaymentEnrollment } from "../course-payments";
import type { CoursePaymentEnrollmentInput } from "../course-payments";
import { prisma } from "../db";
import { logSecurity, logAudit } from "../security-logger";
import { setAuthUser, tryGetAuthUser } from "./route-types";
import { toAppUser } from "./route-mappers";

export type { AppUser, AuthenticatedRequest } from "./route-types";
export { getAuthUser, setAuthUser, tryGetAuthUser } from "./route-types";
export {
  invalidatePublicCatalogCache,
  verifyChapterAccess,
  verifyContentAccess,
  verifyCourseAccess,
  verifyQuizAccess,
  verifyQuizQuestionAccess,
  verifySectionAccess,
} from "./route-ownership";
export { logLiveKit, logInvitation, logEmail, logDb } from "./route-loggers";
export * from "./route-mappers";
export * from "./route-schemas";

interface CachedUser {
  dbUser: any;
  expiresAt: number;
}
const authUserCache = new Map<string, CachedUser>();

export function invalidateAuthUserCache(userId: string) {
  if (authUserCache.delete(userId)) {
    logSecurity("INFO", "Auth user cache invalidated after enrollment update", { userId });
  }
}

export const requireAuth: express.RequestHandler = async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const session = verifyAuthToken(token);
  if (!session) {
    logSecurity("WARN", "Missing or invalid token", { method: req.method, path: req.path });
    res.status(401).json({ error: "Authentification requise" });
    return;
  }

  const now = Date.now();
  let dbUser: any = null;
  const cached = authUserCache.get(session.userId);
  if (cached && cached.expiresAt > now) {
    dbUser = cached.dbUser;
  } else {
    try {
      dbUser = await prisma.user.findUnique({
        where: { id: session.userId },
        include: APP_USER_BILLING_INCLUDE,
      });
      if (dbUser) {
        authUserCache.set(session.userId, {
          dbUser,
          expiresAt: now + 15000, // cache for 15 seconds
        });
      }
    } catch (err) {
      logSecurity("WARN", "Auth database lookup failed", { userId: session.userId, error: String(err) });
      res.status(503).json({ error: "Base de données indisponible" });
      return;
    }
  }

  const actualRole = normalizeRole(dbUser?.role);
  if (!dbUser || actualRole !== session.role) {
    logSecurity("WARN", "Token user not found or role changed", {
      userId: session.userId,
      tokenRole: session.role,
      actualRole,
    });
    res.status(401).json({ error: "Session invalide" });
    return;
  }
  if (!dbUser.emailVerified) {
    logSecurity("WARN", "Unverified email access denied", { userId: dbUser.id, method: req.method, path: req.path });
    res.status(403).json({
      error: "Veuillez vérifier votre e-mail avant d'accéder à l'application",
      verificationRequired: true,
      email: dbUser.email,
    });
    return;
  }

  setAuthUser(req, toAppUser(dbUser));
  next();
};

export const requireRbac: express.RequestHandler = (req, res, next) => {
  const apiPath = normalizeApiRoutePath(req);
  const user = tryGetAuthUser(req);
  if (!user || !canAccessApiRoute(user.role, req.method, apiPath)) {
    logSecurity("WARN", "Access denied", { userId: user?.id, role: user?.role, method: req.method, path: apiPath });
    res.status(403).json({ error: "Accès refusé pour ce rôle" });
    return;
  }

  logSecurity("INFO", "Access granted", { userId: user.id, role: user.role, method: req.method, path: apiPath });
  next();
};

export const requireGlobalApiRbac: express.RequestHandler = (req, res, next) => {
  const apiPath = normalizeApiRoutePath(req);
  if (isRbacExemptRoute(req.method, apiPath)) {
    next();
    return;
  }

  requireAuth(req, res, () => {
    if (res.headersSent) return;
    requireRbac(req, res, next);
  });
};

export const requireAdmin: express.RequestHandler = (req, res, next) => {
  const user = tryGetAuthUser(req);
  if (!user || user.role !== "ADMIN") {
    logSecurity("WARN", "Admin access denied", {
      userId: user?.id,
      role: user?.role,
      method: req.method,
      path: req.path,
    });
    res.status(403).json({ error: "Accès administrateur requis" });
    return;
  }

  next();
};


export async function persistCoursePaymentWithAudit(params: CoursePaymentEnrollmentInput) {
  return persistCoursePaymentEnrollment(params, {
    logAudit,
    invalidateAuthUserCache,
  });
}

export { quizzes, seedQuizModuleCourseMap } from "./startup-db";
export { prisma, getActivePgSchema } from "../db";
export { logSecurity, logAudit, alertFailedLogins } from "../security-logger";
export { cacheGet, cacheSet, cacheDel, cacheDelByPrefix } from "../cache";
export { deleteCloudFiles } from "../uploadthing";
export { notifyEnrolledStudentsForCourse } from "../notifications";
export { buildCourseGradeRows } from "../grades";
export { assertCourseLearningAccess } from "../course-access";
export { APP_USER_BILLING_INCLUDE, buildCourseInvoiceId, mergeUserInvoices, persistCoursePaymentEnrollment } from "../course-payments";
export { PUBLIC_API_ERRORS, LIVE_ACCESS_ERRORS, toPushSubscribeClientResponse } from "../public-api-errors";
export { sanitizeAcademicProfileInput, sanitizeAvatarUrl, isAvatarUrlFieldInvalid } from "../academic-profile";
export { isAllowedAvatarUrl } from "../avatar-security";
export { setAuthCookies, clearAuthCookies } from "../auth-cookies";
export { withMobileRefreshToken, isMobileClientRequest, MOBILE_CLIENT_HEADER } from "../auth-mobile";
export { readRefreshTokenFromRequest } from "../auth-cookies";
export { parsePositiveInt } from "../route-params";
export {
  generateChatTutorResponse,
  ChatTutorServiceError,
  toChatTutorClientResponse,
  initializeOpenAIService,
} from "../openai-service";
export type { CourseModule } from "../types";
export {
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  signAuthToken,
  verifyAuthToken,
  findValidRefreshToken,
} from "../auth-token";
export { normalizeRole, canLoginToRequestedRole, canAccessAcademicProfile, isTeacherSpaceRole } from "../rbac";
export { DEFAULT_STUDENT_LABEL, DEFAULT_MODULE_CLASSIFICATION } from "../types";
export {
  DEFAULT_LIVE_SUBJECT,
  buildLiveKitRoomName,
  getLiveKitConfig,
  getLiveKitParticipantIdentity,
} from "../livekit";
export { normalizeProfessorInviteCode, generateProfessorInviteCode, parseProfessorInviteCodes } from "../invitations";
export {
  ProfessorInviteConsumeError,
  attachProfessorInviteUsage,
  reserveProfessorInviteCode,
} from "../professor-invite-consume";
export { buildEmailDeliverySummary } from "../email-delivery-summary";
export { sendVerificationEmail, sendAdminTestEmail, getEmailErrorDetails, getSmtpPublicConfig } from "../email";
export {
  generateEmailVerificationCode,
  hashEmailVerificationCode,
  buildEmailVerificationExpiry,
  canAttemptEmailVerification,
  isDevVerificationCodeLogEnabled,
  isEmailVerificationExpired,
  maskEmailForDevLog,
  normalizeEmailVerificationCode,
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  EMAIL_VERIFICATION_TTL_MINUTES,
} from "../email-verification";
export {
  validateSchedulePayload,
  serializeScheduleSession,
  sortScheduleSessions,
  canAccessProfessorScheduleSession,
} from "../schedule";
export {
  validateStudentStudyPayload,
  serializeStudentStudySession,
  sortStudentStudySessions,
  canAccessStudentStudySession,
} from "../student-study-schedule";
export {
  validateStudentObjectivePayload,
  normalizeStudentObjectivePayload,
  serializeStudentObjective,
  sortStudentObjectives,
  canAccessStudentObjective,
  buildStudentObjectiveSummary,
  buildNextRecurringObjectiveData,
} from "../student-objectives";
export { validateIncomingLiveSyncMessage, isModeratorOnlyLiveSyncType } from "../live/live-sync-validation";
export { LIVE_SYNC_TOPIC, createEmptyPoll } from "../live/live-sync";
export {
  hashRefreshToken,
  CHAT_TUTOR_MAX_HISTORY_CHARS,
  CHAT_TUTOR_MAX_HISTORY_MESSAGES,
  CHAT_TUTOR_MAX_PROMPT_CHARS,
  trimChatTutorHistory,
} from "../security-hardening";
export {
  courseModuleRowFromJsonItem,
  getNextCourseModuleId,
  resolveCourseModules,
  shouldReadRelationalCourseModules,
} from "../course-syllabus-modules";
export { createPayPalOrder, capturePayPalOrder, isPayPalConfigured, logPayPalError } from "../paypal-server";
export { processPayPalCaptureEnrollment, toPayPalCaptureClientResponse } from "../paypal-enrollment";
export { resolveCourseChargeAmount } from "../promo-codes";
export { decodeStoredText } from "../text";
export { AccessToken, RoomServiceClient, DataPacket_Kind } from "livekit-server-sdk";
export { Prisma } from "@prisma/client";
export { default as bcrypt } from "bcryptjs";
export { z } from "zod";

