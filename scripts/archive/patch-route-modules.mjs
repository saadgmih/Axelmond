/**
 * Fix route-deps paths/exports and patch route modules to use ctx.deps.*
 * Run: node scripts/patch-route-modules.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const depsPath = path.join(root, "src", "server", "route-deps.ts");
let deps = fs.readFileSync(depsPath, "utf8");
deps = deps.replace(/from "\.\/src\//g, 'from "../');
deps = deps.replace(/^interface AppUser/m, "export interface AppUser");
deps = deps.replace(/^function log(LiveKit|Invitation|Email|Db)\b/gm, "export function log$1");
deps = deps.replace(/^function (validateBody|toAppUser|toDomain|toDiscipline|toCourse|getOptionalAuthUser|invalidatePublicCatalogCache|sanitizeObject|sanitizeInputText)\b/gm, "export function $1");
deps = deps.replace(/^async function (verifyCourseAccess|verifyChapterAccess|verifySectionAccess|verifyContentAccess|verifyQuizAccess|verifyQuizQuestionAccess|getCourseContentTree|toCourseForUser|getStudentCompletedModuleIds|findCourse|ensureLiveSession|recordLiveAction|recordLiveAttendanceJoin|recordLiveAttendanceLeave|assertLiveAccess|findQuizWithQuestions|getAcademicProfileResponse|createEmailVerificationCode|sendEmailVerificationCode|recordEmailDeliveryLog|persistUserAvatarUrl|deleteContentSectionTree|getSectionAndDescendantIds)\b/gm, "export async function $1");
deps = deps.replace(/^function (getLiveKitApiUrl|getLiveKitRoomService|canReadCourseGrades|professorInviteSnapshot|emailDeliveryLogSnapshot|buildFailedEmailDelivery|getEmailDomain|buildContentTree|toLessonContent|toAttachment|applyModuleProgressForStudent|getLiveStartedAt|createDefaultStudentInvoices|ensureAcademicProfileForUser|toAcademicProfile|invalidateAuthUserCache)\b/gm, "export function $1");
deps = deps.replace(/^const (requireAuth|requireRbac|requireAdmin|registerSchema|loginSchema|verifyEmailSchema|resendEmailSchema|forgotPasswordSchema|resetPasswordSchema|scheduleSessionSchema|studentStudyScheduleSchema|studentObjectiveSchema|chatTutorSchema|courseSchema|coursePatchSchema|contactSchema|supportTicketSchema|chapterSchema|chapterPatchSchema|sectionSchema|sectionPatchSchema|textContentSchema|textContentPatchSchema|quizSchema|quizPatchSchema|quizQuestionSchema|quizAttemptSchema|passwordChangeSchema|academicProfileSchema|liveMessageSchema|liveEventSchema|liveModerationSchema|liveAttendanceLeaveSchema|liveSyncSchema|syncUserSchema|PASSWORD_RESET_GENERIC_MESSAGE|activeLiveSessionInclude|courseResponseInclude)\b/gm, "export const $1");

// log helpers from server.ts
const serverLines = fs.readFileSync(path.join(root, "server.ts"), "utf8").split("\n");
const logHelpers = serverLines.slice(641, 656).join("\n").replace(/^function log/gm, "export function log");
if (!deps.includes("export function logLiveKit")) {
  deps = deps.replace(
    "export interface AppUser",
    `${logHelpers}\n\nexport interface AppUser`,
  );
}

fs.writeFileSync(depsPath, deps);

const symbols = [
  "prisma", "logSecurity", "logAudit", "logDb", "logEmail", "logInvitation", "logLiveKit", "logPayPalError",
  "normalizeRole", "bcrypt", "z", "DEFAULT_STUDENT_LABEL", "DEFAULT_MODULE_CLASSIFICATION", "DEFAULT_LIVE_SUBJECT",
  "registerSchema", "loginSchema", "verifyEmailSchema", "resendEmailSchema", "forgotPasswordSchema", "resetPasswordSchema",
  "scheduleSessionSchema", "studentStudyScheduleSchema", "studentObjectiveSchema", "chatTutorSchema",
  "courseSchema", "coursePatchSchema", "contactSchema", "supportTicketSchema",
  "chapterSchema", "chapterPatchSchema", "sectionSchema", "sectionPatchSchema",
  "textContentSchema", "textContentPatchSchema", "quizSchema", "quizPatchSchema", "quizQuestionSchema", "quizAttemptSchema",
  "passwordChangeSchema", "academicProfileSchema", "liveMessageSchema", "liveEventSchema", "liveModerationSchema",
  "liveAttendanceLeaveSchema", "liveSyncSchema", "syncUserSchema", "PASSWORD_RESET_GENERIC_MESSAGE",
  "toAppUser", "toCourse", "toCourseForUser", "toDomain", "toDiscipline", "toLessonContent", "toAttachment",
  "getOptionalAuthUser", "verifyCourseAccess", "verifyChapterAccess", "verifySectionAccess", "verifyContentAccess",
  "verifyQuizAccess", "verifyQuizQuestionAccess", "getCourseContentTree", "invalidatePublicCatalogCache",
  "deleteCloudFiles", "notifyEnrolledStudentsForCourse", "cacheGet", "cacheSet", "cacheDel", "cacheDelByPrefix",
  "buildCourseGradeRows", "canReadCourseGrades", "assertCourseLearningAccess", "courseResponseInclude",
  "findCourse", "ensureLiveSession", "getLiveKitConfig", "getLiveKitApiUrl", "getLiveKitRoomService",
  "buildLiveKitRoomName", "getLiveKitParticipantIdentity", "AccessToken", "RoomServiceClient", "DataPacket_Kind",
  "recordLiveAction", "recordLiveAttendanceJoin", "recordLiveAttendanceLeave", "assertLiveAccess", "findQuizWithQuestions",
  "createPayPalOrder", "capturePayPalOrder", "isPayPalConfigured", "processPayPalCaptureEnrollment",
  "persistCoursePaymentEnrollmentCore", "resolveCourseChargeAmount", "mergeUserInvoices", "APP_USER_BILLING_INCLUDE",
  "invalidateAuthUserCache", "sanitizeAcademicProfileInput", "sanitizeAvatarUrl", "isAvatarUrlFieldInvalid",
  "getAcademicProfileResponse", "persistUserAvatarUrl", "isAllowedAvatarUrl", "isAllowedAvatarMime",
  "createRefreshToken", "rotateRefreshToken", "revokeRefreshToken", "revokeAllUserRefreshTokens", "hashRefreshToken",
  "setAuthCookies", "clearAuthCookies", "withMobileRefreshToken", "isMobileClientRequest", "MOBILE_CLIENT_HEADER",
  "canLoginToRequestedRole", "canAccessAcademicProfile", "isTeacherSpaceRole", "ProfessorInviteConsumeError",
  "reserveProfessorInviteCode", "attachProfessorInviteUsage", "normalizeProfessorInviteCode", "generateProfessorInviteCode",
  "parseProfessorInviteCodes", "professorInviteSnapshot", "emailDeliveryLogSnapshot", "recordEmailDeliveryLog",
  "buildFailedEmailDelivery", "sendVerificationEmail", "sendAdminTestEmail", "buildEmailDeliverySummary",
  "generateEmailVerificationCode", "hashEmailVerificationCode", "buildEmailVerificationExpiry", "canAttemptEmailVerification",
  "isEmailVerificationExpired", "normalizeEmailVerificationCode", "EMAIL_VERIFICATION_MAX_ATTEMPTS",
  "validateSchedulePayload", "serializeScheduleSession", "sortScheduleSessions", "canAccessProfessorScheduleSession",
  "validateStudentStudyPayload", "serializeStudentStudySession", "sortStudentStudySessions", "canAccessStudentStudySession",
  "validateStudentObjectivePayload", "normalizeStudentObjectivePayload", "serializeStudentObjective",
  "sortStudentObjectives", "canAccessStudentObjective", "buildStudentObjectiveSummary", "buildNextRecurringObjectiveData",
  "validateIncomingLiveSyncMessage", "isModeratorOnlyLiveSyncType", "LIVE_SYNC_TOPIC", "createEmptyPoll",
  "generateChatTutorResponse", "ChatTutorServiceError", "CHAT_TUTOR_MAX_PROMPT_CHARS", "CHAT_TUTOR_MAX_HISTORY_MESSAGES",
  "getActivePgSchema", "decodeStoredText", "Prisma",
];

const routesDir = path.join(root, "src", "routes");
for (const file of fs.readdirSync(routesDir).filter((f) => f.endsWith("-routes.ts"))) {
  let content = fs.readFileSync(path.join(routesDir, file), "utf8");
  let body = content.replace(/^import type[\s\S]*?^export function/m, "export function");
  for (const sym of symbols) {
    body = body.replace(new RegExp(`(?<!d\\.)\\b${sym.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), `d.${sym}`);
  }
  body = body.replace(/d\.(requireAuth|requireRbac|requireAdmin|validateBody)/g, "$1");
  body = body.replace(
    /export function register(\w+)Routes\(app: Express, ctx: RouteContext\): void \{\n  const \{ requireAuth, requireRbac, requireAdmin, validateBody \} = ctx\.middleware;\n/,
    "export function register$1Routes(app: Express, ctx: RouteContext): void {\n  const d = ctx.deps;\n  const { requireAuth, requireRbac, requireAdmin, validateBody } = ctx.middleware;\n",
  );
  const patched = `import type { Express } from "express";
import type { RouteContext } from "../server/route-context";
import { registerPayPalConfigRoute } from "../paypal-routes";

${body}`;
  fs.writeFileSync(path.join(routesDir, file), patched);
  console.log(`Patched ${file}`);
}

console.log("Done");
