/**
 * Rebuild modular server layout from scripts/archive/server-backup.ts
 * Run: node scripts/archive/rebuild-modular-server.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const backupPath = path.join(import.meta.dirname, "server-backup.ts");
const lines = fs.readFileSync(backupPath, "utf8").split("\n");

function slice(ranges) {
  return ranges.map(([s, e]) => lines.slice(s - 1, e).join("\n")).join("\n\n");
}

function write(relPath, content) {
  const full = path.join(root, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  console.log(`Wrote ${relPath} (${content.split("\n").length} lines)`);
}

// ─── startup-db.ts ───────────────────────────────────────────────────────────
{
  const chunk = slice([[767, 892], [1478, 1651]]);
  const header = `import { prisma, getActivePgSchema } from "../db";
import { Course, DEFAULT_MODULE_CLASSIFICATION, DEFAULT_STUDENT_LABEL } from "../types";
import { ACADEMIC_DOMAINS, DEFAULT_DISCIPLINE_ID, getDisciplineIdForCourse } from "../academic-taxonomy";
import { shouldSkipStartupSeed } from "../startup-seed";
import { decodeStoredText, decodeStoredValue } from "../text";
import { Prisma } from "@prisma/client";
import { normalizeProfessorInviteCode, parseProfessorInviteCodes, generateProfessorInviteCode } from "../invitations";
import { canAccessAcademicProfile } from "../rbac";

import { DEFAULT_LIVE_SUBJECT } from "../livekit";

function logDb(level: "INFO" | "WARN" | "ERROR", message: string, data?: unknown) {
  console.log(\`[\${new Date().toISOString()}] [\${level}] [db] \${message}\${data ? " " + JSON.stringify(data) : ""}\`);
}

async function ensureAcademicProfileForUser(client: typeof prisma, user: { id: string; role: string; levelOrTitle?: string | null }) {
  if (!canAccessAcademicProfile(user.role as any)) return null;
  return client.academicProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      title: user.levelOrTitle || "Enseignant Chercheur",
      teachingDomains: [],
      researchDomains: [],
      links: {},
    },
  });
}

`;
  const body = chunk
    .replace(/^const seedCourses/m, "export const seedCourses")
    .replace(/^const seedQuizzes/m, "export const seedQuizzes")
    .replace(/^const seedQuizModuleCourseMap/m, "export const seedQuizModuleCourseMap")
    .replace(/^const quizzes = seedQuizzes/m, "export const quizzes = seedQuizzes")
    .replace(/^async function seedDatabase/m, "export async function seedDatabase")
    .replace(/^async function synchronizePostgresSequences/m, "export async function synchronizePostgresSequences");
  write("src/server/startup-db.ts", header + body);
}

// ─── route-deps.ts ───────────────────────────────────────────────────────────
{
  const importBlock = `import express from "express";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { Course, DEFAULT_MODULE_CLASSIFICATION, DEFAULT_STUDENT_LABEL } from "../types";
import { UserRole, canAccessAcademicProfile, canAccessApiRoute, normalizeRole } from "../rbac";
import { verifyAuthToken } from "../auth-token";
import { DEFAULT_LIVE_SUBJECT, buildLiveKitRoomName, getLiveKitConfig, getLiveKitParticipantIdentity } from "../livekit";
import { generateProfessorInviteCode, normalizeProfessorInviteCode, parseProfessorInviteCodes } from "../invitations";
import {
  EMAIL_VERIFICATION_TTL_MINUTES,
  generateEmailVerificationCode,
  hashEmailVerificationCode,
  buildEmailVerificationExpiry,
  canAttemptEmailVerification,
  isEmailVerificationExpired,
  normalizeEmailVerificationCode,
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
} from "../email-verification";
import { sendVerificationEmail, getEmailErrorDetails, getSmtpPublicConfig } from "../email";
import { prisma } from "../db";
import { decodeStoredText, decodeStoredValue } from "../text";
import { logSecurity, logAudit } from "../security-logger";
import { cacheGet, cacheSet, cacheDel, cacheDelByPrefix } from "../cache";
import { deleteCloudFiles } from "../uploadthing";
import { notifyEnrolledStudentsForCourse } from "../notifications";
import { buildCourseGradeRows } from "../grades";
import { assertCourseLearningAccess } from "../course-access";
import { sanitizeAcademicProfileInput, sanitizeAvatarUrl, isAvatarUrlFieldInvalid } from "../academic-profile";
import { isAllowedAvatarUrl } from "../avatar-security";
import { CHAT_TUTOR_MAX_HISTORY_MESSAGES, CHAT_TUTOR_MAX_PROMPT_CHARS } from "../security-hardening";
`;

  const body = slice([
    [614, 628],
    [681, 763],
    [894, 1476],
    [1653, 1981],
    [2029, 2032],
    [4386, 4406],
  ]);

  write("src/server/route-deps.ts", `${importBlock}\n\n${body}\n`);
}

// ─── route modules ───────────────────────────────────────────────────────────
{
  const ranges = {
    courses: [[1985, 2188], [2788, 3055]],
    content: [[2189, 2787], [3056, 3240]],
    admin: [[3243, 3367], [4496, 4513]],
    auth: [[3369, 4091], [4409, 4494], [4825, 4875]],
    objectives: [[4078, 4090], [4093, 4407]],
    live: [[4515, 4823]],
    payments: [[4942, 5145]],
    misc: [[5147, 5400]],
  };

  const paymentsWebhookHeader = `import type { Express } from "express";
import express from "express";
import type { RouteContext } from "../server/route-context";
import type { AppUser } from "../server/route-deps";
import * as api from "../server/route-deps";
import { JSON_BODY_LIMIT } from "../security-hardening";
import {
  extractPayPalWebhookHeaders,
  handlePayPalWebhookEvent,
  isPayPalWebhookConfigured,
  parsePayPalWebhookEvent,
  verifyPayPalWebhookSignature,
} from "../paypal-webhook";
import { logPayPalError } from "../paypal-server";
import { registerPayPalConfigRoute } from "../paypal-routes";

function buildPersistCoursePaymentEnrollment(ctx: RouteContext) {
  const d = ctx.deps;
  return async (params: {
    userId: string;
    courseId: number;
    courseTitle: string;
    coursePrice: number;
    invoiceId: string;
    auditAction: string;
    reqIp?: string;
  }) => {
    const user = await d.prisma.user.findUnique({ where: { id: params.userId } });
    if (!user) throw new Error("USER_NOT_FOUND");

    const currentInvoices = Array.isArray(user.invoices) ? (user.invoices as any[]) : [];
    if (currentInvoices.some((invoice) => invoice?.id === params.invoiceId)) {
      const existingUser = await d.prisma.user.findUnique({
        where: { id: params.userId },
        include: { enrollments: true },
      });
      return {
        duplicate: true as const,
        user: existingUser,
        invoice: currentInvoices.find((invoice) => invoice?.id === params.invoiceId),
      };
    }

    const newInvoice = {
      id: params.invoiceId,
      date: new Date().toLocaleDateString("fr-FR"),
      courseTitle: params.courseTitle,
      amount: params.coursePrice,
      status: "Payé",
    };

    const [, , updatedUser] = await d.prisma.$transaction([
      d.prisma.enrollment.upsert({
        where: { userId_courseId: { userId: params.userId, courseId: params.courseId } },
        update: { active: true },
        create: { userId: params.userId, courseId: params.courseId, active: true },
      }),
      d.prisma.user.update({
        where: { id: params.userId },
        data: { invoices: [...currentInvoices, newInvoice] },
      }),
      d.prisma.user.findUnique({
        where: { id: params.userId },
        include: { enrollments: true },
      }),
    ]);

    if (!updatedUser) throw new Error("USER_NOT_FOUND");

    d.invalidateAuthUserCache(params.userId);
    await d.logAudit(
      params.userId,
      user.email,
      params.auditAction,
      "Course",
      String(params.courseId),
      { price: params.coursePrice, invoiceId: params.invoiceId },
      params.reqIp,
    );

    return { duplicate: false as const, user: updatedUser, invoice: newInvoice };
  };
}

export function registerPayPalWebhook(app: Express, ctx: RouteContext): void {
  const persistCoursePaymentEnrollment = buildPersistCoursePaymentEnrollment(ctx);

  app.post(
    "/api/paypal/webhook",
    express.raw({ type: "application/json", limit: JSON_BODY_LIMIT }),
    async (req, res) => {
      if (!isPayPalWebhookConfigured()) {
        res.status(503).json({ error: "Webhook PayPal non configuré" });
        return;
      }

      const headers = extractPayPalWebhookHeaders(req.headers);
      const event = parsePayPalWebhookEvent(req.body as Buffer);
      if (!headers || !event) {
        res.status(400).json({ error: "Webhook PayPal invalide" });
        return;
      }

      const verified = await verifyPayPalWebhookSignature({ headers, webhookEvent: event });
      if (!verified) {
        logPayPalError("PayPal webhook signature rejected", { transmissionId: headers.transmissionId });
        res.status(401).json({ error: "Signature PayPal invalide" });
        return;
      }

      try {
        const result = await handlePayPalWebhookEvent(event, {
          reqIp: req.ip,
          persistCoursePaymentEnrollment,
        });

        if ("ignored" in result) {
          res.status(200).json({ ok: true, ignored: true, eventType: result.eventType });
          return;
        }

        if (result.ok === false) {
          res.status(result.status).json({ error: result.error, code: result.code });
          return;
        }

        res.status(200).json({
          ok: true,
          duplicate: result.duplicate,
          invoiceId: result.invoiceId,
          userId: result.userId,
          courseId: result.courseId,
        });
      } catch (err: any) {
        logPayPalError("PayPal webhook handler failed", { error: String(err?.message || err) });
        res.status(500).json({ error: "Traitement webhook PayPal impossible" });
      }
    },
  );
}

`;

  for (const [name, rgs] of Object.entries(ranges)) {
    const body = slice(rgs);
    const fnName = `register${name.charAt(0).toUpperCase()}${name.slice(1)}Routes`;
    const extraImports =
      name === "misc"
        ? `import rateLimit from "express-rate-limit";\nimport type { CourseModule } from "../server/route-deps";\n`
        : name === "courses"
          ? `import type { CourseModule } from "../server/route-deps";\n`
          : "";
    const header =
      name === "payments"
        ? paymentsWebhookHeader
        : `import type { Express } from "express";
${extraImports}import type { RouteContext } from "../server/route-context";
import type { AppUser } from "../server/route-deps";
import * as api from "../server/route-deps";

`;
    const paymentsBodyPrefix =
      name === "payments"
        ? `export function registerPaymentsRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireRbac, requireAdmin, validateBody } = ctx.middleware;
  const persistCoursePaymentEnrollment = buildPersistCoursePaymentEnrollment(ctx);

`
        : `export function ${fnName}(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireRbac, requireAdmin, validateBody } = ctx.middleware;

`;
    write(
      `src/routes/${name}-routes.ts`,
      `${header}${paymentsBodyPrefix}${body.replace(/^/gm, "  ")}\n}\n`,
    );
  }
}

// ─── slim server.ts ──────────────────────────────────────────────────────────
{
  const importBlock = `import express from "express";
import { createServer } from "node:http";
import crypto from "node:crypto";
import path from "path";
import fs from "node:fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createRouteHandler } from "uploadthing/express";
import compression from "compression";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { getPayPalRuntimeEnv } from "./src/paypal-server";
import { prisma, verifyDatabaseConnection } from "./src/db";
import { uploadRouter } from "./src/uploadthing";
import { startPerformanceMonitor, requestTimingMiddleware } from "./src/performance";
import { startCachePruner } from "./src/cache";
import { logSecurity } from "./src/security-logger";
import { patchExpressAsyncRoutes } from "./src/express-async";
import { isBlockedProductionSourcePath } from "./src/static-source-guard";
import { assertProductionConfiguration } from "./src/production-config";
import { registerMessagingRoutes } from "./src/messaging-routes";
import { initMessagingSocket } from "./src/messaging-socket";
import {
  JSON_BODY_LIMIT,
  REFRESH_RATE_LIMIT_MAX,
  REFRESH_RATE_LIMIT_WINDOW_MS,
  hashRefreshToken,
} from "./src/security-hardening";
import { readRefreshTokenFromRequest } from "./src/auth-cookies";
import { csrfProtection } from "./src/auth-csrf";
import { isMobileClientRequest, MOBILE_CLIENT_HEADER } from "./src/auth-mobile";
import { applyMobileApiCorsHeaders, registerMobileApiRoutes } from "./src/mobile-api-routes";
import { emailRateLimitKey } from "./src/email-rate-limit";
import { liveKitRateLimitKey } from "./src/livekit-rate-limit";
import { adminRateLimitKey } from "./src/admin-rate-limit";
import { verifySmtpConnection, readSmtpBanner } from "./src/email";
`;

  const modularImports = `
import * as routeDeps from "./src/server/route-deps";
import { createRouteContext } from "./src/server/route-context";
import { registerApiRoutes } from "./src/routes/register-api-routes";
import { registerPayPalWebhook } from "./src/routes/payments-routes";
import { seedDatabase, synchronizePostgresSequences } from "./src/server/startup-db";
import { apiErrorStatus, apiErrorMessage } from "./src/server/api-errors";
`;

  let body = slice([
    [112, 281],
    [336, 591],
    [593, 679],
    [5406, 5570],
  ]);

  body = body.replace(
    /connectSrc\.push\("ws:", "wss:"\);\s*\n\s*\n\s*return connectSrc;/,
    "return connectSrc;",
  );

  const wiring = `
const routeCtx = createRouteContext(routeDeps);
registerPayPalWebhook(app, routeCtx);
`;

  const timingInsert = `
registerApiRoutes(app, routeCtx);
registerMobileApiRoutes(app, { requireAuth: routeCtx.middleware.requireAuth });
registerMessagingRoutes(app, routeCtx.middleware);
`;

  body = body.replace("app.use(cookieParser());", `app.use(cookieParser());${wiring}`);
  body = body.replace(
    'app.use("/api", requestTimingMiddleware);',
    `app.use("/api", requestTimingMiddleware);${timingInsert}`,
  );
  body = body.replace(
    "registerMobileApiRoutes(app, { requireAuth });",
    "registerMobileApiRoutes(app, { requireAuth: routeCtx.middleware.requireAuth });",
  );
  body = body.replace(
    "registerMessagingRoutes(app, { requireAuth, requireRbac, validateBody });",
    "registerMessagingRoutes(app, routeCtx.middleware);",
  );

  write("server.ts", `${importBlock}${modularImports}\n${body}\n`);
}

console.log("Rebuild complete — run: node scripts/fix-route-deps.mjs && node scripts/apply-api-prefix.mjs");
