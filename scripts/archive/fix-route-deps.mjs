import fs from "node:fs";
import path from "node:path";

const depsPath = path.join(path.resolve(import.meta.dirname, ".."), "src", "server", "route-deps.ts");
let src = fs.readFileSync(depsPath, "utf8");
src = src.replace(/from "\.\/src\//g, 'from "../');

src = src.replace(
  /import \{\s*\n\s*isModeratorOnlyLiveSyncType,\s*\n\s*validateIncomingLiveSyncMessage,\s*\n\ninterface CachedUser/m,
  `import {
  isModeratorOnlyLiveSyncType,
  validateIncomingLiveSyncMessage,
} from "../live/live-sync-validation";

interface CachedUser`,
);

src = src.replace(/^interface AppUser/m, "export interface AppUser");
src = src.replace(/^function log(LiveKit|Invitation|Email|Db)\b/gm, "export function log$1");
src = src.replace(/^function (validateBody|toAppUser|toDomain|toDiscipline|toCourse|getOptionalAuthUser|invalidatePublicCatalogCache|sanitizeObject|sanitizeInputText|createDefaultStudentInvoices|ensureAcademicProfileForUser|toAcademicProfile|getEmailDomain|buildFailedEmailDelivery|professorInviteSnapshot|emailDeliveryLogSnapshot|getLiveKitApiUrl|getLiveKitRoomService|canReadCourseGrades|buildContentTree|toLessonContent|toAttachment|applyModuleProgressForStudent|getLiveStartedAt)\b/gm, "export function $1");
src = src.replace(/^async function (getOptionalAuthUser|verifyCourseAccess|verifyChapterAccess|verifySectionAccess|verifyContentAccess|verifyQuizAccess|verifyQuizQuestionAccess|getCourseContentTree|toCourseForUser|getStudentCompletedModuleIds|findCourse|ensureLiveSession|recordLiveAction|recordLiveAttendanceJoin|recordLiveAttendanceLeave|assertLiveAccess|findQuizWithQuestions|getAcademicProfileResponse|createEmailVerificationCode|sendEmailVerificationCode|recordEmailDeliveryLog|persistUserAvatarUrl|deleteContentSectionTree|getSectionAndDescendantIds|invalidatePublicCatalogCache|ensureAcademicProfileForUser)\b/gm, "export async function $1");
src = src.replace(/^function invalidateAuthUserCache\b/m, "export function invalidateAuthUserCache");
src = src.replace(/^const (requireAuth|requireRbac|requireAdmin|registerSchema|loginSchema|verifyEmailSchema|resendEmailSchema|forgotPasswordSchema|resetPasswordSchema|scheduleSessionSchema|studentStudyScheduleSchema|studentObjectiveSchema|chatTutorSchema|courseSchema|coursePatchSchema|contactSchema|supportTicketSchema|chapterSchema|chapterPatchSchema|sectionSchema|sectionPatchSchema|textContentSchema|textContentPatchSchema|quizSchema|quizPatchSchema|quizQuestionSchema|quizAttemptSchema|passwordChangeSchema|academicProfileSchema|liveMessageSchema|liveEventSchema|liveModerationSchema|liveAttendanceLeaveSchema|liveSyncSchema|syncUserSchema|PASSWORD_RESET_GENERIC_MESSAGE|activeLiveSessionInclude|courseResponseInclude|seedQuizzes|seedQuizModuleCourseMap|quizzes)\b/gm, "export const $1");

const reexports = `
export { quizzes, seedQuizModuleCourseMap } from "./startup-db";
export { prisma, getActivePgSchema } from "../db";
export { logSecurity, logAudit, alertFailedLogins } from "../security-logger";
export { cacheGet, cacheSet, cacheDel, cacheDelByPrefix } from "../cache";
export { deleteCloudFiles } from "../uploadthing";
export { notifyEnrolledStudentsForCourse } from "../notifications";
export { buildCourseGradeRows } from "../grades";
export { assertCourseLearningAccess } from "../course-access";
export { APP_USER_BILLING_INCLUDE, mergeUserInvoices, persistCoursePaymentEnrollment } from "../course-payments";
export { sanitizeAcademicProfileInput, sanitizeAvatarUrl, isAvatarUrlFieldInvalid } from "../academic-profile";
export { isAllowedAvatarUrl } from "../avatar-security";
export { setAuthCookies, clearAuthCookies } from "../auth-cookies";
export { withMobileRefreshToken, isMobileClientRequest, MOBILE_CLIENT_HEADER } from "../auth-mobile";
export { readRefreshTokenFromRequest } from "../auth-cookies";
export { parsePositiveInt } from "../route-params";
export { generateChatTutorResponse, ChatTutorServiceError, initializeOpenAIService } from "../openai-service";
export type { CourseModule } from "../types";
export { createRefreshToken, rotateRefreshToken, revokeRefreshToken, revokeAllUserRefreshTokens, signAuthToken, verifyAuthToken, findValidRefreshToken } from "../auth-token";
export { normalizeRole, canLoginToRequestedRole, canAccessAcademicProfile, isTeacherSpaceRole } from "../rbac";
export { DEFAULT_STUDENT_LABEL, DEFAULT_MODULE_CLASSIFICATION } from "../types";
export { DEFAULT_LIVE_SUBJECT, buildLiveKitRoomName, getLiveKitConfig, getLiveKitParticipantIdentity } from "../livekit";
export { normalizeProfessorInviteCode, generateProfessorInviteCode, parseProfessorInviteCodes } from "../invitations";
export { ProfessorInviteConsumeError, attachProfessorInviteUsage, reserveProfessorInviteCode } from "../professor-invite-consume";
export { buildEmailDeliverySummary } from "../email-delivery-summary";
export { sendVerificationEmail, sendAdminTestEmail, getEmailErrorDetails, getSmtpPublicConfig } from "../email";
export { generateEmailVerificationCode, hashEmailVerificationCode, buildEmailVerificationExpiry, canAttemptEmailVerification, isEmailVerificationExpired, normalizeEmailVerificationCode, EMAIL_VERIFICATION_MAX_ATTEMPTS, EMAIL_VERIFICATION_TTL_MINUTES } from "../email-verification";
export { validateSchedulePayload, serializeScheduleSession, sortScheduleSessions, canAccessProfessorScheduleSession } from "../schedule";
export { validateStudentStudyPayload, serializeStudentStudySession, sortStudentStudySessions, canAccessStudentStudySession } from "../student-study-schedule";
export { validateStudentObjectivePayload, normalizeStudentObjectivePayload, serializeStudentObjective, sortStudentObjectives, canAccessStudentObjective, buildStudentObjectiveSummary, buildNextRecurringObjectiveData } from "../student-objectives";
export { validateIncomingLiveSyncMessage, isModeratorOnlyLiveSyncType } from "../live/live-sync-validation";
export { LIVE_SYNC_TOPIC, createEmptyPoll } from "../live/live-sync";
export { hashRefreshToken, CHAT_TUTOR_MAX_HISTORY_MESSAGES, CHAT_TUTOR_MAX_PROMPT_CHARS } from "../security-hardening";
export { createPayPalOrder, capturePayPalOrder, isPayPalConfigured, logPayPalError } from "../paypal-server";
export { processPayPalCaptureEnrollment } from "../paypal-enrollment";
export { resolveCourseChargeAmount } from "../promo-codes";
export { decodeStoredText } from "../text";
export { AccessToken, RoomServiceClient, DataPacket_Kind } from "livekit-server-sdk";
export { Prisma } from "@prisma/client";
export { default as bcrypt } from "bcryptjs";
export { z } from "zod";
`;

if (!src.includes('export { prisma, getActivePgSchema }')) {
  src += `
export const AUTH_MAX_ATTEMPTS = Number(process.env.AUTH_MAX_ATTEMPTS) || 20;
export const AUTH_LOCKOUT_WINDOW_MS = Number(process.env.AUTH_LOCKOUT_WINDOW_MS) || 60 * 1000;
export const isSecurityRuntimeTest = process.env.SECURITY_RUNTIME_TEST === "1";
`;
  src += reexports;
}

fs.writeFileSync(depsPath, src);
console.log("Fixed route-deps.ts");
