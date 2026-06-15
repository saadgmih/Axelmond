import fs from "node:fs";

const lines = fs.readFileSync("src/server/route-mappers.ts", "utf8").split("\n");

const catalogHeader = `import { Course } from "../types";
import { prisma } from "../db";
import { decodeStoredText } from "../text";
import { resolveCourseModules } from "../course-syllabus-modules";
import type { AppUser } from "../route-types";
`;

const contentHeader = `import { prisma } from "../db";
`;

const userHeader = `import express from "express";
import { Prisma } from "@prisma/client";
import { DEFAULT_STUDENT_LABEL } from "../types";
import { UserRole, canAccessAcademicProfile, normalizeRole } from "../rbac";
import { verifyAuthToken } from "../auth-token";
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
import { APP_USER_BILLING_INCLUDE, mergeUserInvoices } from "../course-payments";
import { logEmail } from "../route-loggers";
import type { AppUser } from "../route-types";
import { toCourse, courseResponseInclude } from "./catalog-mappers";
`;

const liveHeader = `import { Prisma, type LiveSession } from "@prisma/client";
import { RoomServiceClient } from "livekit-server-sdk";
import { Course } from "../types";
import { canAccessAcademicProfile } from "../rbac";
import { buildLiveKitRoomName } from "../livekit";
import { prisma } from "../db";
import { LIVE_ACCESS_ERRORS } from "../public-api-errors";
import { logLiveKit } from "../route-loggers";
import type { AppUser } from "../route-types";
import { findCourse } from "./user-mappers";
`;

function slice(start, end) {
  return lines.slice(start - 1, end).join("\n");
}

const catalog = `${catalogHeader}\n${slice(28, 163)}`;
const content = `${contentHeader}\n${slice(165, 241)}\n${slice(257, 314)}`;
const user = `${userHeader}\n${slice(317, 571)}`;
const live = `${liveHeader}\n${slice(573, 769)}`;

fs.mkdirSync("src/server/mappers", { recursive: true });
fs.writeFileSync("src/server/mappers/catalog-mappers.ts", catalog);
fs.writeFileSync("src/server/mappers/content-mappers.ts", content);
fs.writeFileSync("src/server/mappers/user-mappers.ts", user);
fs.writeFileSync("src/server/mappers/live-mappers.ts", live);
fs.writeFileSync(
  "src/server/route-mappers.ts",
  `export * from "./mappers/catalog-mappers";
export * from "./mappers/content-mappers";
export * from "./mappers/user-mappers";
export * from "./mappers/live-mappers";
`,
);

console.log("route-mappers split complete");
