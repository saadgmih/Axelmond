import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const src = fs.readFileSync(path.join(root, "src/server/route-deps.ts"), "utf8");
const lines = src.split("\n");

const mapperStart = lines.findIndex((l) => l.includes("// ─── Database-backed User Store"));
const schemaStart = lines.findIndex((l) => l.includes("// ─── Input Validation & Sanitization"));
const ownershipComment = lines.findIndex((l) => l.includes("// ─── Resource Ownership Verification Helpers"));
const barrelStart = lines.findIndex((l) => l.startsWith("export { quizzes, seedQuizModuleCourseMap }"));

let mapperBody = lines.slice(mapperStart + 1, schemaStart).join("\n");
mapperBody = mapperBody.replace(/\nexport async function persistCoursePaymentWithAudit[\s\S]*?\n}\n/, "\n");
const schemaBody = [
  ...lines.slice(schemaStart + 1, ownershipComment),
  ...lines.slice(barrelStart - 3, barrelStart - 1),
].join("\n");
const avatarBody = lines.slice(ownershipComment + 3, barrelStart - 3).join("\n");
const barrelLines = lines.slice(barrelStart).map((line) =>
  line === "export { APP_USER_BILLING_INCLUDE, buildCourseInvoiceId, mergeUserInvoices, persistCoursePaymentEnrollment };"
    ? 'export { APP_USER_BILLING_INCLUDE, buildCourseInvoiceId, mergeUserInvoices, persistCoursePaymentEnrollment } from "../course-payments";'
    : line,
);

const mapperImports = `import express from "express";
import { Prisma } from "@prisma/client";
import { RoomServiceClient } from "livekit-server-sdk";
import { Course, DEFAULT_STUDENT_LABEL } from "../types";
import { UserRole, canAccessAcademicProfile, normalizeRole } from "../rbac";
import { verifyAuthToken } from "../auth-token";
import { buildLiveKitRoomName } from "../livekit";
import {
  EMAIL_VERIFICATION_TTL_MINUTES,
  generateEmailVerificationCode,
  hashEmailVerificationCode,
  buildEmailVerificationExpiry,
  isDevVerificationCodeLogEnabled,
  maskEmailForDevLog,
} from "../email-verification";
import { sendVerificationEmail, getEmailErrorDetails, getSmtpPublicConfig } from "../email";
import { prisma } from "../db";
import { decodeStoredText, decodeStoredValue } from "../text";
import { APP_USER_BILLING_INCLUDE, mergeUserInvoices } from "../course-payments";
import { resolveCourseModules } from "../course-syllabus-modules";
import { LIVE_ACCESS_ERRORS } from "../public-api-errors";
import { logEmail, logLiveKit } from "./route-loggers";
import type { AppUser } from "./route-types";
`;

const schemaImports = `import express from "express";
import { z } from "zod";
import { DEFAULT_MODULE_CLASSIFICATION } from "../types";
import {
  CHAT_TUTOR_MAX_HISTORY_MESSAGES,
  CHAT_TUTOR_MAX_PROMPT_CHARS,
  trimChatTutorHistory,
} from "../security-hardening";
`;

const depsImports = `import express from "express";
import { canAccessApiRoute, isRbacExemptRoute, normalizeApiRoutePath, normalizeRole } from "../rbac";
import { verifyAuthToken } from "../auth-token";
import { APP_USER_BILLING_INCLUDE, persistCoursePaymentEnrollment } from "../course-payments";
import type { CoursePaymentEnrollmentInput } from "../course-payments";
import { prisma } from "../db";
import { logSecurity, logAudit } from "../security-logger";
import { setAuthUser, tryGetAuthUser } from "./route-types";
import { toAppUser } from "./route-mappers";
`;

const authBlock = lines.slice(84, mapperStart).join("\n");

const routeMappers = `${mapperImports}
// ─── Database-backed User Store ──────────────────────────────────────────────

${mapperBody}

${avatarBody}
`;

const routeSchemas = `${schemaImports}
// ─── Input Validation & Sanitization ─────────────────────────────────────────

${schemaBody}
`;

const routeDeps = `${depsImports}
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

${authBlock}

export async function persistCoursePaymentWithAudit(params: CoursePaymentEnrollmentInput) {
  return persistCoursePaymentEnrollment(params, {
    logAudit,
    invalidateAuthUserCache,
  });
}

${barrelLines.join("\n")}
`;

fs.writeFileSync(path.join(root, "src/server/route-mappers.ts"), routeMappers);
fs.writeFileSync(path.join(root, "src/server/route-schemas.ts"), routeSchemas);
fs.writeFileSync(path.join(root, "src/server/route-deps.ts"), routeDeps);

console.log("route-mappers.ts:", routeMappers.split("\n").length, "lines");
console.log("route-schemas.ts:", routeSchemas.split("\n").length, "lines");
console.log("route-deps.ts:", routeDeps.split("\n").length, "lines");
