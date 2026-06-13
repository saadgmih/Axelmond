import fs from "node:fs";
import path from "node:path";

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
  "resolveCourseChargeAmount", "mergeUserInvoices", "APP_USER_BILLING_INCLUDE",
  "invalidateAuthUserCache", "sanitizeAcademicProfileInput", "sanitizeAvatarUrl", "isAvatarUrlFieldInvalid",
  "getAcademicProfileResponse", "persistUserAvatarUrl", "isAllowedAvatarUrl",
  "createRefreshToken", "rotateRefreshToken", "revokeRefreshToken", "revokeAllUserRefreshTokens", "hashRefreshToken",
  "setAuthCookies", "clearAuthCookies", "withMobileRefreshToken", "isMobileClientRequest", "MOBILE_CLIENT_HEADER",
  "canLoginToRequestedRole", "canAccessAcademicProfile", "isTeacherSpaceRole", "ProfessorInviteConsumeError",
  "reserveProfessorInviteCode", "attachProfessorInviteUsage", "normalizeProfessorInviteCode", "generateProfessorInviteCode",
  "parseProfessorInviteCodes", "professorInviteSnapshot", "emailDeliveryLogSnapshot", "recordEmailDeliveryLog",
  "buildFailedEmailDelivery", "sendVerificationEmail", "sendAdminTestEmail", "buildEmailDeliverySummary",
  "getEmailErrorDetails", "getSmtpPublicConfig", "getEmailDomain",
  "generateEmailVerificationCode", "hashEmailVerificationCode", "buildEmailVerificationExpiry", "canAttemptEmailVerification",
  "isEmailVerificationExpired", "normalizeEmailVerificationCode", "EMAIL_VERIFICATION_MAX_ATTEMPTS",
  "validateSchedulePayload", "serializeScheduleSession", "sortScheduleSessions", "canAccessProfessorScheduleSession",
  "validateStudentStudyPayload", "serializeStudentStudySession", "sortStudentStudySessions", "canAccessStudentStudySession",
  "validateStudentObjectivePayload", "normalizeStudentObjectivePayload", "serializeStudentObjective",
  "sortStudentObjectives", "canAccessStudentObjective", "buildStudentObjectiveSummary", "buildNextRecurringObjectiveData",
  "validateIncomingLiveSyncMessage", "isModeratorOnlyLiveSyncType", "LIVE_SYNC_TOPIC", "createEmptyPoll",
  "generateChatTutorResponse", "ChatTutorServiceError",
  "signAuthToken", "findValidRefreshToken", "readRefreshTokenFromRequest", "createEmailVerificationCode",
  "EMAIL_VERIFICATION_TTL_MINUTES", "sendEmailVerificationCode", "alertFailedLogins",
  "AUTH_MAX_ATTEMPTS", "AUTH_LOCKOUT_WINDOW_MS", "deleteContentSectionTree",
  "quizzes", "seedQuizModuleCourseMap", "parsePositiveInt", "initializeOpenAIService",
  "isSecurityRuntimeTest", "ensureAcademicProfileForUser",
  "getActivePgSchema", "decodeStoredText", "Prisma", "createDefaultStudentInvoices", "ensureAcademicProfileForUser",
  "toAcademicProfile", "registerPayPalConfigRoute",
].sort((a, b) => b.length - a.length);

const routesDir = path.join(path.resolve(import.meta.dirname, ".."), "src", "routes");

for (const file of fs.readdirSync(routesDir).filter((f) => f.endsWith("-routes.ts"))) {
  let content = fs.readFileSync(path.join(routesDir, file), "utf8");
  const start = content.indexOf("export function register");
  const head = content.slice(0, start);
  let body = content.slice(start);
  for (const sym of symbols) {
    const escaped = sym.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    body = body.replace(new RegExp(`(?<![\\w.])${escaped}\\b`, "g"), `api.${sym}`);
  }
  body = body.replace(/api\.(requireAuth|requireRbac|requireAdmin|validateBody|app|registerPayPalConfigRoute)\b/g, "$1");
  body = body.replace(/api\.persistCoursePaymentEnrollment\b/g, "persistCoursePaymentEnrollment");
  body = body.replace(/\/api\/api\./g, "/api/");
  body = body.replace(/async function api\./g, "async function ");
  body = body.replace(/function api\./g, "function ");
  fs.writeFileSync(path.join(routesDir, file), head + body);
  console.log("Prefixed", file);
}
