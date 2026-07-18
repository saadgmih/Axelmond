import express from "express";
import { canAccessApiRoute, isRbacExemptRoute, normalizeApiRoutePath, normalizeRole } from "../rbac";
import {
  bumpAuthTokenVersion,
  createRefreshToken,
  findRefreshTokenRecord,
  findValidRefreshToken,
  logoutRefreshSession,
  revokeAllUserRefreshTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  signAuthToken,
  verifyAuthToken,
} from "../auth-token";
import { persistCoursePaymentEnrollment } from "../course-payments";
import type { CoursePaymentEnrollmentInput } from "../course-payments";
import { logSecurity, logAudit } from "../security-logger";
import { setAuthUser, tryGetAuthUser } from "./route-types";
import { toAppUser } from "./route-mappers";
import {
  isMfaSetupExemptRoute,
  isPrivilegedAccountRole,
  isPrivilegedMfaEnforced,
  privilegedUserRequiresMfaSetup,
} from "../mfa-requirement";

export type { AppUser, AuthenticatedRequest } from "./route-types";
export { getAuthUser, setAuthUser, tryGetAuthUser } from "./route-types";
export {
  invalidatePublicCatalogCache,
  invalidateStudentCatalogCache,
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

import { invalidateStudentCatalogCache } from "./route-ownership";
import {
  invalidateAuthUserCache as invalidateAuthUserCacheEntry,
  resolveCachedAuthDbUser,
  startAuthUserCachePruner,
  stopAuthUserCachePruner,
} from "./auth-user-cache";

export function invalidateAuthUserCache(userId: string): boolean {
  void invalidateStudentCatalogCache(userId);
  return invalidateAuthUserCacheEntry(userId);
}

export { startAuthUserCachePruner, stopAuthUserCachePruner };

export const requireAuth: express.RequestHandler = async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const session = verifyAuthToken(token);
  if (!session) {
    logSecurity("WARN", "Missing or invalid token", { method: req.method, path: req.path });
    res.status(401).json({ error: "Authentification requise" });
    return;
  }

  let dbUser: any = null;
  try {
    dbUser = await resolveCachedAuthDbUser(
      {
        userId: session.userId,
        authTokenVersion: session.authTokenVersion,
      },
      { forceRefresh: req.method === "GET" && req.path === "/api/auth/me" },
    );
  } catch (err) {
    logSecurity("WARN", "Auth database lookup failed", { userId: session.userId, error: String(err) });
    res.status(503).json({ error: "Base de données indisponible" });
    return;
  }

  const actualRole = normalizeRole(dbUser?.role);
  const currentAuthTokenVersion = Number(dbUser?.authTokenVersion) || 0;
  if (!dbUser || actualRole !== session.role || currentAuthTokenVersion !== session.authTokenVersion) {
    invalidateAuthUserCache(session.userId);
    logSecurity("WARN", "Token user not found, role changed, or token version revoked", {
      userId: session.userId,
      tokenRole: session.role,
      actualRole,
      tokenVersion: session.authTokenVersion,
      currentVersion: currentAuthTokenVersion,
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

  if (isPrivilegedMfaEnforced() && isPrivilegedAccountRole(actualRole) && !isMfaSetupExemptRoute(req)) {
    const needsMfaSetup = await privilegedUserRequiresMfaSetup(dbUser);
    if (needsMfaSetup) {
      logSecurity("WARN", "Privileged account blocked until MFA setup", {
        userId: dbUser.id,
        role: actualRole,
        path: normalizeApiRoutePath(req),
      });
      res.status(403).json({
        error: "L'authentification multi-facteurs est obligatoire pour ce compte.",
        mfaSetupRequired: true,
        code: "MFA_SETUP_REQUIRED",
      });
      return;
    }
  }

  setAuthUser(req, toAppUser(dbUser));
  next();
};

const RBAC_VERBOSE_LOGGING = process.env.RBAC_VERBOSE_LOGGING === "true";

export const requireRbac: express.RequestHandler = (req, res, next) => {
  const apiPath = normalizeApiRoutePath(req);
  const user = tryGetAuthUser(req);
  if (!user || !canAccessApiRoute(user.role, req.method, apiPath)) {
    logSecurity("WARN", "Access denied", { userId: user?.id, role: user?.role, method: req.method, path: apiPath });
    res.status(403).json({ error: "Accès refusé pour ce rôle" });
    return;
  }

  if (RBAC_VERBOSE_LOGGING) {
    logSecurity("INFO", "Access granted", { userId: user.id, role: user.role, method: req.method, path: apiPath });
  }
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
export { notifyAllStudents, notifyEnrolledStudentsForCourse } from "../notifications";
export {
  notifyCourseAccessUpdated,
  notifyCourseModuleCreated,
  notifyCourseUpdated,
  notifyLiveFinished,
  notifyLiveStarted,
  notifyPublishedChapter,
  notifyPublishedCourse,
  notifyPublishedLessonContent,
  notifyPublishedSection,
} from "../academic-notifications";
export { buildCourseGradeRows } from "../grades";
export { assertCourseLearningAccess } from "../course-access";
export { assertAiTutorAccess } from "../ai-tutor-access";
export {
  APP_USER_BILLING_INCLUDE,
  buildCourseInvoiceId,
  mergeUserInvoices,
  persistCoursePaymentEnrollment,
} from "../course-payments";
export { PUBLIC_API_ERRORS, LIVE_ACCESS_ERRORS, toPushSubscribeClientResponse } from "../public-api-errors";
export { apiErrorStatus, apiErrorMessage } from "./api-errors";
export { sanitizeAcademicProfileInput, sanitizeAvatarUrl, isAvatarUrlFieldInvalid } from "../academic-profile";
export { isAllowedAvatarUrl } from "../avatar-security";
export {
  generateCsrfToken,
  setAuthCookies,
  clearAuthCookies,
  persistCsrfTokenForRefreshSession,
} from "../auth-cookies";
export {
  withMobileRefreshToken,
  isMobileClientRequest,
  MOBILE_CLIENT_HEADER,
  MOBILE_CLIENT_KEY_HEADER,
} from "../auth-mobile";
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
  bumpAuthTokenVersion,
  createRefreshToken,
  findRefreshTokenRecord,
  findValidRefreshToken,
  logoutRefreshSession,
  revokeAllUserRefreshTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  signAuthToken,
  verifyAuthToken,
};

export async function revokeAllUserSessions(userId: string) {
  await revokeAllUserRefreshTokens(userId);
  invalidateAuthUserCache(userId);
}
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
export {
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendAdminTestEmail,
  getEmailErrorDetails,
  getSmtpPublicConfig,
} from "../email";
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
  getBcryptRounds,
} from "../security-hardening";
export { courseModuleRowFromJsonItem, getNextCourseModuleId, resolveCourseModules } from "../course-syllabus-modules";
export {
  createPayPalOrder,
  createPayPalDonationOrder,
  capturePayPalOrder,
  isPayPalConfigured,
  isPayPalDonationCustomId,
  logPayPalError,
} from "../paypal-server";
export { processPayPalCaptureDonation, toPayPalDonationCaptureClientResponse } from "../paypal-charity-donation";
export { processPayPalCaptureEnrollment, toPayPalCaptureClientResponse } from "../paypal-enrollment";
export { resolveCourseChargeAmount, isFreeCourseCharge } from "../promo-codes";
export {
  AI_TUTOR_ADDON_PRICE_MAD,
  computeCourseCheckoutTotalMad,
  resolveEnrollmentHasAiAccess,
} from "../utils/ai-tutor-pricing";
export { processFreeCourseEnrollment } from "../course-free-enrollment";
export { getSiteSettings, setForceDesktopMode } from "../site-settings";
export {
  attachSyncedCourseModules,
  syncPublishedLessonModules,
  syncPublishedLessonModulesForCourses,
} from "../course-curriculum-sync";
export {
  getModuleContentProgressKey,
  getStudentProgressSnapshot,
  getStudentProgressSnapshotsByCourseIds,
  setStudentModuleCompletion,
} from "../student-content-progress";
export { resolveLessonContentMediaSource, streamLessonContentDocument } from "./lesson-document";
export { collectRuntimeMemoryMetrics } from "./memory-metrics";
export { decodeStoredText } from "../text";
export { Prisma } from "@prisma/client";
export { default as bcrypt } from "bcryptjs";
export { z } from "zod";
