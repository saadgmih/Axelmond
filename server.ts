import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { createRouteHandler } from "uploadthing/express";
import compression from "compression";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";
import {
  capturePayPalOrder,
  createPayPalOrder,
  formatPayPalAmount,
  getPayPalRuntimeEnv,
  isPayPalConfigured,
  logPayPalError,
  parsePayPalCustomId,
} from "./src/paypal-server";
import { Course, CourseModule, DEFAULT_MODULE_CLASSIFICATION, DEFAULT_STUDENT_LABEL } from "./src/types";
import { UserRole, canAccessAcademicProfile, canAccessApiRoute, canLoginToRequestedRole, normalizeRole } from "./src/rbac";
import { signAuthToken, verifyAuthToken, createRefreshToken, rotateRefreshToken, findValidRefreshToken, revokeRefreshToken, revokeAllUserRefreshTokens } from "./src/auth-token";
import { DEFAULT_LIVE_SUBJECT, buildLiveKitRoomName, getLiveKitConfig, getLiveKitParticipantIdentity } from "./src/livekit";
import { generateProfessorInviteCode, normalizeProfessorInviteCode, parseProfessorInviteCodes } from "./src/invitations";
import {
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  EMAIL_VERIFICATION_TTL_MINUTES,
  buildEmailVerificationExpiry,
  canAttemptEmailVerification,
  generateEmailVerificationCode,
  hashEmailVerificationCode,
  isEmailVerificationExpired,
  normalizeEmailVerificationCode,
} from "./src/email-verification";
import { getEmailErrorDetails, getSmtpPublicConfig, readSmtpBanner, sendAdminTestEmail, sendVerificationEmail, verifySmtpConnection } from "./src/email";
import { buildEmailDeliverySummary } from "./src/email-delivery-summary";
import { prisma, getActivePgSchema, verifyDatabaseConnection } from "./src/db";
import { uploadRouter, deleteCloudFiles } from "./src/uploadthing";
import { ACADEMIC_DOMAINS, DEFAULT_DISCIPLINE_ID, getDisciplineIdForCourse } from "./src/academic-taxonomy";
import { buildCourseGradeRows } from "./src/grades";
import { sanitizeAcademicProfileInput, sanitizeAvatarUrl } from "./src/academic-profile";
import { cacheGet, cacheSet, cacheDel, startCachePruner } from "./src/cache";
import { startPerformanceMonitor, requestTimingMiddleware } from "./src/performance";
import { logSecurity, logAudit, alertFailedLogins, alertMassDeletions, alertSuspectUpload } from "./src/security-logger";
import { decodeStoredText, decodeStoredValue } from "./src/text";
import { shouldSkipStartupSeed } from "./src/startup-seed";
import { PLATFORM_CURRENCY_CODE } from "./src/utils/morocco-locale";
import { patchExpressAsyncRoutes } from "./src/express-async";
import {
  JSON_BODY_LIMIT,
  REFRESH_RATE_LIMIT_MAX,
  REFRESH_RATE_LIMIT_WINDOW_MS,
  CHAT_TUTOR_MAX_HISTORY_MESSAGES,
  CHAT_TUTOR_MAX_PROMPT_CHARS,
} from "./src/security-hardening";

dotenv.config();

const app = express();
patchExpressAsyncRoutes(app);
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === "production";
const AUTH_MAX_ATTEMPTS = Number(process.env.AUTH_MAX_ATTEMPTS) || 20;
const AUTH_LOCKOUT_WINDOW_MS = Number(process.env.AUTH_LOCKOUT_WINDOW_MS) || 1 * 60 * 1000;
const uploadThingCallbackUrl = process.env.UPLOADTHING_CALLBACK_URL || (process.env.APP_URL ? `${process.env.APP_URL}/api/uploadthing` : undefined);
const isUploadThingDevMode = process.env.UPLOADTHING_IS_DEV === "true"
  || process.env.NODE_ENV !== "production"
  || Boolean(uploadThingCallbackUrl?.includes("localhost") || uploadThingCallbackUrl?.includes("127.0.0.1"));

function normalizeOriginUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function buildAllowedOrigins(): Set<string> {
  const origins = new Set<string>();

  if (process.env.APP_URL?.trim()) {
    origins.add(normalizeOriginUrl(process.env.APP_URL));
  }

  if (process.env.ALLOWED_ORIGINS?.trim()) {
    for (const part of process.env.ALLOWED_ORIGINS.split(",")) {
      const normalized = normalizeOriginUrl(part);
      if (normalized) origins.add(normalized);
    }
  }

  if (!isProduction) {
    origins.add(`http://localhost:${PORT}`);
    origins.add(`http://127.0.0.1:${PORT}`);
    origins.add("http://localhost:5173");
    origins.add("http://127.0.0.1:5173");
  }

  return origins;
}

const allowedOrigins = buildAllowedOrigins();

function buildCspConnectSrc(): string[] {
  const connectSrc = [
    "'self'",
    "wss://*.livekit.cloud",
    "https://*.livekit.cloud",
    "https://uploadthing.com",
    "https://*.uploadthing.com",
    "https://ufs.sh",
    "https://*.ufs.sh",
    "https://utfs.io",
    "https://*.utfs.io",
    "https://api-m.sandbox.paypal.com",
    "https://api-m.paypal.com",
    "https://www.paypal.com",
    "https://www.sandbox.paypal.com",
  ];

  if (!isProduction) {
    connectSrc.push(
      "ws://localhost:*",
      "ws://127.0.0.1:*",
      "http://localhost:*",
      "http://127.0.0.1:*",
    );
  }

  for (const origin of allowedOrigins) {
    connectSrc.push(origin);
    if (origin.startsWith("https://")) {
      connectSrc.push(origin.replace(/^https:/, "wss:"));
    }
  }

  return connectSrc;
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: isProduction
          ? ["'self'", "'unsafe-inline'", "https://www.paypal.com", "https://www.sandbox.paypal.com"]
          : ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.paypal.com", "https://www.sandbox.paypal.com"],
        frameSrc: ["'self'", "https://www.paypal.com", "https://www.sandbox.paypal.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https://uploadthing.com", "https://*.uploadthing.com", "https://ufs.sh", "https://*.ufs.sh", "https://utfs.io", "https://*.utfs.io"],
        mediaSrc: ["'self'", "https://uploadthing.com", "https://*.uploadthing.com", "https://ufs.sh", "https://*.ufs.sh", "https://utfs.io", "https://*.utfs.io"],
        connectSrc: buildCspConnectSrc(),
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

app.use((_req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(), payment=(self)");
  next();
});

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(normalizeOriginUrl(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.use(
  "/api/uploadthing",
  createRouteHandler({
    router: uploadRouter,
    config: {
      token: process.env.UPLOADTHING_TOKEN,
      callbackUrl: uploadThingCallbackUrl,
      isDev: isUploadThingDevMode,
      logLevel: process.env.LOG_LEVEL === "debug" ? "Debug" : "Info",
    },
  }),
);

app.use(express.json({ limit: JSON_BODY_LIMIT }));

// ─── Compression gzip ────────────────────────────────────────────────────────
app.use(compression());

// Trust proxy (Nginx / PM2 / Heroku) pour que les IPs soient correctes dans les rate limiters
app.set("trust proxy", 1);

// ─── Rate Limiting ────────────────────────────────────────────────────────────

// Rate limiter global : 5000 requêtes par 15 minutes par IP
const globalRateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de requêtes. Veuillez réessayer dans quelques minutes.", code: "RATE_LIMIT_EXCEEDED" },
  skip: (req) => req.path === "/api/health",
});

// Rate limiter strict pour l'authentification : 20 requêtes par 1 minute par email (compte)
const authRateLimiter = rateLimit({
  windowMs: AUTH_LOCKOUT_WINDOW_MS,
  max: AUTH_MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email;
    return email ? String(email).trim().toLowerCase() : ipKeyGenerator(req.ip || "");
  },
  message: { error: "Trop de tentatives d'authentification (20 maximum). Veuillez patienter 1 minute.", code: "AUTH_RATE_LIMIT_EXCEEDED" },
});

// Rate limiter pour l'envoi / vérification d'emails
const emailVerificationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de demandes de vérification. Veuillez patienter 15 minutes.", code: "EMAIL_RATE_LIMIT_EXCEEDED" },
});

// Rate limiter pour le téléversement de fichiers
const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop d'envois de fichiers. Veuillez patienter 15 minutes.", code: "UPLOAD_RATE_LIMIT_EXCEEDED" },
});

// Rate limiter pour l'obtention de jetons LiveKit
const liveKitRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.LIVEKIT_RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de demandes de connexions live. Veuillez patienter 15 minutes.", code: "LIVEKIT_RATE_LIMIT_EXCEEDED" },
});

// Rate limiter pour l'envoi d'e-mails de diagnostic par l'admin
const emailDiagnosticRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de diagnostics email. Veuillez patienter 15 minutes.", code: "DIAGNOSTIC_RATE_LIMIT_EXCEEDED" },
});

// Rate limiter pour l'assistant IA tuteur
const chatTutorRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.CHAT_TUTOR_RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de questions à l'assistant. Veuillez patienter 15 minutes.", code: "CHAT_TUTOR_RATE_LIMIT_EXCEEDED" },
});

const refreshRateLimiter = rateLimit({
  windowMs: REFRESH_RATE_LIMIT_WINDOW_MS,
  max: REFRESH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip || ""),
  message: { error: "Trop de tentatives de renouvellement de session. Réessayez plus tard.", code: "REFRESH_RATE_LIMIT_EXCEEDED" },
});

app.use("/api", globalRateLimiter);
app.use("/api/auth/login", authRateLimiter);
app.use("/api/auth/register", authRateLimiter);
app.use("/api/auth/refresh", refreshRateLimiter);
app.use("/api/auth/resend-verification-code", emailVerificationRateLimiter);
app.use("/api/auth/verify-email", emailVerificationRateLimiter);
app.use("/api/auth/forgot-password", emailVerificationRateLimiter);
app.use("/api/auth/reset-password", emailVerificationRateLimiter);
app.use("/api/uploadthing", uploadRateLimiter);
app.use("/api/me/avatar", uploadRateLimiter);
app.use("/api/livekit/token", liveKitRateLimiter);
app.use("/api/chat-tutor", chatTutorRateLimiter);
app.use("/api/test-email", emailDiagnosticRateLimiter);

// ─── Monitoring de performance ────────────────────────────────────────────────
app.use("/api", requestTimingMiddleware);

function wrapRouteHandler(handler: any) {
  if (typeof handler !== "function" || handler.length === 4) return handler;
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const result = handler(req, res, next);
      if (result && typeof result.catch === "function") {
        result.catch(next);
      }
      return result;
    } catch (err) {
      next(err);
    }
  };
}

for (const method of ["get", "post", "put", "patch", "delete"] as const) {
  const original = (app as any)[method].bind(app);
  (app as any)[method] = (pathOrRoute: any, ...handlers: any[]) =>
    original(pathOrRoute, ...handlers.map(wrapRouteHandler));
}

function logLiveKit(level: "INFO" | "WARN" | "ERROR", message: string, data?: unknown) {
  console.log(`[${new Date().toISOString()}] [${level}] [livekit] ${message}${data ? " " + JSON.stringify(data) : ""}`);
}

function logInvitation(level: "INFO" | "WARN", message: string, data?: unknown) {
  console.log(`[${new Date().toISOString()}] [${level}] [invitation] ${message}${data ? " " + JSON.stringify(data) : ""}`);
}

function logEmail(level: "INFO" | "WARN" | "ERROR", message: string, data?: unknown) {
  console.log(`[${new Date().toISOString()}] [${level}] [email] ${message}${data ? " " + JSON.stringify(data) : ""}`);
}

function logDb(level: "INFO" | "WARN" | "ERROR", message: string, data?: unknown) {
  console.log(`[${new Date().toISOString()}] [${level}] [db] ${message}${data ? " " + JSON.stringify(data) : ""}`);
}

function isConfiguredEnv(name: string) {
  const value = process.env[name];
  return {
    configured: Boolean(value),
    trimmed: value ? value === value.trim() : true,
  };
}

function logEnvironmentStatus() {
  logDb("INFO", "Environment configuration loaded", {
    NODE_ENV: process.env.NODE_ENV || "development",
    APP_URL: isConfiguredEnv("APP_URL"),
    ALLOWED_ORIGINS: isConfiguredEnv("ALLOWED_ORIGINS"),
    corsOriginCount: allowedOrigins.size,
    DATABASE_URL: isConfiguredEnv("DATABASE_URL"),
    AUTH_TOKEN_SECRET: isConfiguredEnv("AUTH_TOKEN_SECRET"),
    PAYPAL_CLIENT_ID: isConfiguredEnv("PAYPAL_CLIENT_ID"),
    PAYPAL_CLIENT_SECRET: isConfiguredEnv("PAYPAL_CLIENT_SECRET"),
    PAYPAL_ENV: getPayPalRuntimeEnv(),
    LIVEKIT_URL: isConfiguredEnv("LIVEKIT_URL"),
    LIVEKIT_API_KEY: isConfiguredEnv("LIVEKIT_API_KEY"),
    LIVEKIT_API_SECRET: isConfiguredEnv("LIVEKIT_API_SECRET"),
    UPLOADTHING_TOKEN: isConfiguredEnv("UPLOADTHING_TOKEN"),
    UPLOADTHING_IS_DEV: process.env.UPLOADTHING_IS_DEV === "true",
    SMTP_HOST: isConfiguredEnv("SMTP_HOST"),
    SMTP_USER: isConfiguredEnv("SMTP_USER"),
    SMTP_PASS: isConfiguredEnv("SMTP_PASS"),
    GEMINI_API_KEY: isConfiguredEnv("GEMINI_API_KEY"),
  });
  if (isProduction && allowedOrigins.size === 0) {
    logSecurity("WARN", "Production CORS has no allowed origins — set APP_URL and/or ALLOWED_ORIGINS", {});
  }
}

function logApiResponse(req: express.Request, res: express.Response, startedAt: number) {
  if (String(process.env.LOG_LEVEL || "").toLowerCase() !== "debug") return;
  logDb("INFO", "API response", {
    method: req.method,
    path: req.originalUrl,
    status: res.statusCode,
    durationMs: Date.now() - startedAt,
  });
}

app.use("/api", (req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => logApiResponse(req, res, startedAt));
  next();
});

interface CachedUser {
  dbUser: any;
  expiresAt: number;
}
const authUserCache = new Map<string, CachedUser>();

function invalidateAuthUserCache(userId: string) {
  if (authUserCache.delete(userId)) {
    logSecurity("INFO", "Auth user cache invalidated after enrollment update", { userId });
  }
}

const requireAuth: express.RequestHandler = async (req, res, next) => {
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
        include: { enrollments: true },
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
    logSecurity("WARN", "Token user not found or role changed", { userId: session.userId, tokenRole: session.role, actualRole });
    res.status(401).json({ error: "Session invalide" });
    return;
  }
  if (!dbUser.emailVerified) {
    logSecurity("WARN", "Unverified email access denied", { userId: dbUser.id, method: req.method, path: req.path });
    res.status(403).json({ error: "Veuillez vérifier votre e-mail avant d'accéder à l'application", verificationRequired: true, email: dbUser.email });
    return;
  }

  (req as any).authUser = toAppUser(dbUser);
  next();
};

const requireRbac: express.RequestHandler = (req, res, next) => {
  const user = (req as any).authUser as AppUser | undefined;
  if (!user || !canAccessApiRoute(user.role, req.method, req.path)) {
    logSecurity("WARN", "Access denied", { userId: user?.id, role: user?.role, method: req.method, path: req.path });
    res.status(403).json({ error: "Accès refusé pour ce rôle" });
    return;
  }

  logSecurity("INFO", "Access granted", { userId: user.id, role: user.role, method: req.method, path: req.path });
  next();
};

const requireAdmin: express.RequestHandler = (req, res, next) => {
  const user = (req as any).authUser as AppUser | undefined;
  if (!user || user.role !== "ADMIN") {
    logSecurity("WARN", "Admin access denied", { userId: user?.id, role: user?.role, method: req.method, path: req.path });
    res.status(403).json({ error: "Accès administrateur requis" });
    return;
  }

  next();
};

// ─── Seed Data ───────────────────────────────────────────────────────────────

const seedCourses: Course[] = [
  {
    id: 1,
    title: "Algorithmique et Structures de Données",
    level: DEFAULT_MODULE_CLASSIFICATION,
    credits: 6,
    duration: "40 heures",
    category: "Programmation",
    disciplineId: 601,
    price: 160,
    iconName: "Code",
    color: "bg-blue-100",
    instructor: "Équipe académique Axelmond",
    description: "Les fondements de l'informatique. Apprenez à concevoir des algorithmes robustes, efficaces et à utiliser les structures de données majeures (piles, files, arbres binaires et graphes).",
    progress: 45,
    isLiveNow: true,
    liveSubject: DEFAULT_LIVE_SUBJECT,
    modules: [
      { id: 101, title: "Chapitre 1 : Introduction à la complexité algorithmique", type: "video", duration: "45 min", completed: true },
      { id: 1011, title: "Support en synthèse - Notes de Chapitre 1", type: "pdf", duration: "12 pages", completed: true, contentMarkdown: "### Chapitre 1 : Introduction à la Complexité Algorithmique\n\nLa complexité permet d'évaluer la quantité de ressources (temps requis ou mémoire utilisée) nécessaire pour exécuter un algorithme en fonction de la taille $n$ des informations en entrée.\n\n#### 1. Notations Grand-O (Asymptotique)\nLa notation $O(f(n))$ décrit la limite supérieure du pire des cas :\n- **$O(1)$** : Temps Constant. Exemple : Accéder à un élément de tableau par son indice.\n- **$O(\\log n)$** : Temps Logarithmique. Exemple : Recherche dichotomique dans un tableau déjà trié.\n- **$O(n)$** : Temps Linéaire. Exemple : Recherche séquentielle élément par élément.\n- **$O(n \\log n)$** : Tri efficace. Exemple : Tri Fusion (`MergeSort`), Tri Rapide moyen (`QuickSort`).\n- **$O(n^2)$** : Temps Quadratique. Exemple : Boucles imbriquées simples (tri à bulles).\n\n#### 2. Exemple d'Analyse en C\n```c\n// Recherche linéaire : complexité O(n)\nint rechercherElement(int arr[], int size, int cible) {\n    for (int i = 0; i < size; i++) {\n        if (arr[i] == cible) return i;\n    }\n    return -1;\n}\n```\nEn moyenne et au pire, nous devons évaluer $n$ cases mémoire pour localiser notre cible." },
      { id: 1012, title: "Quiz officiel : Calculs de complexité O(n)", type: "quiz", duration: "3 questions", completed: true, score: "2/3" },
      { id: 102, title: "Chapitre 2 : Les tableaux dynamiques et listes chaînées", type: "video", duration: "1h 20 min", completed: false },
      { id: 1021, title: "TD : Implémentation complète de listes chaînées en C", type: "pdf", duration: "4 pages", completed: false, contentMarkdown: "### Travaux Dirigés (TD 1) : Les structures dynamiques\n\n#### Objectif\nManipuler la mémoire manuellement à l'aide des allocateurs en C (`malloc`, `free`).\n\n#### Structure de nœud de liste chaînée simple :\n```c\n#include <stdio.h>\n#include <stdlib.h>\n\ntypedef struct Node {\n    int data;\n    struct Node* next;\n} Node;\n\nNode* createNode(int value) {\n    Node* newNode = (Node*)malloc(sizeof(Node));\n    if (newNode == NULL) {\n        perror(\"Problème d'allocation mémoire !\");\n        exit(1);\n    }\n    newNode->data = value;\n    newNode->next = NULL;\n    return newNode;\n}\n\nvoid freeList(Node* head) {\n    Node* current = head;\n    while (current != NULL) {\n        Node* nextNode = current->next;\n        free(current);\n        current = nextNode;\n    }\n}\n```" },
      { id: 103, title: "Chapitre 3 : Structures de Piles (Stack) et Files (Queue)", type: "video", duration: "55 min", completed: false }
    ]
  },
  {
    id: 2,
    title: "Bases de Données Relationnelles (SQL)",
    level: DEFAULT_MODULE_CLASSIFICATION,
    credits: 4,
    duration: "30 heures",
    category: "Données",
    disciplineId: 603,
    price: 125,
    iconName: "Database",
    color: "bg-emerald-100",
    instructor: "Dr. Sophie Laurent",
    description: "Conception de modèles par entités relationnelles. Maîtrisez l'algèbre relationnelle, la normalisation, et l'art des requêtes SQL complexes.",
    progress: 0,
    isLiveNow: false,
    modules: [
      { id: 201, title: "Chapitre 1 : Modélisation conceptuelle (Modèle Entité-Association & MERISE)", type: "video", duration: "1h 15 min", completed: false },
      { id: 2011, title: "Support en synthèse - Notes de Modélisation", type: "pdf", duration: "5 pages", completed: false, contentMarkdown: "### Modélisation Conceptuelle Merise (MCD)\n\nLe Modèle Conceptuel des Données (MCD) est la représentation graphique des entités et de leurs liaisons sémantiques.\n\n#### 1. Règle d'or de Merise\nChaque entité possède :\n- Un identifiant unique (Ex: `id_etudiant`).\n- Des propriétés décrivant l'entité.\n\nLes relations portent des **cardinalités** minimales et maximales :\n- **0,N** : L'étudiant peut s'inscrire à 0 ou plusieurs modules de l'université.\n- **1,1** : Un abonnement de paiement appartient à précisément 1 étudiant.\n\n#### 2. Passage au Modèle Physique\n- Les cardinalités **(1,1)-(0,N)** déplacent la clé primaire de l'entité \"parent\" comme clé étrangère dans l'entité \"enfant\".\n- Les cardinalités de type **(0,N)-(0,N)** créent une table d'association pivot intermédiaire." },
      { id: 202, title: "Quiz : Algèbre relationnelle et Sélections SQL", type: "quiz", duration: "3 questions", completed: false }
    ]
  },
  {
    id: 3,
    title: "Systèmes d'Exploitation (Linux)",
    level: DEFAULT_MODULE_CLASSIFICATION,
    credits: 5,
    duration: "35 heures",
    category: "Système",
    disciplineId: 604,
    price: 200,
    iconName: "Terminal",
    color: "bg-purple-100",
    instructor: "Équipe académique Axelmond",
    description: "Comprendre le fonctionnement intime du noyau Linux : scheduling de processus, gestion partagée de la mémoire vive et communication POSIX (sémaphores, tuyaux).",
    progress: 100,
    isLiveNow: false,
    modules: [
      { id: 301, title: "Chapitre 1 : Historique, rôles du noyau et architecture interne", type: "video", duration: "45 min", completed: true },
      { id: 302, title: "Chapitre 2 : Ordonnancement de processus, fils d'exécution (pthreads)", type: "video", duration: "2h 30 min", completed: true },
      { id: 3021, title: "Travail Pratique : Programmation des sémaphores d'exclusion mutuelle", type: "pdf", duration: "8 pages", completed: true, contentMarkdown: "### TP : Synchronisation de Processus avec Threads & Mutex\n\nL'exclusion mutuelle permet d'isoler une section critique afin d'éviter les situations de concurrence incontrôlée.\n\n#### Exemple complet d'implémentation d'un Mutex en C :\n```c\n#include <stdio.h>\n#include <pthread.h>\n\nint compteur_global = 0;\npthread_mutex_t verrou;\n\nvoid* incremental(void* arg) {\n    for (int i = 0; i < 10000; i++) {\n        pthread_mutex_lock(&verrou);\n        compteur_global++;\n        pthread_mutex_unlock(&verrou);\n    }\n    return NULL;\n}\n\nint main() {\n    pthread_t thread1, thread2;\n    pthread_mutex_init(&verrou, NULL);\n    pthread_create(&thread1, NULL, incremental, NULL);\n    pthread_create(&thread2, NULL, incremental, NULL);\n    pthread_join(thread1, NULL);\n    pthread_join(thread2, NULL);\n    printf(\"Valeur finale du compteur : %d\\n\", compteur_global);\n    pthread_mutex_destroy(&verrou);\n    return 0;\n}\n```" },
      { id: 303, title: "Quiz d'Évaluation Finale : Concurrence et Sémaphores", type: "quiz", duration: "3 questions", completed: true, score: "3/3" }
    ]
  },
  {
    id: 6,
    title: "Intelligence Artificielle & Machine Learning",
    level: DEFAULT_MODULE_CLASSIFICATION,
    credits: 6,
    duration: "50 heures",
    category: "IA",
    disciplineId: 606,
    price: 250,
    iconName: "Brain",
    color: "bg-pink-100",
    instructor: "Dr. Nadia Rahmani",
    description: "Maîtrisez les concepts pivots de l'apprentissage automatique : descente de gradient, réseaux de neurones denses, convolutions géométriques et architecture Transformers.",
    progress: 10,
    isLiveNow: false,
    modules: [
      { id: 601, title: "Chapitre 1 : Introduction à l'apprentissage supervisé et manipulation de tenseurs", type: "video", duration: "2h 00 min", completed: true },
      { id: 6011, title: "Notes de module : Mathématiques du Deep Learning", type: "pdf", duration: "3 pages", completed: true, contentMarkdown: "### Mathématiques Théoriques du Machine Learning\n\nL'entraînement d'un réseau de neurones artificiels repose sur trois concepts principaux :\n\n1. **La propagation avant (Forward Pass)** : Calcul de la sortie du réseau $y_{pred} = \\sigma(W \\cdot X + b)$.\n2. **Le calcul de la perte (Loss Function)** : Quantification de l'erreur, par exemple l'erreur quadratique moyenne ($MSE$) :\n   $$MSE = \\frac{1}{n} \\sum_{i=1}^{n} (y_i - y_{pred})^2$$\n3. **La rétropropagation du gradient (Backpropagation)** : Calcul de la dérivée partielle de l'erreur par rapport à chaque poids de matrice afin d'ajuster ces derniers par la méthode de la descente de gradient :\n   $$W := W - \\alpha \\frac{\\partial Loss}{\\partial W}$$\n\nOù $\\alpha$ désigne le taux d'apprentissage (_learning rate_)." },
      { id: 602, title: "Chapitre 2 : La classification par régression logistique et réseaux multicouches", type: "video", duration: "2h 30 min", completed: false },
      { id: 6021, title: "Quiz : Descente de gradient et réseaux de neurones", type: "quiz", duration: "3 questions", completed: false }
    ]
  }
];

const seedQuizzes: Record<number, { question: string; options: string[]; answer: string; explanation: string }[]> = {
  1012: [
    { question: "Quelle est la pire complexité temporelle pour le Tri Rapide (QuickSort) dans sa forme la plus standard ?", options: ["O(n log n)", "O(n)", "O(n²)", "O(2^n)"], answer: "O(n²)", explanation: "Si le pivot est choisi de manière constante de façon à découper le tableau à chaque fois en 0 et n-1 éléments (par exemple sur un tableau déjà trié), l'arbre de récursion a une hauteur n, d'où une complexité quadratique O(n²)." },
    { question: "Quel est l'espace mémoire nécessaire pour stocker un tableau dynamique de taille n ?", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: "O(n)", explanation: "Chaque élément prend une place mémoire élémentaire. Pour n éléments, l'espace mémoire est directement proportionnel à n, soit la notation complexité linéaire O(n)." },
    { question: "La recherche dichotomique (Binary Search) suppose quel prérequis majeur sur le tableau ?", options: ["Que tous les éléments soient égaux", "Que le tableau soit déjà trié", "Que la taille soit impaire", "Que les éléments soient tous positifs"], answer: "Que le tableau soit déjà trié", explanation: "La recherche dichotomique se base sur la division par 2 de l'index de recherche selon si l'élément central est plus petit ou plus grand que la cible. Cela n'est mathématiquement valide que si le tableau est pré-trié." }
  ],
  202: [
    { question: "Laquelle de ces syntaxes permet d'éliminer les doublons de lignes dans un SELECT SQL ?", options: ["SELECT DISTINCT", "SELECT UNIQUE", "SELECT REMOVE_DUPLICATES", "SELECT GROUP BY ALL"], answer: "SELECT DISTINCT", explanation: "Le mot-clé standard ANSI SQL est 'SELECT DISTINCT'. Il supprime de l'affichage les doublons stricts basés sur les colonnes projetées." },
    { question: "Quelle est la différence fondamentale entre les clauses WHERE et HAVING ?", options: ["WHERE trie, HAVING regroupe", "WHERE filtre les lignes individuelles avant regroupement, et HAVING filtre les groupes agrégés après GROUP BY", "WHERE s'utilise sur PostgreSQL, HAVING uniquement sur Oracle", "Il n'y a absolument aucune différence"], answer: "WHERE filtre les lignes individuelles avant regroupement, et HAVING filtre les groupes agrégés après GROUP BY", explanation: "WHERE filtre les lignes en entrée du moteur de base de données. HAVING est appliqué comme filtre final sur les valeurs calculées d'agrégation (ex: COUNT, SUM) générées par la clause GROUP BY." },
    { question: "Dans le modèle MERISE, une relation avec les cardinalités (1,1) d'un côté et (0,N) de l'autre engendre structurellement :", options: ["La création d'une table d'association pivot", "La migration de l'identifiant du côté (0,N) comme clé étrangère dans la table liée du côté (1,1)", "Une erreur de modélisation bloquante", "La fusion immédiate des deux tables"], answer: "La migration de l'identifiant du côté (0,N) comme clé étrangère dans la table liée du côté (1,1)", explanation: "Puisque chaque entité du côté (1,1) n'a qu'un et un seul parent, on stocke la clé étrangère directement chez elle de manière à ce que l'intégrité de la liaison soit respectée sans nécessiter de table intermédiaire." }
  ],
  303: [
    { question: "Quel est l'appel système en langage C qui permet de cloner un processus sous Unix/Linux ?", options: ["cloner()", "fork()", "exec()", "spawn()"], answer: "fork()", explanation: "L'appel système de bas niveau sous UNIX pour instancier un processus enfant est fork(). Il renvoie le PID de l'enfant au parent, et 0 à l'enfant." },
    { question: "Quel mécanisme assure qu'un seul fil d'exécution (thread) n'exécute une section critique à la fois ?", options: ["Un bus PCI", "Un Mutex (Exclusion mutuelle)", "Un pointeur de fichier", "Une variable volatile"], answer: "Un Mutex (Exclusion mutuelle)", explanation: "Un verrou mutex de type pthread_mutex_t verrouille l'accès. Le premier thread arrivant obtient le verrou, les autres sont bloqués jusqu'à la libération." },
    { question: "Que fait le planificateur (Scheduler) du noyau Linux ?", options: ["Il trie les fichiers texte par ordre alphabétique", "Il alloue le temps d'utilisation du CPU entre les différents processus prêts", "Il formate les disques en cas d'erreur", "Il gère la vitesse des ventilateurs"], answer: "Il alloue le temps d'utilisation du CPU entre les différents processus prêts", explanation: "L'ordonnanceur (Scheduler) distribue de petites tranches de temps d'utilisation des cœurs processeur physique aux tâches prêtes de manière équitable et selon les priorités (nice levels)." }
  ],
  6021: [
    { question: "Dans la descente de gradient, que représente le paramètre de Learning Rate (ou taux d'apprentissage) ?", options: ["La vitesse de calcul matérielle de votre carte graphique GPU", "La taille du pas de correction appliqué aux poids à chaque itération", "Le nombre total d'images parcourues par seconde", "La précision finale attendue de l'intelligence artificielle"], answer: "La taille du pas de correction appliqué aux poids à chaque itération", explanation: "Le learning rate (souvent noté alpha) définit l'amplitude du pas effectué dans le sens inverse du gradient de la fonction de coût. S'il est trop grand, l'algorithme diverge. S'il est trop petit, l'apprentissage prend un temps infini." },
    { question: "Quelle fonction d'activation s'écrit mathématiquement f(x) = max(0, x) ?", options: ["Sigmoïde", "Tangente Hyperbolique (tanh)", "ReLU (Rectified Linear Unit)", "Softmax"], answer: "ReLU (Rectified Linear Unit)", explanation: "La fonction ReLU renvoie directement $x$ pour toute valeur positive, et 0 sinon. Cela permet d'introduire des non-linéarités tout en évitant le problème de disparition du gradient." },
    { question: "Qu'est-ce qu'une époque (epoch) dans l'apprentissage automatique ?", options: ["La date historique de conception du modèle", "Un balayage complet de l'ensemble des données d'entraînement par l'algorithme", "Le temps d'exécution requis pour compiler le script", "La période d'évaluation d'un stagiaire de recherche"], answer: "Un balayage complet de l'ensemble des données d'entraînement par l'algorithme", explanation: "Une époque désigne le fait que le réseau de neurones a vu et traité une fois l'intégralité du dataset d'entraînement lors de la propagation avant/arrière." }
  ]
};

const quizzes = seedQuizzes;

// ─── Database-backed User Store ──────────────────────────────────────────────

interface AppUser {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  role: UserRole;
  emailVerified: boolean;
  levelOrTitle: string;
  filiere?: string;
  avatarUrl?: string;
  enrolledCourses: number[];
  invoices: { id: string; date: string; courseTitle: string; amount: number; status: string }[];
}

function toDomain(domain: any) {
  return {
    id: domain.id,
    name: domain.name,
    slug: domain.slug,
    iconName: domain.iconName,
    color: domain.color,
    description: domain.description,
    order: domain.order,
    courseCount: domain.courseCount,
    disciplines: Array.isArray(domain.disciplines) ? domain.disciplines.map(toDiscipline) : [],
  };
}

function toDiscipline(discipline: any) {
  return {
    id: discipline.id,
    domainId: discipline.domainId,
    name: decodeStoredText(discipline.name),
    slug: discipline.slug,
    order: discipline.order,
    courseCount: discipline.courseCount,
    domain: discipline.domain ? {
      id: discipline.domain.id,
      name: decodeStoredText(discipline.domain.name),
      slug: discipline.domain.slug,
      iconName: discipline.domain.iconName,
      color: discipline.domain.color,
      description: decodeStoredText(discipline.domain.description),
      order: discipline.domain.order,
    } : undefined,
  };
}

const activeLiveSessionInclude = {
  where: { isActive: true, endTime: null },
  orderBy: { startTime: "asc" },
  take: 1,
} as const;

const courseResponseInclude = {
  discipline: { include: { domain: true } },
  liveSessions: activeLiveSessionInclude,
} as const;

function getLiveStartedAt(course: any) {
  if (!course.isLiveNow) return null;
  const session = Array.isArray(course.liveSessions) ? course.liveSessions[0] : null;
  return session?.startTime ? new Date(session.startTime).toISOString() : null;
}

function toCourse(course: any): Course {
  return {
    id: course.id,
    title: decodeStoredText(course.title),
    level: decodeStoredText(course.level),
    credits: course.credits,
    duration: decodeStoredText(course.duration),
    category: decodeStoredText(course.category),
    disciplineId: course.disciplineId,
    discipline: course.discipline ? toDiscipline(course.discipline) : undefined,
    price: course.price,
    iconName: course.iconName,
    color: course.color,
    instructor: decodeStoredText(course.instructor),
    description: decodeStoredText(course.description),
    progress: course.progress,
    isLiveNow: course.isLiveNow,
    liveSubject: course.liveSubject ? decodeStoredText(course.liveSubject) : undefined,
    liveStartedAt: getLiveStartedAt(course),
    modules: Array.isArray(course.modules) ? decodeStoredValue(course.modules) : [],
    published: course.published,
    createdById: course.createdById || undefined,
  };
}

function toAttachment(attachment: any) {
  return {
    id: attachment.id,
    type: attachment.type,
    fileName: attachment.fileName,
    fileKey: attachment.fileKey,
    url: attachment.url,
    mimeType: attachment.mimeType || undefined,
    size: attachment.size,
  };
}

function toLessonContent(content: any) {
  return {
    id: content.id,
    courseId: content.courseId,
    sectionId: content.sectionId || undefined,
    type: content.type,
    title: content.title,
    body: content.body || undefined,
    published: content.published,
    attachments: Array.isArray(content.attachments) ? content.attachments.map(toAttachment) : [],
  };
}

function buildContentTree(sections: any[]) {
  const nodes = sections.map((section) => ({
    id: section.id,
    courseId: section.courseId,
    chapterId: section.chapterId || undefined,
    parentId: section.parentId || undefined,
    title: section.title,
    description: section.description || undefined,
    order: section.order,
    published: section.published,
    contents: Array.isArray(section.contents) ? section.contents.map(toLessonContent) : [],
    children: [] as any[],
  }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const roots: any[] = [];

  nodes.forEach((node) => {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNode = (node: any) => {
    node.children.sort((a: any, b: any) => a.order - b.order || a.title.localeCompare(b.title));
    node.contents.sort((a: any, b: any) => a.title.localeCompare(b.title));
    node.children.forEach(sortNode);
  };

  roots.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  roots.forEach(sortNode);
  return roots;
}

async function getCourseContentTree(courseId: number, includeDrafts: boolean) {
  const sections = await prisma.contentSection.findMany({
    where: {
      courseId,
      ...(includeDrafts ? {} : { published: true }),
    },
    include: {
      contents: {
        where: includeDrafts ? {} : { published: true },
        include: { attachments: true },
      },
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return buildContentTree(sections);
}

async function getOptionalAuthUser(req: express.Request) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const session = verifyAuthToken(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { enrollments: true },
  });
  const actualRole = normalizeRole(user?.role);
  if (!user || actualRole !== session.role) return null;
  if (!user.emailVerified) return null;
  return toAppUser(user);
}

async function getSectionAndDescendantIds(sectionId: string) {
  const ids = [sectionId];
  let queue = [sectionId];
  while (queue.length > 0) {
    const children = await prisma.contentSection.findMany({
      where: { parentId: { in: queue } },
      select: { id: true },
    });
    queue = children.map((child) => child.id);
    ids.push(...queue);
  }
  return ids;
}

async function deleteContentSectionTree(tx: any, sectionId: string) {
  const sectionIds = await getSectionAndDescendantIds(sectionId);
  const contents = await tx.lessonContent.findMany({
    where: { sectionId: { in: sectionIds } },
    select: { id: true },
  });
  const contentIds = contents.map((content: any) => content.id);

  let fileKeys: string[] = [];
  if (contentIds.length > 0) {
    const attachments = await tx.attachment.findMany({
      where: { contentId: { in: contentIds } },
      select: { fileKey: true }
    });
    fileKeys = attachments.map((a: any) => a.fileKey);
    await tx.attachment.deleteMany({ where: { contentId: { in: contentIds } } });
    await tx.lessonContent.deleteMany({ where: { id: { in: contentIds } } });
  }
  await tx.contentSection.deleteMany({ where: { id: { in: sectionIds } } });
  return { sectionCount: sectionIds.length, contentCount: contentIds.length, fileKeys };
}

function createDefaultStudentInvoices() {
  return [{
    id: `INV-AUTO-${Math.floor(Math.random() * 9000 + 1000)}`,
    date: new Date().toLocaleDateString("fr-FR"),
    courseTitle: "Algorithmique et Structures de Données",
    amount: 15.99,
    status: "Payé"
  }];
}

function toAppUser(user: any): AppUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    emailVerified: Boolean(user.emailVerified),
    levelOrTitle: user.levelOrTitle || (user.role === "STUDENT" ? DEFAULT_STUDENT_LABEL : "Enseignant Docteur"),
    filiere: user.filiere || undefined,
    avatarUrl: user.avatarUrl || undefined,
    enrolledCourses: Array.isArray(user.enrollments) ? user.enrollments.filter((enrollment: any) => enrollment.active).map((enrollment: any) => enrollment.courseId) : [],
    invoices: Array.isArray(user.invoices) ? user.invoices : [],
  };
}

async function ensureAcademicProfileForUser(client: any, user: { id: string; role: UserRole; levelOrTitle?: string | null }) {
  if (!canAccessAcademicProfile(user.role)) return null;
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

function toAcademicProfile(profile: any) {
  return {
    id: profile.id,
    userId: profile.userId,
    title: profile.title || "",
    department: profile.department || "",
    lab: profile.lab || "",
    speciality: profile.speciality || "",
    teachingDomains: Array.isArray(profile.teachingDomains) ? profile.teachingDomains : [],
    researchDomains: Array.isArray(profile.researchDomains) ? profile.researchDomains : [],
    bio: profile.bio || "",
    avatarUrl: profile.avatarUrl || "",
    links: profile.links && typeof profile.links === "object" ? profile.links : {},
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

async function getAcademicProfileResponse(authUser: AppUser) {
  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { academicProfile: true },
  });
  if (!dbUser) return null;
  const profile = dbUser.academicProfile || await ensureAcademicProfileForUser(prisma, dbUser);
  const [courses, lives, publishedContentsCount] = await Promise.all([
    prisma.course.findMany({
      where: {
        OR: [
          { createdById: authUser.id },
          { instructor: dbUser.fullName },
        ],
      },
      select: { id: true, title: true, published: true, liveSubject: true },
      orderBy: { id: "asc" },
    }),
    prisma.liveSession.findMany({
      where: { professorId: authUser.id },
      select: { id: true, roomName: true, courseId: true, isActive: true, startTime: true, endTime: true, course: { select: { title: true } } },
      orderBy: { startTime: "desc" },
      take: 12,
    }),
    prisma.lessonContent.count({
      where: { createdById: authUser.id, published: true },
    }),
  ]);
  return {
    user: {
      id: dbUser.id,
      fullName: dbUser.fullName,
      email: dbUser.email,
      role: dbUser.role,
    },
    profile: toAcademicProfile(profile),
    courses,
    lives: lives.map((live) => ({
      id: live.id,
      roomName: live.roomName,
      courseId: live.courseId,
      active: live.isActive,
      startedAt: live.startTime,
      endedAt: live.endTime,
      course: live.course,
    })),
    publishedContentsCount,
  };
}

function getEmailDomain(email: string) {
  return email.includes("@") ? email.split("@").pop() : "unknown";
}

async function createEmailVerificationCode(client: any, userId: string, code: string) {
  await client.emailVerificationCode.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });
  return client.emailVerificationCode.create({
    data: {
      userId,
      codeHash: hashEmailVerificationCode(code),
      expiresAt: buildEmailVerificationExpiry(),
    },
  });
}

async function recordEmailDeliveryLog(purpose: string, userId: string | null, recipient: string, delivery: any) {
  try {
    await prisma.emailDeliveryLog.create({
      data: {
        userId,
        purpose,
        recipientDomain: getEmailDomain(recipient),
        smtp: (delivery.smtp || getSmtpPublicConfig()) as Prisma.InputJsonValue,
        messageId: delivery.messageId,
        accepted: (delivery.accepted || []) as Prisma.InputJsonValue,
        rejected: (delivery.rejected || []) as Prisma.InputJsonValue,
        envelope: delivery.envelope as Prisma.InputJsonValue,
        response: delivery.response,
        providerStatus: delivery.providerStatus || "UNKNOWN",
      },
    });
  } catch (err) {
    logEmail("WARN", "Email delivery log persistence failed", {
      purpose,
      userId,
      recipientDomain: getEmailDomain(recipient),
      error: getEmailErrorDetails(err),
    });
  }
}

function buildFailedEmailDelivery(recipient: string, response: unknown) {
  return {
    smtp: getSmtpPublicConfig(),
    messageId: null,
    accepted: [],
    rejected: [recipient],
    envelope: {
      from: process.env.SMTP_USER || null,
      to: [recipient],
    },
    response: typeof response === "string" ? response : JSON.stringify(response),
    providerStatus: "FAILED",
  };
}

async function sendEmailVerificationCode(user: { id: string; email: string; fullName: string }) {
  const code = generateEmailVerificationCode();
  if (process.env.NODE_ENV !== "production") {
    console.log(`[DEV] Code de vérification pour ${user.email} : ${code}`);
  }
  await createEmailVerificationCode(prisma, user.id, code);
  try {
    const delivery = await sendVerificationEmail({
      to: user.email,
      fullName: user.fullName,
      code,
      expiresInMinutes: EMAIL_VERIFICATION_TTL_MINUTES,
    });
    logEmail(delivery.sent ? "INFO" : "WARN", delivery.sent ? "Verification email sent" : "SMTP not configured for verification email", {
      userId: user.id,
      emailDomain: getEmailDomain(user.email),
      delivery: delivery.sent ? delivery.delivery : undefined,
    });
    if (!delivery.sent) {
      await recordEmailDeliveryLog("email_verification", user.id, user.email, buildFailedEmailDelivery(user.email, delivery.reason));
    }
    if (delivery.sent) {
      await recordEmailDeliveryLog("email_verification", user.id, user.email, delivery.delivery);
    }
    return delivery;
  } catch (err) {
    logEmail("ERROR", "Verification email send failed", {
      userId: user.id,
      emailDomain: getEmailDomain(user.email),
      smtp: getSmtpPublicConfig(),
      error: getEmailErrorDetails(err),
    });
    await recordEmailDeliveryLog("email_verification", user.id, user.email, buildFailedEmailDelivery(user.email, getEmailErrorDetails(err)));
    return { sent: false, reason: "SMTP_SEND_FAILED" as const };
  }
}

function professorInviteSnapshot(invite: any) {
  return {
    code: invite.code,
    createdAt: invite.createdAt?.toISOString?.() || invite.createdAt,
    usedBy: invite.usedBy?.email,
    usedAt: invite.usedAt?.toISOString?.() || invite.usedAt,
    revokedAt: invite.revokedAt?.toISOString?.() || invite.revokedAt,
  };
}

function emailDeliveryLogSnapshot(log: any) {
  const envelope = log.envelope || {};
  return {
    id: log.id,
    purpose: log.purpose,
    to: Array.isArray(envelope.to) ? envelope.to : log.accepted,
    envelopeFrom: envelope.from || null,
    envelopeTo: envelope.to || null,
    messageId: log.messageId,
    accepted: log.accepted,
    rejected: log.rejected,
    response: log.response,
    providerStatus: log.providerStatus,
    createdAt: log.createdAt?.toISOString?.() || log.createdAt,
  };
}

async function findCourse(courseId: number) {
  const course = await prisma.course.findUnique({ where: { id: courseId }, include: courseResponseInclude });
  return course ? toCourse(course) : null;
}

async function ensureLiveSession(course: Course, authUser: AppUser) {
  const roomName = buildLiveKitRoomName(course.id);
  const session = await prisma.liveSession.upsert({
    where: { roomName },
    update: {
      title: course.liveSubject || null,
      isActive: true,
      endTime: null,
      professorId: authUser.role === "STUDENT" ? undefined : authUser.id,
    },
    create: {
      roomName,
      title: course.liveSubject || null,
      courseId: course.id,
      professorId: authUser.role === "STUDENT" ? undefined : authUser.id,
    },
  });
  logLiveKit("INFO", "Live session ensured", { courseId: course.id, roomName, startedAt: session.startTime.toISOString(), isActive: session.isActive });
  return session;
}

function getLiveKitApiUrl(url: string) {
  return url.trim().replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");
}

function getLiveKitRoomService(config: { url: string; apiKey: string; apiSecret: string }) {
  return new RoomServiceClient(getLiveKitApiUrl(config.url), config.apiKey, config.apiSecret);
}

async function recordLiveAction(params: {
  sessionId?: string | null;
  roomName: string;
  actor?: AppUser;
  action: string;
  targetIdentity?: string | null;
  targetName?: string | null;
  details?: Record<string, unknown>;
}) {
  await prisma.liveActionLog.create({
    data: {
      sessionId: params.sessionId || null,
      roomName: params.roomName,
      actorId: params.actor?.id || null,
      actorRole: params.actor?.role || null,
      action: params.action,
      targetIdentity: params.targetIdentity || null,
      targetName: params.targetName || null,
      details: (params.details || {}) as Prisma.InputJsonValue,
    },
  });
}

async function recordLiveAttendanceJoin(session: { id: string; roomName: string }, authUser: AppUser) {
  const active = await prisma.liveAttendance.findFirst({
    where: { sessionId: session.id, userId: authUser.id, leftAt: null },
    orderBy: { joinedAt: "desc" },
  });
  if (active) {
    await prisma.liveAttendance.update({
      where: { id: active.id },
      data: { lastSeenAt: new Date(), role: authUser.role },
    });
    return active;
  }
  const attendance = await prisma.liveAttendance.create({
    data: {
      sessionId: session.id,
      roomName: session.roomName,
      userId: authUser.id,
      role: authUser.role,
    },
  });
  await recordLiveAction({ sessionId: session.id, roomName: session.roomName, actor: authUser, action: "JOIN" });
  logLiveKit("INFO", "Attendance join recorded", { roomName: session.roomName, userId: authUser.id, role: authUser.role });
  return attendance;
}

async function recordLiveAttendanceLeave(session: { id: string; roomName: string }, authUser: AppUser) {
  const active = await prisma.liveAttendance.findFirst({
    where: { sessionId: session.id, userId: authUser.id, leftAt: null },
    orderBy: { joinedAt: "desc" },
  });
  if (!active) return null;
  const leftAt = new Date();
  const durationSeconds = Math.max(0, Math.round((leftAt.getTime() - active.joinedAt.getTime()) / 1000));
  const updated = await prisma.liveAttendance.update({
    where: { id: active.id },
    data: { leftAt, lastSeenAt: leftAt, durationSeconds },
  });
  await recordLiveAction({ sessionId: session.id, roomName: session.roomName, actor: authUser, action: "LEAVE", details: { durationSeconds } });
  logLiveKit("INFO", "Attendance leave recorded", { roomName: session.roomName, userId: authUser.id, durationSeconds });
  return updated;
}

async function assertLiveAccess(authUser: AppUser, courseId: number) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, createdById: true }
  });
  if (!course) return { ok: false as const, status: 404, error: "Course not found" };
  if (authUser.role === "STUDENT" && !authUser.enrolledCourses.includes(course.id)) {
    return { ok: false as const, status: 403, error: "Inscription requise pour rejoindre ce live" };
  }
  if ((authUser.role === "PROFESSOR" || authUser.role === "RESEARCHER") && course.createdById !== authUser.id) {
    logLiveKit("WARN", "Live access denied for foreign course", { userId: authUser.id, courseId });
    return { ok: false as const, status: 403, error: "Accès refusé pour ce live" };
  }

  const fullCourse = await findCourse(courseId);
  if (!fullCourse) return { ok: false as const, status: 404, error: "Course not found" };
  return { ok: true as const, course: fullCourse };
}

async function findQuizWithQuestions(courseId: number, moduleId: number) {
  return prisma.quiz.findFirst({
    where: { courseId, moduleId },
    include: { questions: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
}

function canReadCourseGrades(authUser: AppUser, course: { id: number; createdById?: string | null }) {
  if (authUser.role === "ADMIN") return true;
  if (authUser.role === "STUDENT") return authUser.enrolledCourses.includes(course.id);
  // PROFESSOR/RESEARCHER : uniquement le propriétaire du module
  return course.createdById === authUser.id;
}

async function seedDatabase() {
  if (shouldSkipStartupSeed()) {
    logDb("INFO", "Startup seed skipped", {
      nodeEnv: process.env.NODE_ENV || "development",
      runStartupSeed: process.env.RUN_STARTUP_SEED || "(unset)",
    });
    return;
  }

  for (const domain of ACADEMIC_DOMAINS) {
    await prisma.facultyDomain.upsert({
      where: { id: domain.id },
      update: {
        name: domain.name,
        slug: domain.slug,
        iconName: domain.iconName,
        color: domain.color,
        description: domain.description,
        order: domain.order,
      },
      create: {
        id: domain.id,
        name: domain.name,
        slug: domain.slug,
        iconName: domain.iconName,
        color: domain.color,
        description: domain.description,
        order: domain.order,
      },
    });
    for (const discipline of domain.disciplines) {
      await prisma.discipline.upsert({
        where: { id: discipline.id },
        update: {
          domainId: domain.id,
          name: discipline.name,
          slug: discipline.slug,
          order: discipline.order,
        },
        create: {
          id: discipline.id,
          domainId: domain.id,
          name: discipline.name,
          slug: discipline.slug,
          order: discipline.order,
        },
      });
    }
  }

  for (const course of seedCourses) {
    const disciplineId = course.disciplineId || getDisciplineIdForCourse(course);
    await prisma.course.upsert({
      where: { id: course.id },
      update: {
        title: course.title,
        level: course.level,
        credits: course.credits,
        duration: course.duration,
        category: course.category,
        disciplineId,
        iconName: course.iconName,
        color: course.color,
        instructor: course.instructor,
        description: course.description,
      },
      create: {
        id: course.id,
        title: course.title,
        level: course.level,
        credits: course.credits,
        duration: course.duration,
        category: course.category,
        disciplineId,
        price: course.price,
        iconName: course.iconName,
        color: course.color,
        instructor: course.instructor,
        description: course.description,
        progress: course.progress,
        isLiveNow: course.isLiveNow,
        liveSubject: course.liveSubject,
        modules: course.modules as unknown as Prisma.InputJsonValue,
      },
    });
  }

  for (const course of seedCourses) {
    for (const module of course.modules.filter((module) => module.type === "quiz")) {
      const questions = seedQuizzes[module.id];
      if (!questions?.length) continue;

      const existingQuiz = await prisma.quiz.findFirst({
        where: { courseId: course.id, moduleId: module.id },
        orderBy: { createdAt: "asc" },
      });
      const quiz = existingQuiz
        ? await prisma.quiz.update({ where: { id: existingQuiz.id }, data: { title: module.title } })
        : await prisma.quiz.create({
          data: {
            courseId: course.id,
            moduleId: module.id,
            title: module.title,
            published: true,
          },
        });
      await prisma.quizQuestion.deleteMany({ where: { quizId: quiz.id } });
      await prisma.quizQuestion.createMany({
        data: questions.map((question, index) => ({
          quizId: quiz.id,
          question: question.question,
          options: question.options as unknown as Prisma.InputJsonValue,
          answer: question.answer,
          explanation: question.explanation,
          order: index,
        })),
      });
    }
  }

  const inviteCodes = parseProfessorInviteCodes(process.env.PROFESSOR_INVITE_CODES);
  for (const code of inviteCodes) {
    await prisma.professorInviteCode.upsert({
      where: { code },
      update: {},
      create: { code },
    });
  }

  const availableProfessorInviteCodes = await prisma.professorInviteCode.count({
    where: { usedAt: null, revokedAt: null },
  });

  const academicUsers = await prisma.user.findMany({
    where: { role: { in: ["PROFESSOR", "RESEARCHER", "ADMIN"] } },
    select: { id: true, role: true, levelOrTitle: true },
  });
  for (const user of academicUsers) {
    await ensureAcademicProfileForUser(prisma, user);
  }

  logDb("INFO", "Database seed synchronized", {
    courses: seedCourses.length,
    domains: ACADEMIC_DOMAINS.length,
    disciplines: ACADEMIC_DOMAINS.reduce((sum, domain) => sum + domain.disciplines.length, 0),
    professorInviteCodes: inviteCodes.length,
    availableProfessorInviteCodes,
    academicProfiles: academicUsers.length,
  });
}

async function synchronizePostgresSequences() {
  const targetSchema = getActivePgSchema();
  const tables = await prisma.$queryRaw<Array<{ table_schema: string }>>`
    SELECT table_schema
    FROM information_schema.tables
    WHERE table_name = 'Course'
      AND table_schema = ${targetSchema}
      AND table_type = 'BASE TABLE'
    LIMIT 1
  `;
  const tableSchema = tables[0]?.table_schema;
  if (!tableSchema) {
    logDb("WARN", "Course table not found while synchronizing PostgreSQL sequences");
    return;
  }
  const quotedSchema = `"${tableSchema.replace(/"/g, '""')}"`;
  const qualifiedCourseTable = `${quotedSchema}."Course"`;
  const sequenceLookup = qualifiedCourseTable.replace(/'/g, "''");
  const result = await prisma.$queryRawUnsafe<Array<{ last_value: bigint | number }>>(
    `SELECT setval(pg_get_serial_sequence('${sequenceLookup}', 'id'), COALESCE((SELECT MAX("id") FROM ${qualifiedCourseTable}), 1), true) AS last_value`,
  );
  logDb("INFO", "PostgreSQL sequences synchronized", { courseIdSequence: String(result[0]?.last_value || "") });
}

// ─── Input Validation & Sanitization ─────────────────────────────────────────

function sanitizeInputText(text: string): string {
  if (typeof text !== "string") return text;
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return sanitizeInputText(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj === "object") {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      if (
        key === "password" ||
        key === "newPassword" ||
        key === "currentPassword" ||
        key === "answers" ||
        key === "token" ||
        key === "avatarUrl" ||
        key === "url"
      ) {
        res[key] = obj[key];
      } else {
        res[key] = sanitizeObject(obj[key]);
      }
    }
    return res;
  }
  return obj;
}

function validateBody(schema: z.ZodType<any>) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    req.body = sanitizeObject(req.body);
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Données d'entrée invalides",
        details: result.error.issues.map(e => ({ field: e.path.join("."), message: e.message })),
        code: "VALIDATION_ERROR",
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

const registerSchema = z.object({
  email: z.string().email("Adresse email invalide").trim().toLowerCase().max(255),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères").max(128),
  fullName: z.string().min(2, "Le nom complet doit contenir au moins 2 caractères").max(100).trim(),
  role: z.enum(["STUDENT", "PROFESSOR", "RESEARCHER", "ADMIN"]),
  levelOrTitle: z.string().max(100).trim().optional().nullable(),
  filiere: z.string().max(100).trim().optional().nullable(),
  professorInviteCode: z.string().max(50).trim().optional().nullable(),
});

const loginSchema = z.object({
  email: z.string().email("Adresse email invalide").trim().toLowerCase(),
  password: z.string().min(1, "Mot de passe requis"),
  role: z.enum(["STUDENT", "PROFESSOR", "RESEARCHER", "ADMIN"]),
});

const verifyEmailSchema = z.object({
  email: z.string().email("Adresse email invalide").trim().toLowerCase(),
  code: z.string().length(6, "Le code doit contenir 6 chiffres").regex(/^\d+$/, "Le code doit être numérique"),
});

const resendEmailSchema = z.object({
  email: z.string().email("Adresse email invalide").trim().toLowerCase(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Adresse email invalide").trim().toLowerCase(),
});

const resetPasswordSchema = z.object({
  email: z.string().email("Adresse email invalide").trim().toLowerCase(),
  code: z.string().length(6, "Le code doit contenir 6 chiffres").regex(/^\d+$/, "Le code doit être numérique"),
  newPassword: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

const chatTutorSchema = z.object({
  prompt: z.string().min(1, "Question requise").max(CHAT_TUTOR_MAX_PROMPT_CHARS).trim(),
  courseContext: z.string().max(200).trim().optional(),
  moduleContext: z.string().max(200).trim().optional(),
  chatHistory: z.array(z.object({
    role: z.enum(["user", "model", "assistant"]),
    text: z.string().max(CHAT_TUTOR_MAX_PROMPT_CHARS),
  })).max(CHAT_TUTOR_MAX_HISTORY_MESSAGES).optional(),
});

const PASSWORD_RESET_GENERIC_MESSAGE = "Si un compte Axelmond Research Labs existe pour cette adresse, un code de réinitialisation a été envoyé.";

const courseSchema = z.object({
  title: z.string().min(2, "Le titre est requis").max(200).trim(),
  level: z.string().min(2).max(50).trim().optional().default(DEFAULT_MODULE_CLASSIFICATION),
  credits: z.number().int().min(0),
  duration: z.string().min(2).max(50).trim(),
  category: z.string().max(100).trim().optional().nullable(),
  disciplineId: z.number().int().positive(),
  price: z.number().nonnegative(),
  instructor: z.string().max(100).trim().optional().nullable(),
  description: z.string().min(5, "La description est requise").max(2000).trim(),
  published: z.boolean().default(false),
});

const coursePatchSchema = z.object({
  price: z.number().nonnegative().optional(),
  isLiveNow: z.boolean().optional(),
  liveSubject: z.string().max(200).trim().optional().nullable(),
  published: z.boolean().optional(),
});

const contactSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100).trim(),
  email: z.string().email("Adresse email invalide").trim().toLowerCase(),
  subject: z.string().min(3, "Le sujet doit contenir au moins 3 caractères").max(200).trim(),
  category: z.string().min(2, "La catégorie est requise").max(100).trim(),
  message: z.string().min(10, "Le message doit contenir au moins 10 caractères").max(5000).trim(),
});

const supportTicketSchema = z.object({
  subject: z.string().min(3, "Le sujet doit contenir au moins 3 caractères").max(200).trim(),
  category: z.string().min(2, "La catégorie est requise").max(100).trim(),
  description: z.string().min(10, "La description doit contenir au moins 10 caractères").max(5000).trim(),
  screenshotUrl: z.string().url("URL de capture d'écran invalide").trim().optional().nullable(),
});

const chapterSchema = z.object({
  title: z.string().min(2, "Le titre est requis").max(200).trim(),
  description: z.string().max(1000).trim().optional().nullable(),
  published: z.boolean().default(false),
  order: z.number().int().optional(),
});

const chapterPatchSchema = z.object({
  published: z.boolean(),
});

const sectionSchema = z.object({
  title: z.string().min(2, "Le titre est requis").max(200).trim(),
  description: z.string().max(1000).trim().optional().nullable(),
  parentId: z.string().trim().optional().nullable(),
  chapterId: z.string().trim().optional().nullable(),
  published: z.boolean().default(false),
});

const sectionPatchSchema = z.object({
  title: z.string().min(2).max(200).trim().optional(),
  description: z.string().max(1000).trim().optional().nullable(),
  published: z.boolean().optional(),
  order: z.number().int().optional(),
});

const textContentSchema = z.object({
  title: z.string().min(2, "Le titre est requis").max(200).trim(),
  body: z.string().min(1, "Le contenu est requis").max(20000).trim(),
  published: z.boolean().default(false),
});

const textContentPatchSchema = z.object({
  title: z.string().min(2).max(200).trim().optional(),
  body: z.string().max(20000).trim().optional().nullable(),
  published: z.boolean().optional(),
});

const quizSchema = z.object({
  moduleId: z.number().int().positive().optional().nullable(),
  sectionId: z.string().trim().optional().nullable(),
  title: z.string().min(2).max(200).trim(),
  published: z.boolean().default(false),
});

const quizPatchSchema = z.object({
  title: z.string().min(2).max(200).trim().optional(),
  published: z.boolean().optional(),
});

const quizQuestionSchema = z.object({
  question: z.string().min(2).max(500).trim(),
  options: z.array(z.string().min(1).max(200).trim()).min(2).max(10),
  answer: z.string().min(1).trim(),
  explanation: z.string().min(2).max(1000).trim(),
});

const quizAttemptSchema = z.object({
  answers: z.record(z.string(), z.string().trim()),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: z.string().min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères"),
});

const academicProfileSchema = z.object({
  title: z.string().max(100).trim().optional().nullable(),
  department: z.string().max(100).trim().optional().nullable(),
  lab: z.string().max(100).trim().optional().nullable(),
  speciality: z.string().max(100).trim().optional().nullable(),
  teachingDomains: z.array(z.string()).optional(),
  researchDomains: z.array(z.string()).optional(),
  bio: z.string().max(2000).trim().optional().nullable(),
  avatarUrl: z.string().url().or(z.literal("")).optional().nullable(),
  links: z.record(z.string(), z.string().url().or(z.literal(""))).optional(),
});

const liveMessageSchema = z.object({
  courseId: z.number().int().positive(),
  messageId: z.string().trim().optional(),
  text: z.string().min(1).max(1000).trim(),
});

const liveEventSchema = z.object({
  courseId: z.number().int().positive(),
  action: z.enum(["RAISE_HAND", "LOWER_HAND", "REACTION", "QUESTION", "RESOURCE_SHARE", "WHITEBOARD_UPDATE", "RECORDING_REQUESTED", "RECORDING_STOPPED"]),
  targetIdentity: z.string().max(200).trim().optional().nullable(),
  targetName: z.string().max(200).trim().optional().nullable(),
  details: z.record(z.string(), z.any()).optional(),
});

const liveModerationSchema = z.object({
  courseId: z.number().int().positive(),
  action: z.enum(["MUTE_AUDIO", "MUTE_VIDEO", "REMOVE_PARTICIPANT", "GRANT_SPEECH", "REVOKE_SPEECH"]),
  targetIdentity: z.string().min(1).max(200).trim(),
  targetName: z.string().max(200).trim().optional().nullable(),
  trackSid: z.string().max(200).trim().optional().nullable(),
});

const liveAttendanceLeaveSchema = z.object({
  courseId: z.number().int().positive(),
});

const syncUserSchema = z.object({
  id: z.string().trim(),
  enrolledCourses: z.array(z.number().int().positive()).optional(),
  invoices: z.array(z.any()).optional(),
});

// ─── Resource Ownership Verification Helpers ──────────────────────────────────

async function verifyCourseAccess(authUser: AppUser, courseId: number): Promise<boolean> {
  if (authUser.role === "ADMIN") return true;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return false;
  return course.createdById === authUser.id;
}

async function verifyChapterAccess(authUser: AppUser, chapterId: string): Promise<boolean> {
  if (authUser.role === "ADMIN") return true;
  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter) return false;
  return verifyCourseAccess(authUser, chapter.courseId);
}

async function verifySectionAccess(authUser: AppUser, sectionId: string): Promise<boolean> {
  if (authUser.role === "ADMIN") return true;
  const section = await prisma.contentSection.findUnique({ where: { id: sectionId } });
  if (!section) return false;
  return verifyCourseAccess(authUser, section.courseId);
}

async function verifyContentAccess(authUser: AppUser, contentId: string): Promise<boolean> {
  if (authUser.role === "ADMIN") return true;
  const content = await prisma.lessonContent.findUnique({ where: { id: contentId } });
  if (!content) return false;
  return verifyCourseAccess(authUser, content.courseId);
}

async function verifyQuizAccess(authUser: AppUser, quizId: string): Promise<boolean> {
  if (authUser.role === "ADMIN") return true;
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) return false;
  return verifyCourseAccess(authUser, quiz.courseId);
}

async function verifyQuizQuestionAccess(authUser: AppUser, questionId: string): Promise<boolean> {
  if (authUser.role === "ADMIN") return true;
  const question = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    include: { quiz: true },
  });
  if (!question || !question.quiz) return false;
  return verifyCourseAccess(authUser, question.quiz.courseId);
}

// ─── API Routes ──────────────────────────────────────────────────────────────

// GET /api/domains
app.get("/api/domains", async (req, res) => {
  const authUser = await getOptionalAuthUser(req);
  // Cache uniquement pour les visiteurs anonymes/étudiants (données publiées)
  const cacheKey = authUser && authUser.role !== "STUDENT" ? null : "api:domains:public";
  if (cacheKey) {
    const cached = await cacheGet(cacheKey);
    if (cached) { res.json(JSON.parse(cached)); return; }
  }

  const courseWhere = authUser?.role === "ADMIN"
    ? {}
    : authUser && (authUser.role === "PROFESSOR" || authUser.role === "RESEARCHER")
      ? { createdById: authUser.id }
      : { published: true };
  const [domains, courseCounts] = await Promise.all([
    prisma.facultyDomain.findMany({
      include: { disciplines: { orderBy: { order: "asc" } } },
      orderBy: { order: "asc" },
    }),
    prisma.course.groupBy({
      by: ["disciplineId"],
      where: courseWhere,
      _count: { _all: true },
    }),
  ]);
  const countsByDiscipline = new Map(courseCounts.map((count) => [count.disciplineId, count._count._all]));

  const payload = domains.map((domain) => {
    const disciplines = domain.disciplines.map((discipline) => ({
      ...discipline,
      courseCount: countsByDiscipline.get(discipline.id) || 0,
    }));
    return toDomain({
      ...domain,
      courseCount: disciplines.reduce((sum, discipline) => sum + discipline.courseCount, 0),
      disciplines,
    });
  });
  logDb("INFO", "Academic domains listed", { userId: authUser?.id, domains: payload.length });
  if (cacheKey) await cacheSet(cacheKey, JSON.stringify(payload), Number(process.env.CACHE_TTL_SECONDS) || 60);
  res.json(payload);
});

// GET /api/courses
app.get("/api/courses", async (req, res) => {
  const authUser = await getOptionalAuthUser(req);
  const domainId = Number(req.query.domainId) || 0;
  const disciplineId = Number(req.query.disciplineId) || 0;
  // Cache uniquement pour visiteurs anonymes/étudiants, clé incluant les filtres
  const cacheKey = authUser && authUser.role !== "STUDENT"
    ? null
    : `api:courses:public:d=${domainId}:dis=${disciplineId}`;
  if (cacheKey) {
    const cached = await cacheGet(cacheKey);
    if (cached) { res.json(JSON.parse(cached)); return; }
  }

  const where: any = authUser?.role === "ADMIN"
    ? {}
    : authUser && (authUser.role === "PROFESSOR" || authUser.role === "RESEARCHER")
      ? { createdById: authUser.id }
      : { published: true };
  if (Number.isInteger(disciplineId) && disciplineId > 0) {
    where.disciplineId = disciplineId;
  } else if (Number.isInteger(domainId) && domainId > 0) {
    const disciplineIds = await prisma.discipline.findMany({
      where: { domainId },
      select: { id: true },
    });
    where.disciplineId = { in: disciplineIds.map((discipline) => discipline.id) };
  }
  const courses = await prisma.course.findMany({
    where,
    include: courseResponseInclude,
    orderBy: { id: "asc" },
  });
  const payload = courses.map(toCourse);
  logDb("INFO", "Academic modules listed", {
    userId: authUser?.id,
    role: authUser?.role || "PUBLIC",
    ownershipScope: authUser && (authUser.role === "PROFESSOR" || authUser.role === "RESEARCHER") ? "OWN_MODULES_ONLY" : "DEFAULT",
    count: payload.length,
  });
  if (cacheKey) await cacheSet(cacheKey, JSON.stringify(payload), Number(process.env.CACHE_TTL_SECONDS) || 60);
  res.json(payload);
});

// POST /api/courses (Teacher creates a real persisted course)
app.post("/api/courses", requireAuth, requireRbac, validateBody(courseSchema), async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const { title, credits, duration, category, disciplineId, price, instructor, description, published } = req.body;

  const discipline = await prisma.discipline.findUnique({ where: { id: Number(disciplineId) } });
  if (!discipline) {
    res.status(400).json({ error: "Discipline académique invalide" });
    return;
  }

  const course = await prisma.course.create({
    data: {
      title,
      level: DEFAULT_MODULE_CLASSIFICATION,
      credits,
      duration,
      category: category || discipline.name,
      disciplineId: discipline.id,
      price,
      iconName: "Code",
      color: "bg-blue-100",
      instructor: instructor || authUser.fullName,
      description,
      progress: 0,
      isLiveNow: false,
      modules: [],
      published,
      createdById: authUser.id,
    },
    include: courseResponseInclude,
  });

  await logAudit(authUser.id, authUser.email, "CREATE_COURSE", "Course", String(course.id), { title: course.title }, req.ip);
  logDb("INFO", "Course created", { courseId: course.id, userId: authUser.id, disciplineId: course.disciplineId, published: course.published });
  // Invalidation du cache public (le nouveau module doit apparaître immédiatement)
  await cacheDel("api:domains:public");
  await cacheDel(`api:courses:public:d=0:dis=0`);
  res.status(201).json(toCourse(course));
});

// GET /api/courses/:id
app.get("/api/courses/:id", async (req, res) => {
  const authUser = await getOptionalAuthUser(req);
  const course = await prisma.course.findUnique({ where: { id: parseInt(req.params.id) }, include: courseResponseInclude });
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  if (!course.published) {
    if (!authUser || authUser.role === "STUDENT") {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    if (!(await verifyCourseAccess(authUser, course.id))) {
      res.status(403).json({ error: "Accès refusé pour consulter ce module" });
      return;
    }
  }
  res.json(toCourse(course));
});

// GET /api/courses/:id/content
app.get("/api/courses/:id/content", requireAuth, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const courseId = parseInt(req.params.id);
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }

  if (authUser.role === "STUDENT" && !authUser.enrolledCourses.includes(courseId)) {
    res.status(403).json({ error: "Inscription requise pour consulter ce contenu" });
    return;
  }
  if (authUser.role !== "STUDENT" && !(await verifyCourseAccess(authUser, courseId))) {
    res.status(403).json({ error: "Accès refusé pour consulter ce module" });
    return;
  }

  const includeDrafts = authUser.role !== "STUDENT";
  res.json(await getCourseContentTree(courseId, includeDrafts));
});

// GET /api/courses/:courseId/module-contents
app.get("/api/courses/:courseId/module-contents", requireAuth, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const courseId = parseInt(req.params.courseId);
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) { res.status(404).json({ error: "Module introuvable" }); return; }
  if (authUser.role === "STUDENT" && !authUser.enrolledCourses.includes(courseId)) {
    res.status(403).json({ error: "Inscription requise pour consulter ce contenu" });
    return;
  }
  if (authUser.role !== "STUDENT" && !(await verifyCourseAccess(authUser, courseId))) {
    res.status(403).json({ error: "Accès refusé pour consulter ce module" });
    return;
  }

  const includeDrafts = authUser.role !== "STUDENT";
  const contents = await prisma.lessonContent.findMany({
    where: {
      courseId,
      sectionId: null,
      ...(includeDrafts ? {} : { published: true }),
    },
    include: { attachments: true },
    orderBy: [{ createdAt: "asc" }],
  });

  res.json(contents.map(toLessonContent));
});

// POST /api/courses/:courseId/chapters
app.post("/api/courses/:courseId/chapters", requireAuth, requireRbac, validateBody(chapterSchema), async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const courseId = parseInt(req.params.courseId);
  if (!(await verifyCourseAccess(authUser, courseId))) {
    res.status(403).json({ error: "Accès refusé pour modifier ce module" });
    return;
  }
  const { title, description, published } = req.body;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }

  const order = await prisma.chapter.count({ where: { courseId } });
  const result = await prisma.$transaction(async (tx) => {
    const chapter = await tx.chapter.create({
      data: {
        courseId,
        title: title.trim(),
        description: typeof description === "string" ? description.trim() || null : null,
        order,
        published: Boolean(published),
        createdById: authUser.id,
      },
    });
    const section = await tx.contentSection.create({
      data: {
        courseId,
        chapterId: chapter.id,
        title: chapter.title,
        description: chapter.description,
        order,
        published: chapter.published,
        createdById: authUser.id,
      },
    });
    return { chapter, section };
  });

  logDb("INFO", "Chapter created", { courseId, chapterId: result.chapter.id, sectionId: result.section.id, userId: authUser.id });
  res.status(201).json(result);
});

// GET /api/courses/:courseId/chapters
app.get("/api/courses/:courseId/chapters", requireAuth, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const courseId = parseInt(req.params.courseId);
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  if (authUser.role === "STUDENT" && !authUser.enrolledCourses.includes(courseId)) {
    res.status(403).json({ error: "Inscription requise pour consulter ces chapitres" });
    return;
  }
  if (authUser.role !== "STUDENT" && !(await verifyCourseAccess(authUser, courseId))) {
    res.status(403).json({ error: "Accès refusé pour consulter ces chapitres" });
    return;
  }

  const includeDrafts = authUser.role !== "STUDENT";
  const chapters = await prisma.chapter.findMany({
    where: { courseId, ...(includeDrafts ? {} : { published: true }) },
    include: {
      sections: {
        where: includeDrafts ? { parentId: null } : { parentId: null, published: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  res.json(chapters);
});

// PUT /api/chapters/:id
app.put("/api/chapters/:id", requireAuth, requireRbac, validateBody(chapterSchema.partial()), async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  if (!(await verifyChapterAccess(authUser, req.params.id))) {
    res.status(403).json({ error: "Accès refusé pour modifier ce chapitre" });
    return;
  }
  const { title, description, published, order } = req.body;
  const data: any = {};
  if (typeof title === "string" && title.trim()) data.title = title.trim();
  if (typeof description === "string" || description === null) data.description = description?.trim() || null;
  if (typeof published === "boolean") data.published = published;
  if (typeof order === "number") data.order = order;

  const result = await prisma.$transaction(async (tx) => {
    const chapter = await tx.chapter.update({
      where: { id: req.params.id },
      data,
    }).catch(() => null);
    if (!chapter) return null;
    const sectionData: any = {};
    if (data.title) sectionData.title = data.title;
    if ("description" in data) sectionData.description = data.description;
    if (typeof data.published === "boolean") sectionData.published = data.published;
    if (typeof data.order === "number") sectionData.order = data.order;
    if (Object.keys(sectionData).length > 0) {
      await tx.contentSection.updateMany({
        where: { chapterId: chapter.id, parentId: null },
        data: sectionData,
      });
    }
    return chapter;
  });

  if (!result) { res.status(404).json({ error: "Chapter not found" }); return; }
  logDb("INFO", "Chapter updated", { chapterId: result.id, data: Object.keys(data) });
  res.json(result);
});

// PATCH /api/chapters/:id
app.patch("/api/chapters/:id", requireAuth, requireRbac, validateBody(chapterPatchSchema), async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  if (!(await verifyChapterAccess(authUser, req.params.id))) {
    res.status(403).json({ error: "Accès refusé pour modifier ce chapitre" });
    return;
  }
  const { published } = req.body;
  const result = await prisma.$transaction(async (tx) => {
    const chapter = await tx.chapter.update({
      where: { id: req.params.id },
      data: { published },
    }).catch(() => null);
    if (!chapter) return null;
    await tx.contentSection.updateMany({
      where: { chapterId: chapter.id, parentId: null },
      data: { published },
    });
    return chapter;
  });
  if (!result) { res.status(404).json({ error: "Chapter not found" }); return; }
  logDb("INFO", "Chapter publication updated", { chapterId: result.id, published });
  res.json(result);
});

// DELETE /api/chapters/:id
app.delete("/api/chapters/:id", requireAuth, requireRbac, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  if (!(await verifyChapterAccess(authUser, req.params.id))) {
    res.status(403).json({ error: "Accès refusé pour supprimer ce chapitre" });
    return;
  }
  const chapter = await prisma.chapter.findUnique({
    where: { id: req.params.id },
    include: { sections: { where: { parentId: null }, select: { id: true } } },
  });
  if (!chapter) { res.status(404).json({ error: "Chapter not found" }); return; }

  const fileKeys: string[] = [];
  await prisma.$transaction(async (tx) => {
    for (const section of chapter.sections) {
      const resTree = await deleteContentSectionTree(tx, section.id);
      fileKeys.push(...resTree.fileKeys);
    }
    await tx.chapter.delete({ where: { id: chapter.id } });
  });

  if (fileKeys.length > 0) {
    await deleteCloudFiles(fileKeys);
  }

  logDb("INFO", "Chapter deleted", { chapterId: chapter.id, courseId: chapter.courseId });
  res.json({ ok: true, deletedId: chapter.id });
});

// POST /api/courses/:courseId/sections
app.post("/api/courses/:courseId/sections", requireAuth, requireRbac, validateBody(sectionSchema), async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const courseId = parseInt(req.params.courseId);
  if (!(await verifyCourseAccess(authUser, courseId))) {
    res.status(403).json({ error: "Accès refusé pour modifier ce module" });
    return;
  }
  const { title, description, parentId, chapterId, published } = req.body;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }

  let parent: any = null;
  if (parentId) {
    parent = await prisma.contentSection.findFirst({ where: { id: String(parentId), courseId } });
    if (!parent) { res.status(404).json({ error: "Parent section not found" }); return; }
  }

  const resolvedChapterId = parent?.chapterId || (typeof chapterId === "string" ? chapterId : null);
  if (resolvedChapterId) {
    const chapter = await prisma.chapter.findFirst({ where: { id: resolvedChapterId, courseId } });
    if (!chapter) { res.status(404).json({ error: "Chapter not found" }); return; }
  }

  const order = await prisma.contentSection.count({
    where: { courseId, parentId: parent ? parent.id : null },
  });
  const section = await prisma.contentSection.create({
    data: {
      courseId,
      chapterId: resolvedChapterId,
      parentId: parent?.id || null,
      title: title.trim(),
      description: typeof description === "string" ? description.trim() || null : null,
      order,
      published: Boolean(published),
      createdById: authUser.id,
    },
  });

  logDb("INFO", "Content section created", { courseId, sectionId: section.id, parentId: section.parentId, userId: authUser.id });
  res.status(201).json(section);
});

// GET /api/quizzes/:moduleId
app.get("/api/quizzes/:moduleId", requireAuth, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const moduleId = parseInt(req.params.moduleId);
  const quiz = await prisma.quiz.findFirst({
    where: { moduleId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (quiz) {
    const courseId = quiz.courseId;
    if (authUser.role === "STUDENT" && !authUser.enrolledCourses.includes(courseId)) {
      res.status(403).json({ error: "Inscription requise pour consulter ce quiz" });
      return;
    }
    if (authUser.role !== "STUDENT" && !(await verifyCourseAccess(authUser, courseId))) {
      res.status(403).json({ error: "Accès refusé pour consulter ce quiz" });
      return;
    }
    if (authUser.role === "STUDENT" && !quiz.published) {
      res.status(404).json({ error: "Quiz not found" });
      return;
    }
    if (authUser.role === "STUDENT") {
      res.json(quiz.questions.map(({ answer, explanation, ...question }) => question));
      return;
    }
    res.json(quiz.questions.map((question) => ({
      id: question.id,
      question: question.question,
      options: question.options,
      answer: question.answer,
      explanation: question.explanation,
    })));
    return;
  }

  const data = quizzes[moduleId];
  if (!data) { res.status(404).json({ error: "Quiz not found" }); return; }
  if (authUser.role === "STUDENT") {
    res.json(data.map(({ answer, explanation, ...question }) => question));
    return;
  }
  res.json(data);
});

// POST /api/courses/:courseId/modules/:moduleId/quiz-attempts
app.post("/api/courses/:courseId/modules/:moduleId/quiz-attempts", requireAuth, requireRbac, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const courseId = parseInt(req.params.courseId);
  const moduleId = parseInt(req.params.moduleId);
  const answers = req.body?.answers;
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    res.status(400).json({ error: "answers object required" });
    return;
  }

  if (!authUser.enrolledCourses.includes(courseId)) {
    res.status(403).json({ error: "Inscription requise pour soumettre ce quiz" });
    return;
  }

  const course = await findCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  const module = course.modules.find((item) => item.id === moduleId && item.type === "quiz");
  if (!module) { res.status(404).json({ error: "Module quiz not found" }); return; }

  const quiz = await findQuizWithQuestions(course.id, module.id);
  if (!quiz || quiz.questions.length === 0) {
    res.status(404).json({ error: "Aucun quiz n'est modélisé pour ce module" });
    return;
  }

  let score = 0;
  const gradedAnswers = quiz.questions.map((question, index) => {
    const selectedAnswer = String(answers[question.id] ?? answers[index] ?? "").trim();
    const isCorrect = selectedAnswer === question.answer;
    if (isCorrect) score += 1;
    return { question, selectedAnswer, isCorrect };
  });
  const total = quiz.questions.length;
  const scoreOutOf20 = total ? Number(((score / total) * 20).toFixed(2)) : 0;

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId: quiz.id,
      courseId: course.id,
      moduleId: module.id,
      userId: authUser.id,
      score,
      total,
      scoreOutOf20,
      answers: {
        create: gradedAnswers.map((answer) => ({
          questionId: answer.question.id,
          selectedAnswer: answer.selectedAnswer,
          isCorrect: answer.isCorrect,
        })),
      },
    },
  });

  logDb("INFO", "Quiz attempt recorded", { courseId: course.id, moduleId: module.id, userId: authUser.id, score, total, scoreOutOf20 });
  res.status(201).json({
    attemptId: attempt.id,
    score,
    total,
    scoreOutOf20,
    questions: gradedAnswers.map((answer) => ({
      id: answer.question.id,
      question: answer.question.question,
      answer: answer.question.answer,
      explanation: answer.question.explanation,
      selectedAnswer: answer.selectedAnswer,
      isCorrect: answer.isCorrect,
    })),
  });
});

// POST /api/quizzes/:quizId/attempts
app.post("/api/quizzes/:quizId/attempts", requireAuth, validateBody(quizAttemptSchema), async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  if (authUser.role !== "STUDENT") {
    res.status(403).json({ error: "Seuls les étudiants peuvent soumettre un quiz" });
    return;
  }
  const quiz = await prisma.quiz.findFirst({
    where: { id: req.params.quizId, published: true },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!quiz) { res.status(404).json({ error: "Quiz publié introuvable" }); return; }
  if (!authUser.enrolledCourses.includes(quiz.courseId)) {
    res.status(403).json({ error: "Inscription requise pour soumettre ce quiz" });
    return;
  }
  if (quiz.questions.length === 0) {
    res.status(400).json({ error: "Ce quiz ne contient aucune question" });
    return;
  }

  let score = 0;
  const answers = req.body.answers as Record<string, string>;
  const gradedAnswers = quiz.questions.map((question, index) => {
    const selectedAnswer = String(answers[question.id] ?? answers[index] ?? "").trim();
    const isCorrect = selectedAnswer === question.answer;
    if (isCorrect) score += 1;
    return { question, selectedAnswer, isCorrect };
  });
  const total = quiz.questions.length;
  const scoreOutOf20 = Number(((score / total) * 20).toFixed(2));
  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId: quiz.id,
      courseId: quiz.courseId,
      moduleId: quiz.moduleId,
      userId: authUser.id,
      score,
      total,
      scoreOutOf20,
      answers: {
        create: gradedAnswers.map((answer) => ({
          questionId: answer.question.id,
          selectedAnswer: answer.selectedAnswer,
          isCorrect: answer.isCorrect,
        })),
      },
    },
  });

  logDb("INFO", "Flexible quiz attempt recorded", { quizId: quiz.id, courseId: quiz.courseId, userId: authUser.id, score, total, scoreOutOf20 });
  res.status(201).json({
    attemptId: attempt.id,
    score,
    total,
    scoreOutOf20,
    questions: gradedAnswers.map((answer) => ({
      id: answer.question.id,
      question: answer.question.question,
      answer: answer.question.answer,
      explanation: answer.question.explanation,
      selectedAnswer: answer.selectedAnswer,
      isCorrect: answer.isCorrect,
    })),
  });
});

// GET /api/courses/:courseId/quizzes — liste les quiz du module
app.get("/api/courses/:courseId/quizzes", requireAuth, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const courseId = parseInt(req.params.courseId);
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  if (authUser.role === "STUDENT" && !authUser.enrolledCourses.includes(courseId)) {
    res.status(403).json({ error: "Inscription requise pour consulter ces quiz" });
    return;
  }
  if (authUser.role !== "STUDENT" && !(await verifyCourseAccess(authUser, courseId))) {
    res.status(403).json({ error: "Accès refusé pour consulter ces quiz" });
    return;
  }

  const quizList = await prisma.quiz.findMany({
    where: {
      courseId,
      ...(authUser.role === "STUDENT" ? { published: true } : {}),
    },
    include: {
      section: { select: { id: true, title: true, parentId: true, chapterId: true } },
      questions: { orderBy: { order: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });
  logDb("INFO", "Quiz list fetched", { courseId, count: quizList.length, userId: authUser.id, role: authUser.role });
  if (authUser.role === "STUDENT") {
    res.json(quizList.map((quiz) => ({
      ...quiz,
      questions: quiz.questions.map(({ answer, explanation, ...question }) => question),
    })));
    return;
  }
  res.json(quizList);
});

// POST /api/courses/:courseId/quizzes — créer un quiz sur le module ou une section
app.post("/api/courses/:courseId/quizzes", requireAuth, requireRbac, validateBody(quizSchema), async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const courseId = parseInt(req.params.courseId);
  if (!(await verifyCourseAccess(authUser, courseId))) {
    res.status(403).json({ error: "Accès refusé pour modifier ce module" });
    return;
  }
  const { moduleId, sectionId, title, published } = req.body;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }

  if (sectionId) {
    const section = await prisma.contentSection.findFirst({ where: { id: String(sectionId), courseId } });
    if (!section) { res.status(404).json({ error: "Section de module introuvable" }); return; }
  }

  const quiz = await prisma.quiz.create({
    data: {
      courseId,
      moduleId: moduleId ? Number(moduleId) : null,
      sectionId: sectionId || null,
      title: String(title).trim(),
      published: Boolean(published),
    },
    include: {
      section: { select: { id: true, title: true, parentId: true, chapterId: true } },
      questions: true,
    },
  });
  logDb("INFO", "Quiz created", { quizId: quiz.id, courseId, moduleId: quiz.moduleId, sectionId: quiz.sectionId, userId: authUser.id });
  res.status(201).json(quiz);
});

// PATCH /api/quizzes/:quizId
app.patch("/api/quizzes/:quizId", requireAuth, requireRbac, validateBody(quizPatchSchema), async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  if (!(await verifyQuizAccess(authUser, req.params.quizId))) {
    res.status(403).json({ error: "Accès refusé pour modifier ce quiz" });
    return;
  }
  const quiz = await prisma.quiz.update({
    where: { id: req.params.quizId },
    data: req.body,
    include: {
      section: { select: { id: true, title: true, parentId: true, chapterId: true } },
      questions: { orderBy: { order: "asc" } },
    },
  }).catch(() => null);
  if (!quiz) { res.status(404).json({ error: "Quiz not found" }); return; }
  logDb("INFO", "Quiz updated", { quizId: quiz.id, published: quiz.published, userId: authUser.id });
  res.json(quiz);
});

// DELETE /api/quizzes/:quizId
app.delete("/api/quizzes/:quizId", requireAuth, requireRbac, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  if (!(await verifyQuizAccess(authUser, req.params.quizId))) {
    res.status(403).json({ error: "Accès refusé pour supprimer ce quiz" });
    return;
  }
  const quiz = await prisma.quiz.delete({ where: { id: req.params.quizId } }).catch(() => null);
  if (!quiz) { res.status(404).json({ error: "Quiz not found" }); return; }
  logDb("INFO", "Quiz deleted", { quizId: quiz.id, courseId: quiz.courseId, userId: authUser.id });
  res.json({ ok: true, deletedId: quiz.id });
});

// POST /api/quizzes/:quizId/questions — ajouter une question à un quiz
app.post("/api/quizzes/:quizId/questions", requireAuth, requireRbac, validateBody(quizQuestionSchema), async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  if (!(await verifyQuizAccess(authUser, req.params.quizId))) {
    res.status(403).json({ error: "Accès refusé pour modifier ce quiz" });
    return;
  }
  const { question, options, answer, explanation } = req.body;
  if (!question || !Array.isArray(options) || options.length < 2 || !answer || !explanation) {
    res.status(400).json({ error: "question, options (min 2), answer, explanation sont requis" }); return;
  }

  const quiz = await prisma.quiz.findUnique({ where: { id: req.params.quizId } });
  if (!quiz) { res.status(404).json({ error: "Quiz not found" }); return; }

  const order = await prisma.quizQuestion.count({ where: { quizId: quiz.id } });
  const q = await prisma.quizQuestion.create({
    data: {
      quizId: quiz.id,
      question: String(question).trim(),
      options: options as string[],
      answer: String(answer).trim(),
      explanation: String(explanation).trim(),
      order,
    },
  });
  logDb("INFO", "Quiz question added", { questionId: q.id, quizId: quiz.id, userId: authUser.id });
  res.status(201).json(q);
});

// DELETE /api/quiz-questions/:id — supprimer une question de quiz
app.delete("/api/quiz-questions/:id", requireAuth, requireRbac, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  if (!(await verifyQuizQuestionAccess(authUser, req.params.id))) {
    res.status(403).json({ error: "Accès refusé pour modifier ce quiz" });
    return;
  }
  const q = await prisma.quizQuestion.findUnique({ where: { id: req.params.id } });
  if (!q) { res.status(404).json({ error: "Question not found" }); return; }

  await prisma.quizQuestion.delete({ where: { id: q.id } });
  logDb("INFO", "Quiz question deleted", { questionId: q.id, quizId: q.quizId, userId: authUser.id });
  res.json({ ok: true, deletedId: q.id });
});

// GET /api/courses/:courseId/grades
app.get("/api/courses/:courseId/grades", requireAuth, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const courseId = parseInt(req.params.courseId);
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, createdById: true },
  });
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  if (!canReadCourseGrades(authUser, course)) {
    res.status(403).json({ error: "Accès aux notes refusé pour ce module" });
    return;
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      courseId,
      active: true,
      ...(authUser.role === "STUDENT" ? { userId: authUser.id } : {}),
      user: { role: "STUDENT" },
    },
    include: {
      user: {
        include: {
          enrollments: {
            where: { active: true },
            select: { courseId: true },
          },
        },
      },
    },
  });
  const studentIds = enrollments.map((enrollment) => enrollment.user.id);
  const attempts = studentIds.length
    ? await prisma.quizAttempt.findMany({
      where: { courseId, userId: { in: studentIds } },
      select: { userId: true, quizId: true, scoreOutOf20: true, createdAt: true },
    })
    : [];
  const rows = buildCourseGradeRows(enrollments, attempts)
    .sort((left, right) => left.studentName.localeCompare(right.studentName, "fr"));

  logDb("INFO", "Course grades listed", { courseId, userId: authUser.id, role: authUser.role, students: rows.length });
  res.json(rows);
});

// POST /api/courses/:courseId/modules/:moduleId/complete
app.post("/api/courses/:courseId/modules/:moduleId/complete", requireAuth, requireRbac, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const courseId = parseInt(req.params.courseId);
  if (authUser.role === "STUDENT" && !authUser.enrolledCourses.includes(courseId)) {
    res.status(403).json({ error: "Inscription requise pour compléter ce module" });
    return;
  }
  const moduleId = parseInt(req.params.moduleId);
  const course = await findCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }

  const mod = course.modules.find(m => m.id === moduleId);
  if (!mod) { res.status(404).json({ error: "Module not found" }); return; }

  mod.completed = true;
  const completedCount = course.modules.filter(m => m.completed).length;
  const totalCount = course.modules.length;
  course.progress = Math.round((completedCount / totalCount) * 100);

  const updatedCourse = await prisma.course.update({
    where: { id: course.id },
    data: {
      modules: course.modules as unknown as Prisma.InputJsonValue,
      progress: course.progress,
    },
  });
  res.json(toCourse(updatedCourse));
});

// POST /api/courses/:courseId/modules (Teacher adds module)
app.post("/api/courses/:courseId/modules", requireAuth, requireRbac, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const courseId = parseInt(req.params.courseId);
  if (!(await verifyCourseAccess(authUser, courseId))) {
    res.status(403).json({ error: "Accès refusé pour modifier ce module" });
    return;
  }
  const course = await findCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }

  const { title, type, duration, contentMarkdown } = req.body;
  if (!title || !type || !duration) {
    res.status(400).json({ error: "title, type, duration required" });
    return;
  }

  const courses = (await prisma.course.findMany()).map(toCourse);
  const allIds = courses.flatMap(c => c.modules.map(m => m.id));
  const nextId = Math.max(...allIds, 100) + 1;

  const newModule: CourseModule = {
    id: nextId,
    title,
    type,
    duration,
    completed: false,
    contentMarkdown: type === "pdf" ? (contentMarkdown || "### Introduction théorique\nCe manuel a été rédigé par l'équipe enseignante d'Axelmond Research Labs.") : undefined,
  };

  course.modules.push(newModule);
  const updatedCourse = await prisma.course.update({
    where: { id: course.id },
    data: { modules: course.modules as unknown as Prisma.InputJsonValue },
  });
  res.json(toCourse(updatedCourse));
});

// PUT /api/courses/:courseId (Teacher updates course identity)
app.put("/api/courses/:courseId", requireAuth, requireRbac, validateBody(courseSchema), async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const courseId = parseInt(req.params.courseId);
  if (!(await verifyCourseAccess(authUser, courseId))) {
    res.status(403).json({ error: "Accès refusé pour modifier ce module" });
    return;
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }

  const { title, credits, duration, category, disciplineId, price, instructor, description, published } = req.body;

  const discipline = await prisma.discipline.findUnique({ where: { id: Number(disciplineId) } });
  if (!discipline) {
    res.status(400).json({ error: "Discipline académique invalide" });
    return;
  }

  const updatedCourse = await prisma.course.update({
    where: { id: course.id },
    data: {
      title,
      level: DEFAULT_MODULE_CLASSIFICATION,
      credits,
      duration,
      category: category || discipline.name,
      disciplineId: discipline.id,
      price,
      instructor: instructor || authUser.fullName,
      description,
      published,
    },
    include: courseResponseInclude,
  });

  await logAudit(authUser.id, authUser.email, "UPDATE_COURSE", "Course", String(course.id), { title: updatedCourse.title }, req.ip);
  logDb("INFO", "Course updated", { courseId: course.id, fields: Object.keys(req.body) });
  await cacheDel("api:domains:public");
  await cacheDel(`api:courses:public:d=0:dis=0`);
  res.json(toCourse(updatedCourse));
});

// PATCH /api/courses/:courseId (Teacher updates course metadata/live state)
app.patch("/api/courses/:courseId", requireAuth, requireRbac, validateBody(coursePatchSchema), async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const courseId = parseInt(req.params.courseId);
  if (!(await verifyCourseAccess(authUser, courseId))) {
    res.status(403).json({ error: "Accès refusé pour modifier ce module" });
    return;
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }

  const updatedCourse = await prisma.$transaction(async (tx) => {
    const updated = await tx.course.update({
      where: { id: course.id },
      data: req.body,
    });
    const shouldSyncLiveSession = typeof req.body.isLiveNow === "boolean" || typeof req.body.liveSubject !== "undefined";
    if (shouldSyncLiveSession) {
      const roomName = buildLiveKitRoomName(course.id);
      if (updated.isLiveNow) {
        const liveStartedAt = course.isLiveNow ? undefined : new Date();
        const session = await tx.liveSession.upsert({
          where: { roomName },
          update: {
            title: updated.liveSubject || null,
            isActive: true,
            endTime: null,
            professorId: authUser.id,
            ...(liveStartedAt ? { startTime: liveStartedAt } : {}),
          },
          create: {
            roomName,
            title: updated.liveSubject || null,
            courseId: course.id,
            professorId: authUser.id,
            startTime: liveStartedAt || new Date(),
          },
        });
        logLiveKit("INFO", "Live session synced", { courseId: course.id, roomName, isLiveNow: true, startedAt: session.startTime.toISOString() });
      } else if (typeof req.body.isLiveNow === "boolean") {
        await tx.liveSession.updateMany({
          where: { roomName, isActive: true, endTime: null },
          data: { title: updated.liveSubject || null, isActive: false, endTime: new Date() },
        });
        logLiveKit("INFO", "Live session synced", { courseId: course.id, roomName, isLiveNow: false });
      }
    }
    return tx.course.findUnique({ where: { id: course.id }, include: courseResponseInclude });
  });

  await logAudit(authUser.id, authUser.email, "PATCH_COURSE", "Course", String(course.id), req.body, req.ip);
  await cacheDel("api:domains:public");
  await cacheDel(`api:courses:public:d=0:dis=0`);
  res.json(toCourse(updatedCourse));
});

// DELETE /api/courses/:courseId
app.delete("/api/courses/:courseId", requireAuth, requireRbac, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const courseId = parseInt(req.params.courseId);
  if (!(await verifyCourseAccess(authUser, courseId))) {
    res.status(403).json({ error: "Accès refusé pour supprimer ce module" });
    return;
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }

  const fileKeys: string[] = [];
  await prisma.$transaction(async (tx) => {
    const contents = await tx.lessonContent.findMany({ where: { courseId }, select: { id: true } });
    const contentIds = contents.map((content: any) => content.id);
    const sessions = await tx.liveSession.findMany({ where: { courseId }, select: { id: true } });
    const sessionIds = sessions.map((session: any) => session.id);
    if (contentIds.length > 0) {
      const attachments = await tx.attachment.findMany({
        where: { contentId: { in: contentIds } },
        select: { fileKey: true }
      });
      fileKeys.push(...attachments.map((a: any) => a.fileKey));
      await tx.attachment.deleteMany({ where: { contentId: { in: contentIds } } });
    }
    await tx.lessonContent.deleteMany({ where: { courseId } });
    await tx.contentSection.deleteMany({ where: { courseId } });
    await tx.chapter.deleteMany({ where: { courseId } });
    if (sessionIds.length > 0) await tx.liveMessage.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.liveSession.deleteMany({ where: { courseId } });
    await tx.enrollment.deleteMany({ where: { courseId } });
    await tx.course.delete({ where: { id: courseId } });
  });

  if (fileKeys.length > 0) {
    await deleteCloudFiles(fileKeys);
  }

  await logAudit(authUser.id, authUser.email, "DELETE_COURSE", "Course", String(courseId), { title: course.title }, req.ip);
  logDb("INFO", "Course deleted", { courseId });
  await cacheDel("api:domains:public");
  await cacheDel(`api:courses:public:d=0:dis=0`);
  res.json({ ok: true, deletedId: courseId });
});

// PUT /api/content-sections/:id
app.put("/api/content-sections/:id", requireAuth, requireRbac, validateBody(sectionPatchSchema), async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  if (!(await verifySectionAccess(authUser, req.params.id))) {
    res.status(403).json({ error: "Accès refusé pour modifier cette section" });
    return;
  }
  const { title, description, published, order } = req.body;
  const data: any = {};
  if (typeof title === "string" && title.trim()) data.title = title.trim();
  if (typeof description === "string" || description === null) data.description = description?.trim() || null;
  if (typeof published === "boolean") data.published = published;
  if (typeof order === "number") data.order = order;

  const section = await prisma.contentSection.update({
    where: { id: req.params.id },
    data,
  }).catch(() => null);
  if (!section) { res.status(404).json({ error: "Section not found" }); return; }

  logDb("INFO", "Content section updated", { sectionId: section.id, data: Object.keys(data) });
  res.json(section);
});

// PATCH /api/content-sections/:id
app.patch("/api/content-sections/:id", requireAuth, requireRbac, validateBody(sectionPatchSchema), async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  if (!(await verifySectionAccess(authUser, req.params.id))) {
    res.status(403).json({ error: "Accès refusé pour modifier cette section" });
    return;
  }
  const { title, description, published } = req.body;
  const data: any = {};
  if (typeof title === "string" && title.trim()) data.title = title.trim();
  if (typeof description === "string" || description === null) data.description = description?.trim() || null;
  if (typeof published === "boolean") data.published = published;

  const section = await prisma.contentSection.update({
    where: { id: req.params.id },
    data,
  }).catch(() => null);
  if (!section) { res.status(404).json({ error: "Section not found" }); return; }

  logDb("INFO", "Content section updated", { sectionId: section.id, published: section.published });
  res.json(section);
});

// DELETE /api/content-sections/:id
app.delete("/api/content-sections/:id", requireAuth, requireRbac, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  if (!(await verifySectionAccess(authUser, req.params.id))) {
    res.status(403).json({ error: "Accès refusé pour supprimer cette section" });
    return;
  }
  const section = await prisma.contentSection.findUnique({ where: { id: req.params.id } });
  if (!section) { res.status(404).json({ error: "Section not found" }); return; }

  let fileKeys: string[] = [];
  const result = await prisma.$transaction(async (tx) => {
    const resTree = await deleteContentSectionTree(tx, section.id);
    fileKeys = resTree.fileKeys;
    return resTree;
  });

  if (fileKeys.length > 0) {
    await deleteCloudFiles(fileKeys);
  }

  logDb("INFO", "Content section deleted", { sectionId: section.id, descendants: result.sectionCount - 1 });
  res.json({ ok: true, deletedId: section.id });
});

// POST /api/content-sections/:sectionId/contents
app.post("/api/content-sections/:sectionId/contents", requireAuth, requireRbac, validateBody(textContentSchema), async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  if (!(await verifySectionAccess(authUser, req.params.sectionId))) {
    res.status(403).json({ error: "Accès refusé pour modifier cette section" });
    return;
  }
  const section = await prisma.contentSection.findUnique({ where: { id: req.params.sectionId } });
  if (!section) { res.status(404).json({ error: "Section not found" }); return; }

  const { title, body, published } = req.body;
  if (!title || !body) { res.status(400).json({ error: "title, body required" }); return; }

  const content = await prisma.lessonContent.create({
    data: {
      courseId: section.courseId,
      sectionId: section.id,
      type: "TEXT",
      title: title.trim(),
      body: body.trim(),
      published: Boolean(published),
      createdById: authUser.id,
    },
    include: { attachments: true },
  });

  logDb("INFO", "Text lesson content created", { contentId: content.id, sectionId: section.id, userId: authUser.id });
  res.status(201).json(toLessonContent(content));
});

// PUT /api/lesson-contents/:id
app.put("/api/lesson-contents/:id", requireAuth, requireRbac, validateBody(textContentPatchSchema), async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  if (!(await verifyContentAccess(authUser, req.params.id))) {
    res.status(403).json({ error: "Accès refusé pour modifier ce contenu" });
    return;
  }
  const { title, body, published } = req.body;
  const data: any = {};
  if (typeof title === "string" && title.trim()) data.title = title.trim();
  if (typeof body === "string" || body === null) data.body = body?.trim() || null;
  if (typeof published === "boolean") data.published = published;

  const content = await prisma.lessonContent.update({
    where: { id: req.params.id },
    data,
    include: { attachments: true },
  }).catch(() => null);
  if (!content) { res.status(404).json({ error: "Content not found" }); return; }

  logDb("INFO", "Lesson content updated", { contentId: content.id, data: Object.keys(data) });
  res.json(toLessonContent(content));
});

// PATCH /api/lesson-contents/:id
app.patch("/api/lesson-contents/:id", requireAuth, requireRbac, validateBody(textContentPatchSchema), async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  if (!(await verifyContentAccess(authUser, req.params.id))) {
    res.status(403).json({ error: "Accès refusé pour modifier ce contenu" });
    return;
  }
  const { title, body, published } = req.body;
  const data: any = {};
  if (typeof title === "string" && title.trim()) data.title = title.trim();
  if (typeof body === "string" || body === null) data.body = body?.trim() || null;
  if (typeof published === "boolean") data.published = published;

  const content = await prisma.lessonContent.update({
    where: { id: req.params.id },
    data,
    include: { attachments: true },
  }).catch(() => null);
  if (!content) { res.status(404).json({ error: "Content not found" }); return; }

  logDb("INFO", "Lesson content updated", { contentId: content.id, published: content.published });
  res.json(toLessonContent(content));
});

// DELETE /api/lesson-contents/:id
app.delete("/api/lesson-contents/:id", requireAuth, requireRbac, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  if (!(await verifyContentAccess(authUser, req.params.id))) {
    res.status(403).json({ error: "Accès refusé pour supprimer ce contenu" });
    return;
  }
  const content = await prisma.lessonContent.findUnique({ where: { id: req.params.id } });
  if (!content) { res.status(404).json({ error: "Content not found" }); return; }

  const attachments = await prisma.attachment.findMany({ where: { contentId: content.id } });
  const fileKeys = attachments.map(a => a.fileKey);

  await prisma.$transaction(async (tx) => {
    await tx.attachment.deleteMany({ where: { contentId: content.id } });
    await tx.lessonContent.delete({ where: { id: content.id } });
  });

  if (fileKeys.length > 0) {
    await deleteCloudFiles(fileKeys);
  }

  logDb("INFO", "Lesson content deleted", { contentId: content.id });
  res.json({ ok: true });
});

// Admin professor invite code management
app.get("/api/admin/professor-invites", requireAuth, requireAdmin, async (_req, res) => {
  const invitations = await prisma.professorInviteCode.findMany({
    orderBy: { createdAt: "desc" },
    include: { usedBy: true },
  });
  logInvitation("INFO", "Admin listed professor invitations");
  res.json(invitations.map(professorInviteSnapshot));
});

app.post("/api/admin/professor-invites", requireAuth, requireAdmin, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const code = normalizeProfessorInviteCode(req.body?.code || generateProfessorInviteCode(true));
  if (!code) {
    res.status(400).json({ error: "Code d'invitation absent" });
    return;
  }

  try {
    const invite = await prisma.professorInviteCode.create({
      data: { code, createdById: authUser.id },
    });
    logInvitation("INFO", "Admin created professor invitation", { codeSuffix: invite.code.slice(-4) });
    res.status(201).json({ code: invite.code });
  } catch (err: any) {
    if (err?.code === "P2002") {
      res.status(409).json({ error: "Code d'invitation déjà existant" });
      return;
    }
    logDb("ERROR", "Professor invitation creation failed", { codeSuffix: code.slice(-4), error: String(err) });
    res.status(500).json({ error: "Création du code impossible" });
  }
});

app.delete("/api/admin/professor-invites/:code", requireAuth, requireAdmin, async (req, res) => {
  const code = normalizeProfessorInviteCode(req.params.code);
  const invite = await prisma.professorInviteCode.findUnique({ where: { code } });
  if (!invite || invite.revokedAt) {
    res.status(404).json({ error: "Code d'invitation introuvable ou déjà révoqué" });
    return;
  }

  await prisma.professorInviteCode.update({
    where: { code },
    data: { revokedAt: new Date() },
  });
  logInvitation("INFO", "Admin revoked professor invitation", { codeSuffix: code.slice(-4) });
  res.json({ ok: true });
});

app.get("/api/admin/email-delivery-logs", requireAuth, requireAdmin, async (_req, res) => {
  const logs = await prisma.emailDeliveryLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  logEmail("INFO", "Admin listed email delivery logs", { count: logs.length });
  res.json(logs.map(emailDeliveryLogSnapshot));
});

app.get("/api/admin/email-delivery-summary", requireAuth, requireAdmin, async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const logs = await prisma.emailDeliveryLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const summary = buildEmailDeliverySummary(logs, getSmtpPublicConfig().configured);
  const emailsSentToday = await prisma.emailDeliveryLog.count({
    where: {
      providerStatus: "QUEUED",
      createdAt: { gte: today },
    },
  });
  logEmail("INFO", "Admin listed email delivery summary", { emailsSentToday });
  res.json({
    smtpConfigured: summary.smtpConfigured,
    lastEmailSent: summary.lastEmailSent ? emailDeliveryLogSnapshot(summary.lastEmailSent) : null,
    emailsSentToday,
    lastSmtpError: summary.lastSmtpError ? emailDeliveryLogSnapshot(summary.lastSmtpError) : null,
  });
});

app.post("/api/test-email", requireAuth, requireAdmin, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const to = String(req.body?.to || "").trim().toLowerCase();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    res.status(400).json({ error: "Adresse e-mail destinataire invalide" });
    return;
  }

  logEmail("INFO", "Admin SMTP test requested", {
    userId: authUser.id,
    recipientDomain: getEmailDomain(to),
    smtp: getSmtpPublicConfig(),
  });

  try {
    const delivery = await sendAdminTestEmail(to);
    if (!delivery.sent) {
      logEmail("WARN", "Admin SMTP test not sent", {
        userId: authUser.id,
        recipientDomain: getEmailDomain(to),
        reason: delivery.reason,
        smtp: getSmtpPublicConfig(),
      });
      await recordEmailDeliveryLog("admin_test", authUser.id, to, buildFailedEmailDelivery(to, delivery.reason));
      res.status(503).json({ error: "SMTP non configuré", details: getSmtpPublicConfig() });
      return;
    }

    await recordEmailDeliveryLog("admin_test", authUser.id, to, delivery.delivery);
    logEmail("INFO", "Admin SMTP test sent", { userId: authUser.id, recipientDomain: getEmailDomain(to), delivery: delivery.delivery });
    res.json({ ok: true, message: "E-mail de diagnostic envoyé", delivery: delivery.delivery });
  } catch (err: any) {
    const details = getEmailErrorDetails(err);
    logEmail("ERROR", "Admin SMTP test failed", {
      userId: authUser.id,
      recipientDomain: getEmailDomain(to),
      smtp: getSmtpPublicConfig(),
      error: details,
    });
    await recordEmailDeliveryLog("admin_test", authUser.id, to, buildFailedEmailDelivery(to, details));
    res.status(502).json({ error: "Échec d'envoi SMTP", details });
  }
});

// POST /api/auth/register
app.post("/api/auth/register", validateBody(registerSchema), async (req, res) => {
  const { email, password, fullName, role, levelOrTitle, filiere, professorInviteCode } = req.body;

  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    res.status(400).json({ error: "role must be STUDENT, PROFESSOR, RESEARCHER or ADMIN" });
    return;
  }
  if (normalizedRole === "ADMIN") {
    logSecurity("WARN", "Public admin registration denied", { email });
    res.status(403).json({ error: "La création d'un compte administrateur n'est pas autorisée depuis l'inscription publique" });
    return;
  }

  const normalizedEmail = email;
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    res.status(409).json({ error: "Un compte avec cet email existe déjà" });
    return;
  }

  const inviteCode = normalizeProfessorInviteCode(professorInviteCode);
  if (normalizedRole !== "STUDENT" && !inviteCode) {
    logInvitation("WARN", "Professor registration denied", { email: normalizedEmail, reason: "missing" });
    res.status(403).json({ error: "Code d'invitation professeur absent, invalide ou déjà utilisé" });
    return;
  }

  const finalLevel = normalizedRole === "STUDENT" ? DEFAULT_STUDENT_LABEL : levelOrTitle || "Enseignant Docteur";
  const availableCourses = await prisma.course.findMany({ select: { id: true } });
  const enrolledCourseIds = normalizedRole === "STUDENT"
    ? (availableCourses.length > 0 ? [availableCourses[0].id] : [])
    : availableCourses.map(c => c.id);
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.$transaction(async (tx) => {
      if (normalizedRole !== "STUDENT") {
        const invite = await tx.professorInviteCode.findUnique({
          where: { code: inviteCode },
        });
        if (!invite || invite.usedAt || invite.revokedAt) {
          logInvitation("WARN", "Professor registration denied", { email: normalizedEmail, reason: "invalid_or_used" });
          throw new Error("INVALID_PROFESSOR_INVITE");
        }
        const isExpired = Date.now() - new Date(invite.createdAt).getTime() > 5 * 60 * 1000;
        if (isExpired) {
          logInvitation("WARN", "Professor registration denied", { email: normalizedEmail, reason: "expired" });
          throw new Error("EXPIRED_PROFESSOR_INVITE");
        }
        await tx.professorInviteCode.update({
          where: { code: inviteCode },
          data: { usedAt: new Date() },
        });
      }

      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          fullName,
          role: normalizedRole,
          emailVerified: false,
          levelOrTitle: finalLevel,
          filiere: normalizedRole === "STUDENT" && typeof filiere === "string" ? filiere.trim() || null : null,
          invoices: normalizedRole === "STUDENT" ? createDefaultStudentInvoices() : [],
          enrollments: {
            create: enrolledCourseIds.map((courseId) => ({ courseId })),
          },
        },
        include: { enrollments: true },
      });

      if (normalizedRole !== "STUDENT") {
        await ensureAcademicProfileForUser(tx, {
          id: createdUser.id,
          role: normalizedRole,
          levelOrTitle: finalLevel,
        });
        await tx.professorInviteCode.update({
          where: { code: inviteCode },
          data: { usedById: createdUser.id },
        });
        logInvitation("INFO", "Professor invitation consumed", { email: normalizedEmail, codeSuffix: inviteCode.slice(-4) });
        logSecurity("INFO", "Academic profile initialized after registration", { userId: createdUser.id, role: normalizedRole });
      }

      return createdUser;
    });

    const safeUser = toAppUser(user);
    const delivery = await sendEmailVerificationCode(safeUser);
    logSecurity("INFO", "User registered pending email verification", { userId: safeUser.id, role: safeUser.role });
    res.status(201).json({
      verificationRequired: true,
      email: safeUser.email,
      message: delivery.sent ? "Code envoyé" : "Compte créé. Le service e-mail n'est pas configuré, utilisez la route de renvoi après configuration SMTP.",
    });
  } catch (err: any) {
    if (err?.message === "INVALID_PROFESSOR_INVITE") {
      res.status(403).json({ error: "Code d'invitation professeur absent, invalide ou déjà utilisé" });
      return;
    }
    if (err?.message === "EXPIRED_PROFESSOR_INVITE") {
      res.status(403).json({ error: "Le code d'accès professeur a expiré (validité de 5 minutes)" });
      return;
    }
    if (err?.code === "P2002") {
      res.status(409).json({ error: "Un compte avec cet email existe déjà" });
      return;
    }
    logDb("ERROR", "User registration failed", { email: normalizedEmail, error: String(err) });
    res.status(500).json({ error: "Création du compte impossible" });
  }
});

// POST /api/auth/login
app.post("/api/auth/login", validateBody(loginSchema), async (req, res) => {
  const { email, password, role } = req.body;

  const requestedRole = normalizeRole(role);
  if (!requestedRole) {
    res.status(400).json({ error: "role must be STUDENT, PROFESSOR, RESEARCHER or ADMIN" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { enrollments: true },
  });

  // Pour éviter la fuite d'informations sur l'existence des emails, on simule une comparaison de hash
  if (!user) {
    await bcrypt.compare(password, "$2b$10$abcdefghijklmnopqrstuvwxyzeeeeeeeeeeeeeeeeeeeeeee");
    res.status(401).json({ error: "Identifiants incorrects" });
    return;
  }

  // Vérifier le verrouillage brute-force
  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    const retryAfter = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 1000);
    res.status(429).json({
      error: "Compte temporairement verrouillé pour cause de tentatives excessives. Veuillez réessayer plus tard.",
      isRateLimit: true,
      retryAfter,
      code: "AUTH_RATE_LIMIT_EXCEEDED"
    });
    return;
  }

  if (!canLoginToRequestedRole(user.role, requestedRole)) {
    logSecurity("WARN", "Login sector mismatch", { userId: user.id, requestedRole, actualRole: user.role });
    res.status(403).json({ error: "Ce compte n'est pas autorisé dans cet espace" });
    return;
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    const attempts = user.failedLoginAttempts + 1;
    const lockoutUntil = attempts >= AUTH_MAX_ATTEMPTS ? new Date(Date.now() + AUTH_LOCKOUT_WINDOW_MS) : null;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        lockoutUntil,
      },
    });
    if (lockoutUntil) {
      logSecurity("WARN", "Auth account lockout applied", { userId: user.id, attempts, maxAttempts: AUTH_MAX_ATTEMPTS, lockoutMinutes: Math.round(AUTH_LOCKOUT_WINDOW_MS / 60000) });
    }
    alertFailedLogins(user.email, req.ip || "", attempts);
    res.status(401).json({ error: "Identifiants incorrects" });
    return;
  }

  if (!user.emailVerified) {
    logSecurity("WARN", "Login blocked until email verification", { userId: user.id, role: user.role });
    res.status(403).json({
      error: "E-mail non vérifié. Saisissez le code reçu par e-mail.",
      verificationRequired: true,
      email: user.email,
    });
    return;
  }

  // Connexion réussie : Réinitialiser le compteur d'erreurs
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockoutUntil: null,
    },
  });

  const safeUser = toAppUser(user);
  const refreshToken = await createRefreshToken(user.id);
  logSecurity("INFO", "User logged in", { userId: user.id, role: user.role });
  res.json({ ...safeUser, token: signAuthToken(safeUser), refreshToken });
});

// POST /api/auth/refresh
app.post("/api/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || typeof refreshToken !== "string" || refreshToken.length > 128) {
    res.status(400).json({ error: "Refresh token requis" });
    return;
  }

  const storedToken = await findValidRefreshToken(refreshToken);

  if (!storedToken) {
    logSecurity("WARN", "Invalid refresh token attempt", { ip: req.ip });
    res.status(401).json({ error: "Refresh token invalide ou expiré" });
    return;
  }

  if (storedToken.revokedAt) {
    await revokeAllUserRefreshTokens(storedToken.userId);
    logSecurity("ERROR", "Refresh token reuse detected — all sessions revoked", { userId: storedToken.userId, ip: req.ip });
    res.status(401).json({ error: "Session compromise détectée. Reconnectez-vous." });
    return;
  }

  if (storedToken.expiresAt < new Date()) {
    res.status(401).json({ error: "Refresh token invalide ou expiré" });
    return;
  }

  const safeUser = toAppUser(storedToken.user);
  if (!safeUser.emailVerified) {
    res.status(403).json({ error: "Veuillez vérifier votre e-mail avant d'accéder à l'application" });
    return;
  }
  const newRefreshToken = await rotateRefreshToken(storedToken.id, safeUser.id).catch(() => null);
  if (!newRefreshToken) {
    res.status(401).json({ error: "Refresh token invalide ou déjà utilisé" });
    return;
  }
  const token = signAuthToken(safeUser);
  logSecurity("INFO", "Session token refreshed", { userId: safeUser.id, role: safeUser.role });
  res.json({ token, refreshToken: newRefreshToken });
});

// POST /api/auth/logout
app.post("/api/auth/logout", async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken && typeof refreshToken === "string") {
    await revokeRefreshToken(refreshToken);
  }
  res.json({ ok: true });
});

// POST /api/auth/verify-email
app.post("/api/auth/verify-email", validateBody(verifyEmailSchema), async (req, res) => {
  const { email, code } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { enrollments: true },
  });
  if (!user) {
    res.status(400).json({ error: "Identifiants ou code incorrects" });
    return;
  }
  if (user.emailVerified) {
    const safeUser = toAppUser(user);
    const newRefreshToken = await createRefreshToken(safeUser.id);
    res.json({ ...safeUser, token: signAuthToken(safeUser), refreshToken: newRefreshToken, message: "E-mail déjà vérifié" });
    return;
  }

  const verification = await prisma.emailVerificationCode.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!verification) {
    res.status(400).json({ error: "Aucun code de vérification actif. Demandez un nouveau code." });
    return;
  }
  if (!canAttemptEmailVerification(verification.attempts)) {
    logEmail("WARN", "Verification attempts exceeded", { userId: user.id });
    res.status(429).json({ error: "Nombre maximal de tentatives atteint. Demandez un nouveau code." });
    return;
  }
  if (isEmailVerificationExpired(verification.expiresAt)) {
    await prisma.emailVerificationCode.update({
      where: { id: verification.id },
      data: { attempts: { increment: 1 }, usedAt: new Date() },
    });
    logEmail("WARN", "Expired verification code rejected", { userId: user.id });
    res.status(400).json({ error: "Code expiré" });
    return;
  }

  const codeHash = hashEmailVerificationCode(code);
  if (codeHash !== verification.codeHash) {
    const attempts = verification.attempts + 1;
    await prisma.emailVerificationCode.update({
      where: { id: verification.id },
      data: { attempts },
    });
    logEmail("WARN", "Invalid verification code rejected", { userId: user.id, attempts });
    res.status(attempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS ? 429 : 400).json({
      error: attempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS
        ? "Nombre maximal de tentatives atteint. Demandez un nouveau code."
        : "Identifiants ou code incorrects",
    });
    return;
  }

  const verifiedUser = await prisma.$transaction(async (tx) => {
    await tx.emailVerificationCode.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });
    return tx.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
      include: { enrollments: true },
    });
  });

  const safeUser = toAppUser(verifiedUser);
  const newRefreshToken = await createRefreshToken(safeUser.id);
  logEmail("INFO", "Email verified", { userId: safeUser.id, role: safeUser.role });
  res.json({ ...safeUser, token: signAuthToken(safeUser), refreshToken: newRefreshToken, message: "E-mail vérifié avec succès" });
});

// POST /api/auth/resend-verification-code
app.post("/api/auth/resend-verification-code", validateBody(resendEmailSchema), async (req, res) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Message générique pour éviter l'énumération
    res.json({
      message: "Si le compte existe et n'est pas vérifié, un nouveau code a été envoyé.",
    });
    return;
  }
  if (user.emailVerified) {
    res.status(400).json({ error: "E-mail déjà vérifié" });
    return;
  }

  const delivery = await sendEmailVerificationCode(user);
  res.json({
    message: delivery.sent ? "Code envoyé" : "Si le compte existe et n'est pas vérifié, un nouveau code a été envoyé. Le service e-mail n'est pas configuré.",
  });
});

// POST /api/auth/forgot-password
app.post("/api/auth/forgot-password", validateBody(forgotPasswordSchema), async (req, res) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    logEmail("WARN", "Password reset requested for unknown email", { emailDomain: getEmailDomain(email) });
    res.json({ message: PASSWORD_RESET_GENERIC_MESSAGE });
    return;
  }

  const code = generateEmailVerificationCode();
  if (process.env.NODE_ENV !== "production") {
    console.log(`[DEV] Code de réinitialisation pour ${user.email} : ${code}`);
  }
  await createEmailVerificationCode(prisma, user.id, code);

  try {
    const delivery = await sendVerificationEmail({
      to: user.email,
      fullName: user.fullName,
      code,
      expiresInMinutes: EMAIL_VERIFICATION_TTL_MINUTES,
    });

    logEmail(delivery.sent ? "INFO" : "WARN", delivery.sent ? "Reset password email code sent" : "SMTP not configured for reset password email", {
      userId: user.id,
      emailDomain: getEmailDomain(user.email),
      delivery: delivery.sent ? delivery.delivery : undefined,
    });

    if (delivery.sent && delivery.delivery) {
      await recordEmailDeliveryLog("reset_password", user.id, user.email, delivery.delivery);
    } else if (!delivery.sent) {
      await recordEmailDeliveryLog("reset_password", user.id, user.email, buildFailedEmailDelivery(user.email, delivery.reason || "SMTP_NOT_CONFIGURED"));
    }

    await logAudit(
      user.id,
      user.email,
      "FORGOT_PASSWORD_REQUEST",
      "USER",
      user.id,
      { sent: delivery.sent },
      req.ip
    );

    res.json({ message: PASSWORD_RESET_GENERIC_MESSAGE });
  } catch (err) {
    logEmail("ERROR", "Failed to send reset password code email", { userId: user.id, error: getEmailErrorDetails(err) });
    res.status(500).json({ error: "Une erreur est survenue lors de l'envoi de l'e-mail." });
  }
});

// POST /api/auth/reset-password
app.post("/api/auth/reset-password", validateBody(resetPasswordSchema), async (req, res) => {
  const { email, code, newPassword } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user) {
    logEmail("WARN", "Password reset submitted for unknown email", { emailDomain: getEmailDomain(email) });
    res.status(400).json({ error: "Code de réinitialisation invalide ou expiré." });
    return;
  }

  const verification = await prisma.emailVerificationCode.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!verification) {
    res.status(400).json({ error: "Aucun code de réinitialisation actif. Veuillez faire une nouvelle demande." });
    return;
  }
  if (!canAttemptEmailVerification(verification.attempts)) {
    logEmail("WARN", "Reset password attempts exceeded", { userId: user.id });
    res.status(429).json({ error: "Nombre maximal de tentatives atteint. Demandez un nouveau code." });
    return;
  }
  if (isEmailVerificationExpired(verification.expiresAt)) {
    await prisma.emailVerificationCode.update({
      where: { id: verification.id },
      data: { attempts: { increment: 1 }, usedAt: new Date() },
    });
    logEmail("WARN", "Expired reset password code rejected", { userId: user.id });
    res.status(400).json({ error: "Code expiré" });
    return;
  }

  const codeHash = hashEmailVerificationCode(code);
  if (codeHash !== verification.codeHash) {
    const attempts = verification.attempts + 1;
    await prisma.emailVerificationCode.update({
      where: { id: verification.id },
      data: { attempts },
    });
    logEmail("WARN", "Invalid reset password code rejected", { userId: user.id, attempts });
    res.status(attempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS ? 429 : 400).json({
      error: attempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS
        ? "Nombre maximal de tentatives atteint. Demandez un nouveau code."
        : "Code de vérification incorrect",
    });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationCode.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { 
        passwordHash,
        failedLoginAttempts: 0,
        lockoutUntil: null
      },
    });
  });

  await logAudit(
    user.id,
    user.email,
    "RESET_PASSWORD_SUCCESS",
    "USER",
    user.id,
    {},
    req.ip
  );

  res.json({ message: "Votre mot de passe a été réinitialisé avec succès." });
});

// GET /api/auth/me
app.get("/api/auth/me", requireAuth, (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  res.json(authUser);
});

// GET /api/me/profile
app.get("/api/me/profile", requireAuth, requireRbac, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  if (!canAccessAcademicProfile(authUser.role)) {
    res.status(403).json({ error: "Profil académique réservé aux administrateurs, professeurs et chercheurs" });
    return;
  }

  const payload = await getAcademicProfileResponse(authUser);
  if (!payload) {
    res.status(404).json({ error: "Compte introuvable" });
    return;
  }
  logSecurity("INFO", "Academic profile read", { userId: authUser.id, role: authUser.role });
  res.json(payload);
});

// PUT /api/me/profile
app.put("/api/me/profile", requireAuth, requireRbac, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  if (!canAccessAcademicProfile(authUser.role)) {
    res.status(403).json({ error: "Profil académique réservé aux administrateurs, professeurs et chercheurs" });
    return;
  }

  const input = sanitizeAcademicProfileInput(req.body);
  if ("role" in req.body || "userId" in req.body) {
    logSecurity("WARN", "Academic profile immutable fields ignored", { userId: authUser.id, fields: Object.keys(req.body).filter((field) => field === "role" || field === "userId") });
  }

  await prisma.academicProfile.upsert({
    where: { userId: authUser.id },
    update: {
      title: input.title,
      department: input.department,
      lab: input.lab,
      speciality: input.speciality,
      teachingDomains: input.teachingDomains as unknown as Prisma.InputJsonValue,
      researchDomains: input.researchDomains as unknown as Prisma.InputJsonValue,
      bio: input.bio,
      avatarUrl: input.avatarUrl,
      links: input.links as Prisma.InputJsonObject,
    },
    create: {
      userId: authUser.id,
      title: input.title || authUser.levelOrTitle,
      department: input.department,
      lab: input.lab,
      speciality: input.speciality,
      teachingDomains: input.teachingDomains as unknown as Prisma.InputJsonValue,
      researchDomains: input.researchDomains as unknown as Prisma.InputJsonValue,
      bio: input.bio,
      avatarUrl: input.avatarUrl,
      links: input.links as Prisma.InputJsonObject,
    },
  });

  const payload = await getAcademicProfileResponse(authUser);
  logSecurity("INFO", "Academic profile updated", { userId: authUser.id, role: authUser.role });
  res.json({ ...payload, message: "Profil académique mis à jour" });
});

// POST /api/me/avatar
app.post("/api/me/avatar", requireAuth, requireRbac, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const avatarUrl = sanitizeAvatarUrl(req.body?.avatarUrl);
  if (!avatarUrl) {
    res.status(400).json({ error: "avatarUrl requis" });
    return;
  }

  await prisma.user.update({
    where: { id: authUser.id },
    data: { avatarUrl },
  });

  if (canAccessAcademicProfile(authUser.role)) {
    await prisma.academicProfile.upsert({
      where: { userId: authUser.id },
      update: { avatarUrl },
      create: {
        userId: authUser.id,
        title: authUser.levelOrTitle,
        avatarUrl,
        teachingDomains: [],
        researchDomains: [],
        links: {},
      },
    });
    const payload = await getAcademicProfileResponse(authUser);
    logSecurity("INFO", "Academic avatar updated", { userId: authUser.id, role: authUser.role });
    if (!payload) {
      res.json({ user: { ...authUser, avatarUrl }, message: "Photo de profil mise à jour" });
      return;
    }
    res.json({ ...payload, user: { ...payload.user, avatarUrl }, message: "Photo de profil mise à jour" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { enrollments: true },
  });
  logSecurity("INFO", "User avatar updated", { userId: authUser.id, role: authUser.role });
  res.json({ user: user ? toAppUser(user) : { ...authUser, avatarUrl }, message: "Photo de profil mise à jour" });
});

// DELETE /api/me/avatar
app.delete("/api/me/avatar", requireAuth, requireRbac, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  await prisma.user.update({
    where: { id: authUser.id },
    data: { avatarUrl: null },
  });
  if (canAccessAcademicProfile(authUser.role)) {
    await prisma.academicProfile.updateMany({
      where: { userId: authUser.id },
      data: { avatarUrl: null },
    });
  }
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { enrollments: true },
  });
  logSecurity("INFO", "User avatar removed", { userId: authUser.id, role: authUser.role });
  res.json({ user: user ? toAppUser(user) : { ...authUser, avatarUrl: undefined }, message: "Photo de profil supprimée" });
});

// POST /api/me/password
app.post("/api/me/password", requireAuth, requireRbac, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  if (!canAccessAcademicProfile(authUser.role)) {
    res.status(403).json({ error: "Profil académique réservé aux administrateurs, professeurs et chercheurs" });
    return;
  }

  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");
  if (!currentPassword || newPassword.length < 6) {
    res.status(400).json({ error: "Mot de passe actuel requis et nouveau mot de passe de 6 caractères minimum" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (!user) {
    res.status(404).json({ error: "Compte introuvable" });
    return;
  }
  const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!validPassword) {
    logSecurity("WARN", "Academic password update denied", { userId: authUser.id, reason: "invalid_current_password" });
    res.status(401).json({ error: "Mot de passe actuel incorrect" });
    return;
  }

  await prisma.user.update({
    where: { id: authUser.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  });
  logSecurity("INFO", "Academic password updated", { userId: authUser.id, role: authUser.role });
  res.json({ message: "Mot de passe mis à jour" });
});

// GET /api/admin/academic-profiles
app.get("/api/admin/academic-profiles", requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { role: { in: ["PROFESSOR", "RESEARCHER", "ADMIN"] } },
    include: { academicProfile: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(users.map((user) => ({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
    profile: user.academicProfile ? toAcademicProfile(user.academicProfile) : null,
  })));
});

// POST /api/livekit/token
app.post("/api/livekit/token", requireAuth, async (req, res) => {
  const { courseId } = req.body;
  const authUser = (req as any).authUser as AppUser;
  const access = await assertLiveAccess(authUser, Number(courseId));
  if (!access.ok) {
    logLiveKit("WARN", "Token denied", { userId: authUser.id, courseId: Number(courseId), status: access.status });
    res.status(access.status).json({ error: access.error });
    return;
  }

  const course = access.course;
  const liveKitConfig = getLiveKitConfig(process.env);
  if (!liveKitConfig) {
    logLiveKit("ERROR", "LiveKit server configuration missing");
    res.status(503).json({ error: "Configuration LiveKit manquante côté serveur" });
    return;
  }

  const roomName = buildLiveKitRoomName(course.id);
  const session = await ensureLiveSession(course, authUser);
  await recordLiveAttendanceJoin(session, authUser);
  const participantName = authUser.fullName;
  const participantIdentity = getLiveKitParticipantIdentity(authUser.id);
  const token = new AccessToken(liveKitConfig.apiKey, liveKitConfig.apiSecret, {
    identity: participantIdentity,
    name: participantName,
    ttl: "15m",
    attributes: {
      role: authUser.role,
      userId: authUser.id,
      courseId: String(course.id),
    },
    metadata: JSON.stringify({
      role: authUser.role,
      courseId: course.id,
    }),
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  logLiveKit("INFO", "Token issued", { roomName, identity: participantIdentity, role: authUser.role });
  res.json({
    url: liveKitConfig.url,
    token: await token.toJwt(),
    roomName,
    participantName,
    startedAt: session.startTime.toISOString(),
  });
});

app.get("/api/livekit/messages/:courseId", requireAuth, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const access = await assertLiveAccess(authUser, Number(req.params.courseId));
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const roomName = buildLiveKitRoomName(access.course.id);
  const messages = await prisma.liveMessage.findMany({
    where: { roomName },
    include: { user: true },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  res.json(messages.map((message) => ({
    id: message.clientId || message.id,
    sender: message.user?.fullName || "Participant",
    text: message.text,
    time: message.createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    isMe: message.userId === authUser.id,
  })));
});

app.post("/api/livekit/messages", requireAuth, validateBody(liveMessageSchema), async (req, res) => {
  const { courseId, messageId, text } = req.body;
  const authUser = (req as any).authUser as AppUser;

  const access = await assertLiveAccess(authUser, Number(courseId));
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const session = await ensureLiveSession(access.course, authUser);
  const clientId = String(messageId || `${Date.now()}-${authUser.id}`);
  const message = await prisma.liveMessage.upsert({
    where: { clientId },
    update: {},
    create: {
      clientId,
      roomName: session.roomName,
      text: text.trim(),
      sessionId: session.id,
      userId: authUser.id,
    },
  });
  logLiveKit("INFO", "Live message stored", { userId: authUser.id, roomName: session.roomName });
  res.status(201).json({ id: message.clientId || message.id });
});

app.post("/api/livekit/attendance/leave", requireAuth, validateBody(liveAttendanceLeaveSchema), async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const access = await assertLiveAccess(authUser, req.body.courseId);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const roomName = buildLiveKitRoomName(access.course.id);
  const session = await prisma.liveSession.findUnique({ where: { roomName } });
  if (!session) {
    res.status(404).json({ error: "Session live introuvable" });
    return;
  }

  const attendance = await recordLiveAttendanceLeave(session, authUser);
  res.json({
    ok: true,
    attendance: attendance ? {
      joinedAt: attendance.joinedAt,
      leftAt: attendance.leftAt,
      durationSeconds: attendance.durationSeconds,
    } : null,
  });
});

app.get("/api/livekit/attendance/:courseId", requireAuth, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const courseId = Number(req.params.courseId);
  const access = await assertLiveAccess(authUser, courseId);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const roomName = buildLiveKitRoomName(access.course.id);
  const session = await prisma.liveSession.findUnique({ where: { roomName } });
  if (!session) {
    res.json({ roomName, attendances: [], actions: [], summary: { participants: 0, averageDurationSeconds: 0, totalParticipationScore: 0 } });
    return;
  }

  const canSeeAll = authUser.role === "ADMIN" || authUser.role === "PROFESSOR" || authUser.role === "RESEARCHER";
  const attendances = await prisma.liveAttendance.findMany({
    where: {
      sessionId: session.id,
      ...(canSeeAll ? {} : { userId: authUser.id }),
    },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
    take: 200,
  });
  const actions = await prisma.liveActionLog.findMany({
    where: {
      sessionId: session.id,
      ...(canSeeAll ? {} : { actorId: authUser.id }),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const totalDuration = attendances.reduce((sum, item) => sum + (item.durationSeconds || Math.max(0, Math.round((Date.now() - item.joinedAt.getTime()) / 1000))), 0);
  const totalParticipationScore = attendances.reduce((sum, item) => sum + item.participationScore, 0);
  res.json({
    roomName,
    attendances: attendances.map((item) => ({
      id: item.id,
      userId: item.userId,
      name: item.user?.fullName || "Participant",
      email: item.user?.email || null,
      role: item.role,
      joinedAt: item.joinedAt,
      leftAt: item.leftAt,
      durationSeconds: item.durationSeconds || Math.max(0, Math.round((Date.now() - item.joinedAt.getTime()) / 1000)),
      participationScore: item.participationScore,
      handRaised: item.handRaised,
      online: !item.leftAt,
    })),
    actions: actions.map((item) => ({
      id: item.id,
      action: item.action,
      actorId: item.actorId,
      actorRole: item.actorRole,
      targetIdentity: item.targetIdentity,
      targetName: item.targetName,
      details: item.details,
      createdAt: item.createdAt,
    })),
    summary: {
      participants: attendances.length,
      online: attendances.filter((item) => !item.leftAt).length,
      averageDurationSeconds: attendances.length ? Math.round(totalDuration / attendances.length) : 0,
      totalParticipationScore,
    },
  });
});

app.post("/api/livekit/events", requireAuth, validateBody(liveEventSchema), async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const access = await assertLiveAccess(authUser, req.body.courseId);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const session = await ensureLiveSession(access.course, authUser);
  await recordLiveAction({
    sessionId: session.id,
    roomName: session.roomName,
    actor: authUser,
    action: req.body.action,
    targetIdentity: req.body.targetIdentity,
    targetName: req.body.targetName,
    details: req.body.details || {},
  });
  if (req.body.action === "RAISE_HAND" || req.body.action === "LOWER_HAND") {
    const activeAttendance = await prisma.liveAttendance.findFirst({
      where: { sessionId: session.id, userId: authUser.id, leftAt: null },
      orderBy: { joinedAt: "desc" },
    });
    if (activeAttendance) {
      await prisma.liveAttendance.update({
        where: { id: activeAttendance.id },
        data: {
          handRaised: req.body.action === "RAISE_HAND",
          participationScore: { increment: req.body.action === "RAISE_HAND" ? 1 : 0 },
          lastSeenAt: new Date(),
        },
      });
    }
  }
  logLiveKit("INFO", "Live event stored", { roomName: session.roomName, userId: authUser.id, action: req.body.action });
  res.status(201).json({ ok: true });
});

app.post("/api/livekit/moderation", requireAuth, requireRbac, validateBody(liveModerationSchema), async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  if (authUser.role === "STUDENT") {
    res.status(403).json({ error: "Action réservée à l'équipe académique" });
    return;
  }

  const access = await assertLiveAccess(authUser, req.body.courseId);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const liveKitConfig = getLiveKitConfig(process.env);
  if (!liveKitConfig) {
    res.status(503).json({ error: "Configuration LiveKit manquante côté serveur" });
    return;
  }

  const session = await ensureLiveSession(access.course, authUser);
  const roomService = getLiveKitRoomService(liveKitConfig);
  try {
    if (req.body.action === "REMOVE_PARTICIPANT") {
      await roomService.removeParticipant(session.roomName, req.body.targetIdentity, { revokeTokenTs: BigInt(Math.floor(Date.now() / 1000)) });
    } else if (req.body.action === "MUTE_AUDIO" || req.body.action === "MUTE_VIDEO") {
      if (!req.body.trackSid) {
        res.status(400).json({ error: "trackSid requis pour couper un micro ou une caméra" });
        return;
      }
      await roomService.mutePublishedTrack(session.roomName, req.body.targetIdentity, req.body.trackSid, true);
    } else if (req.body.action === "GRANT_SPEECH" || req.body.action === "REVOKE_SPEECH") {
      await roomService.updateParticipant(session.roomName, req.body.targetIdentity, {
        permission: {
          canPublish: req.body.action === "GRANT_SPEECH",
          canSubscribe: true,
          canPublishData: true,
        },
      });
    }

    await recordLiveAction({
      sessionId: session.id,
      roomName: session.roomName,
      actor: authUser,
      action: req.body.action,
      targetIdentity: req.body.targetIdentity,
      targetName: req.body.targetName,
      details: { trackSid: req.body.trackSid || null },
    });
    logLiveKit("INFO", "Live moderation applied", { roomName: session.roomName, actorId: authUser.id, action: req.body.action, targetIdentity: req.body.targetIdentity });
    res.json({ ok: true });
  } catch (err: any) {
    logLiveKit("ERROR", "Live moderation failed", {
      roomName: session.roomName,
      actorId: authUser.id,
      action: req.body.action,
      targetIdentity: req.body.targetIdentity,
      error: String(err?.message || err),
    });
    res.status(502).json({ error: "Action LiveKit impossible", details: String(err?.message || err) });
  }
});

// PUT /api/users/sync - sync client-side user updates (enrolledCourses, invoices)
app.put("/api/users/sync", requireAuth, requireRbac, validateBody(syncUserSchema), async (req, res) => {
  const { id, enrolledCourses, invoices } = req.body;
  if (!id) { res.status(400).json({ error: "id required" }); return; }

  const authUser = (req as any).authUser as AppUser;
  if (authUser.id !== id) {
    logSecurity("WARN", "User sync target mismatch", { authUserId: authUser.id, targetUserId: id });
    res.status(403).json({ error: "Impossible de synchroniser un autre compte" });
    return;
  }

  // Empêcher les étudiants de s'octroyer des modules ou de forcer des factures manuellement
  if (authUser.role === "STUDENT") {
    if (enrolledCourses !== undefined || invoices !== undefined) {
      logSecurity("WARN", "Student manual enrollment/invoice sync attempt blocked", { userId: authUser.id });
      res.status(400).json({ error: "Les étudiants ne peuvent pas synchroniser manuellement leurs modules ou factures" });
      return;
    }
  }

  try {
    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          invoices: Array.isArray(invoices) ? invoices : undefined,
        },
      });

      if (Array.isArray(enrolledCourses)) {
        await tx.enrollment.deleteMany({ where: { userId: id } });
        await tx.enrollment.createMany({
          data: enrolledCourses.map((courseId: number) => ({ userId: id, courseId })),
          skipDuplicates: true,
        });
      }

      return tx.user.findUnique({
        where: { id: user.id },
        include: { enrollments: true },
      });
    });

    if (!updatedUser) { res.status(404).json({ error: "User not found" }); return; }
    invalidateAuthUserCache(id);
    res.json(toAppUser(updatedUser));
  } catch (err) {
    logDb("ERROR", "User sync failed", { userId: id, error: String(err) });
    res.status(500).json({ error: "Synchronisation du compte impossible" });
  }
});

async function persistCoursePaymentEnrollment(params: {
  userId: string;
  courseId: number;
  courseTitle: string;
  coursePrice: number;
  invoiceId: string;
  auditAction: string;
  reqIp?: string;
}) {
  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const currentInvoices = Array.isArray(user.invoices) ? (user.invoices as any[]) : [];
  if (currentInvoices.some((invoice) => invoice?.id === params.invoiceId)) {
    const existingUser = await prisma.user.findUnique({
      where: { id: params.userId },
      include: { enrollments: true },
    });
    return { duplicate: true as const, user: existingUser, invoice: currentInvoices.find((invoice) => invoice?.id === params.invoiceId) };
  }

  const newInvoice = {
    id: params.invoiceId,
    date: new Date().toLocaleDateString("fr-FR"),
    courseTitle: params.courseTitle,
    amount: params.coursePrice,
    status: "Payé",
  };

  const [, , updatedUser] = await prisma.$transaction([
    prisma.enrollment.upsert({
      where: { userId_courseId: { userId: params.userId, courseId: params.courseId } },
      update: { active: true },
      create: { userId: params.userId, courseId: params.courseId, active: true },
    }),
    prisma.user.update({
      where: { id: params.userId },
      data: { invoices: [...currentInvoices, newInvoice] },
    }),
    prisma.user.findUnique({
      where: { id: params.userId },
      include: { enrollments: true },
    }),
  ]);

  if (!updatedUser) {
    throw new Error("USER_NOT_FOUND");
  }

  invalidateAuthUserCache(params.userId);
  await logAudit(
    params.userId,
    user.email,
    params.auditAction,
    "Course",
    String(params.courseId),
    { price: params.coursePrice, invoiceId: params.invoiceId },
    params.reqIp,
  );

  return { duplicate: false as const, user: updatedUser, invoice: newInvoice };
}

// GET /api/paypal/config - Public PayPal client configuration for the SDK
app.get("/api/paypal/config", (_req, res) => {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  if (!clientId || !isPayPalConfigured()) {
    res.status(503).json({ error: "PayPal non configuré" });
    return;
  }

  res.json({
    clientId,
    env: getPayPalRuntimeEnv(),
  });
});

// POST /api/paypal/create-order - Create a PayPal checkout order
app.post("/api/paypal/create-order", requireAuth, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const courseId = Number(req.body?.courseId);
  if (!courseId || Number.isNaN(courseId)) {
    res.status(400).json({ error: "courseId requis" });
    return;
  }

  if (!isPayPalConfigured()) {
    res.status(503).json({ error: "Le service de paiement PayPal n'est pas configuré" });
    return;
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    res.status(404).json({ error: "Module non trouvé" });
    return;
  }

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: authUser.id, courseId } },
  });
  if (existing?.active) {
    res.status(400).json({ error: "Déjà inscrit à ce module" });
    return;
  }

  try {
    const order = await createPayPalOrder({
      courseId,
      courseTitle: course.title,
      courseDescription: course.description,
      amount: course.price,
      userId: authUser.id,
    });
    res.json({ id: order.id });
  } catch (err: any) {
    logPayPalError("PayPal create-order route failed", {
      userId: authUser.id,
      courseId,
      error: String(err?.message || err),
    });
    res.status(500).json({ error: err?.message || "Erreur lors de la création de la commande PayPal" });
  }
});

// POST /api/paypal/capture-order - Capture payment and enroll student
app.post("/api/paypal/capture-order", requireAuth, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const orderId = String(req.body?.orderId || "").trim();
  const courseId = Number(req.body?.courseId);
  if (!orderId) {
    res.status(400).json({ error: "orderId requis" });
    return;
  }
  if (!courseId || Number.isNaN(courseId)) {
    res.status(400).json({ error: "courseId requis" });
    return;
  }

  if (!isPayPalConfigured()) {
    res.status(503).json({ error: "Le service de paiement PayPal n'est pas configuré" });
    return;
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    res.status(404).json({ error: "Module non trouvé" });
    return;
  }

  try {
    const captureResult = await capturePayPalOrder(orderId);
    const purchaseUnit = captureResult?.purchase_units?.[0];
    const metadata = parsePayPalCustomId(purchaseUnit?.custom_id);
    const capture = purchaseUnit?.payments?.captures?.[0];

    if (!metadata || metadata.userId !== authUser.id || metadata.courseId !== courseId) {
      logPayPalError("PayPal capture metadata mismatch", {
        orderId,
        authUserId: authUser.id,
        courseId,
        metadata,
      });
      res.status(400).json({ error: "Commande PayPal invalide pour ce compte" });
      return;
    }

    if (captureResult?.status !== "COMPLETED" || capture?.status !== "COMPLETED") {
      logPayPalError("PayPal capture incomplete", {
        orderId,
        orderStatus: captureResult?.status,
        captureStatus: capture?.status,
      });
      res.status(400).json({ error: "Paiement PayPal non finalisé" });
      return;
    }

    const paidAmount = String(capture?.amount?.value || "");
    const paidCurrency = String(capture?.amount?.currency_code || "").toUpperCase();
    if (paidCurrency !== PLATFORM_CURRENCY_CODE || paidAmount !== formatPayPalAmount(course.price)) {
      logPayPalError("PayPal capture amount mismatch", {
        orderId,
        courseId,
        expectedAmount: formatPayPalAmount(course.price),
        paidAmount,
        paidCurrency,
      });
      res.status(400).json({ error: "Montant de paiement incorrect" });
      return;
    }

    const captureId = String(capture?.id || orderId);
    const invoiceId = `INV-PAYPAL-${captureId.slice(-8).toUpperCase()}`;
    const enrollmentResult = await persistCoursePaymentEnrollment({
      userId: authUser.id,
      courseId,
      courseTitle: course.title,
      coursePrice: course.price,
      invoiceId,
      auditAction: "PAYMENT_PAYPAL_SUCCESS",
      reqIp: req.ip,
    });

    if (enrollmentResult.duplicate) {
      logSecurity("INFO", "PayPal capture duplicate ignored", {
        userId: authUser.id,
        courseId,
        invoiceId,
        orderId,
      });
    }

    res.json({
      ok: true,
      message: "Paiement confirmé",
      invoice: enrollmentResult.invoice,
      user: toAppUser(enrollmentResult.user!),
    });
  } catch (err: any) {
    logPayPalError("PayPal capture-order route failed", {
      userId: authUser.id,
      courseId,
      orderId,
      error: String(err?.message || err),
    });
    if (err?.message === "USER_NOT_FOUND") {
      res.status(404).json({ error: "Utilisateur non trouvé" });
      return;
    }
    res.status(500).json({ error: err?.message || "Erreur lors de la capture PayPal" });
  }
});

// POST /api/payments/enroll-mock - Mock enrollment backend validation
app.post("/api/payments/enroll-mock", requireAuth, async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "Inscription mock indisponible en production" });
    return;
  }
  const authUser = (req as any).authUser as AppUser;
  const courseId = Number(req.body?.courseId);
  if (!courseId || isNaN(courseId)) {
    res.status(400).json({ error: "courseId requis" });
    return;
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    res.status(404).json({ error: "Module non trouvé" });
    return;
  }

  // Vérifier si déjà inscrit
  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: authUser.id, courseId } }
  });
  if (existing && existing.active) {
    res.status(400).json({ error: "Déjà inscrit à ce module" });
    return;
  }

  const invoiceId = `INV-MOCK-${Math.floor(Math.random() * 90000 + 10000)}`;
  const newInvoice = {
    id: invoiceId,
    date: new Date().toLocaleDateString("fr-FR"),
    courseTitle: course.title,
    amount: course.price,
    status: "Payé"
  };

  try {
    const user = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!user) {
      res.status(404).json({ error: "Utilisateur non trouvé" });
      return;
    }
    const currentInvoices = Array.isArray(user.invoices) ? (user.invoices as any[]) : [];
    const updatedInvoices = [...currentInvoices, newInvoice];

    const [, , updatedUser] = await prisma.$transaction([
      prisma.enrollment.upsert({
        where: { userId_courseId: { userId: authUser.id, courseId } },
        update: { active: true },
        create: { userId: authUser.id, courseId, active: true }
      }),
      prisma.user.update({
        where: { id: authUser.id },
        data: { invoices: updatedInvoices }
      }),
      prisma.user.findUnique({
        where: { id: authUser.id },
        include: { enrollments: true },
      }),
    ]);
    if (!updatedUser) {
      res.status(404).json({ error: "Utilisateur non trouvé" });
      return;
    }

    invalidateAuthUserCache(authUser.id);
    await logAudit(authUser.id, authUser.email, "ENROLL_MOCK", "Course", String(courseId), { price: course.price, invoiceId }, req.ip);
    logDb("INFO", "Student enrollment synchronized", { userId: authUser.id, courseId, invoiceId });
    res.json({ ok: true, message: "Inscription réussie", invoice: newInvoice, user: toAppUser(updatedUser) });
  } catch (err) {
    logDb("ERROR", "Mock enrollment failed", { userId: authUser.id, courseId, error: String(err) });
    res.status(500).json({ error: "Erreur lors de l'inscription" });
  }
});

// GET /api/users/:id
app.get("/api/users/:id", requireAuth, async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  if (authUser.id !== req.params.id) {
    logSecurity("WARN", "User read target mismatch", { authUserId: authUser.id, targetUserId: req.params.id });
    res.status(403).json({ error: "Accès refusé pour ce compte" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { enrollments: true },
  });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(toAppUser(user));
});

// POST /api/contact
app.post("/api/contact", requireAuth, validateBody(contactSchema), async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const { name, email, subject, category, message } = req.body;

  try {
    await logAudit(
      authUser.id,
      authUser.email,
      "CONTACT_SUBMISSION",
      "Contact",
      null,
      {
        name,
        email,
        subject,
        category,
        messageLength: message.length,
      },
      req.ip
    );

    res.json({
      success: true,
      message: "Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.",
    });
  } catch (err) {
    console.error("Error handling contact submission:", err);
    res.status(500).json({ error: "Erreur lors de l'enregistrement de votre message." });
  }
});

// POST /api/support/tickets
app.post("/api/support/tickets", requireAuth, validateBody(supportTicketSchema), async (req, res) => {
  const authUser = (req as any).authUser as AppUser;
  const { subject, category, description, screenshotUrl } = req.body;

  try {
    await logAudit(
      authUser.id,
      authUser.email,
      "SUPPORT_TICKET_CREATED",
      "SupportTicket",
      null,
      {
        subject,
        category,
        descriptionLength: description.length,
        screenshotUrl,
      },
      req.ip
    );

    res.json({
      success: true,
      message: "Votre ticket de support a été créé avec succès. Notre équipe technique l'examinera dans les plus brefs délais.",
      ticket: {
        id: `TK-${Math.floor(100000 + Math.random() * 900000)}`,
        subject,
        category,
        status: "Ouvert",
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Error handling support ticket creation:", err);
    res.status(500).json({ error: "Erreur lors de la création du ticket de support." });
  }
});

// ─── AI Tutor (existing) ─────────────────────────────────────────────────────

const apiKey = process.env.GEMINI_API_KEY;
let ai: any = null;

if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
    console.log("GoogleGenAI client successfully initialized.");
  } catch (err) {
    console.error("Error setting up GoogleGenAI client:", err);
  }
} else {
  console.log("Assistant IA: service externe non configuré, réponses pédagogiques locales activées.");
}

app.post("/api/chat-tutor", requireAuth, validateBody(chatTutorSchema), async (req, res) => {
  const { prompt, courseContext, moduleContext, chatHistory } = req.body;

  const courseName = courseContext || "Informatique Générale";
  const moduleName = moduleContext || "Sujet Libre";

  const systemInstruction = `Tu es l'éminent tuteur IA de l'université Axelmond Research Labs.
L'étudiant étudie actuellement le module : "${courseName}" et plus particulièrement le chapitre ou l'activité : "${moduleName}".
Fournis des explications scientifiques et informatiques claires, extrêmement précises et pédagogiques.
Si l'étudiant pose une question de programmation, donne des exemples de code structurés (en C, Python, SQL, ou Bash selon le contexte) avec des explications.
Reste bienveillant, universitaire et s'il s'agit d'un exemple pratique, aide l'étudiant à comprendre la logique étape par étape.
Réponds exclusivement en français, de manière polie.`;

  if (!ai) {
    const localAnswers: { [key: string]: string } = {
      default: `Bonjour ! Je suis votre assistant personnel Axelmond Research Labs.\n\nC'est un plaisir de vous aider sur le module **${courseName}** (*${moduleName}*).\n\nVoici quelques conseils fondamentaux sur votre sujet actuel :\n1. **Comprenez la structure** : Avant de coder, dessinez les structures de données (listes, arbres) ou écrivez le pseudo-code.\n2. **Complexité** : N'oubliez pas d'évaluer la complexité O(n) de vos solutions.\n3. **Tests** : Testez toujours les cas limites (pointeur NULL, tableau vide, division par zéro).\n\nAvez-vous une question spécifique concernant le code ou la théorie de ce chapitre ?`
    };
    let reply = localAnswers.default;
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes("complexit") || lowerPrompt.includes("o(")) {
      reply = `### Analyse de la Complexité Temporelle O(n)\n\nEn Algorithmique, la complexité mesure l'évolution des ressources nécessaires (temps, mémoire) en fonction de la taille $n$ des données.\n\n- **$O(1)$ (Temps Constant)** : L'accès à un élément de tableau par son index \`A[i]\`.\n- **$O(\\log n)$ (Logarithmique)** : Recherche dichotomique dans un tableau trié.\n- **$O(n)$ (Linéaire)** : Recherche séquentielle dans un tableau non trié.\n- **$O(n^2)$ (Quadratique)** : Double boucle imbriquée.\n\nAvez-vous besoin que nous analysions un algorithme particulier ensemble ?`;
    } else if (lowerPrompt.includes("sql") || lowerPrompt.includes("base de donn")) {
      reply = `### Modélisation et Requêtes SQL\n\nPour concevoir une excellente structure relationnelle, voici les principes clés :\n\n1. **Clé Primaire (Primary Key)** : Identifie de manière unique chaque tuple de la table.\n2. **Clé Étrangère (Foreign Key)** : Établit un lien de référence avec une autre table.\n3. **Jointures** : Permettent de relier plusieurs tables.\n\nQue souhaitez-vous interroger ou modéliser aujourd'hui ?`;
    } else if (lowerPrompt.includes("linux") || lowerPrompt.includes("processus")) {
      reply = `### L'architecture Linux et la gestion de Processus\n\nDans un système d'exploitation conforme aux normes POSIX (comme Linux) :\n\n- **Processus** : Une instance de programme en cours d'exécution.\n- **Thread** : L'unité d'exécution de base d'un processus.\n- **fork()** : Appel système permettant de cloner un processus parent.\n\nAvez-vous une question concernant les sémaphores, le scheduling, ou la gestion des signaux ?`;
    } else if (lowerPrompt.includes("ia") || lowerPrompt.includes("machine learning") || lowerPrompt.includes("neurone")) {
      reply = `### Fondations de l'Intelligence Artificielle\n\nL'apprentissage statistique (Machine Learning) repose sur l'ajustement de paramètres mathématiques pour minimiser une fonction d'erreur.\n\n- **Supervisé** : Vous donnez des entrées $X$ et les étiquettes cibles $Y$.\n- **Non supervisé** : Regroupement automatique sans étiquettes.\n- **Réseau de Neurones** : Un modèle composé de couches de neurones artificiels.\n\nQuelle partie du Machine Learning vous intéresse en ce moment ?`;
    }
    res.json({ text: reply });
    return;
  }

  try {
    const formattedHistory = (chatHistory || []).map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    }));
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [...formattedHistory, { text: prompt }],
      config: { systemInstruction, temperature: 0.7 }
    });
    res.json({ text: response.text });
  } catch (err: any) {
    console.error("Gemini invocation error:", err);
    res.status(500).json({ error: "L'assistant a rencontré une erreur.", details: err.message });
  }
});

// ─── Vite / Static Setup ────────────────────────────────────────────────────

function apiErrorStatus(err: any) {
  const dbUnavailableCodes = new Set([
    "P1000",
    "P1001",
    "P1002",
    "P1003",
    "P1008",
    "P1017",
    "P2021",
    "P2022",
  ]);
  if (dbUnavailableCodes.has(err?.code)) return 503;
  if (err?.code === "P2002") return 409;
  if (err?.code === "P2025") return 404;
  if (err instanceof Prisma.PrismaClientValidationError) return 400;
  return Number.isInteger(err?.status) ? err.status : 500;
}

function apiErrorMessage(err: any) {
  const dbUnavailableCodes = new Set([
    "P1000",
    "P1001",
    "P1002",
    "P1003",
    "P1008",
    "P1017",
    "P2021",
    "P2022",
  ]);
  if (dbUnavailableCodes.has(err?.code)) {
    return "Service temporairement indisponible. Réessayez dans quelques minutes.";
  }
  if (err?.code === "P2002") return "Conflit en base de données";
  if (err?.code === "P2025") return "Ressource introuvable";
  if (err instanceof Prisma.PrismaClientValidationError) return "Requête invalide pour la base de données";

  const status = apiErrorStatus(err);
  if (status >= 500) {
    return "Une erreur interne est survenue";
  }
  return err?.message || "Erreur serveur";
}

// ─── GET /api/health — healthcheck léger (exempté du rate limiter) ────────────
app.get("/api/health", async (req, res) => {
  let dbStatus = "HEALTHY";
  const dbSchema = getActivePgSchema();
  try {
    await prisma.user.findFirst({ select: { id: true } });
  } catch (err) {
    dbStatus = "UNHEALTHY";
  }

  const payload: any = {
    status: dbStatus === "HEALTHY" ? "UP" : "DOWN",
    timestamp: new Date().toISOString(),
  };

  const authHeader = req.headers["x-health-token"];
  if (authHeader && authHeader === process.env.HEALTH_CHECK_TOKEN && process.env.HEALTH_CHECK_TOKEN) {
    payload.uptime = Math.round(process.uptime());
    payload.memory = process.memoryUsage();
    payload.dbStatus = dbStatus;
    payload.dbSchema = dbSchema;
  }

  res.status(dbStatus === "HEALTHY" ? 200 : 503).json(payload);
});

async function setupApp() {
  // ─── Gestion globale des erreurs non capturées ────────────────────────────
  process.on("uncaughtException", (err) => {
    logDb("ERROR", "Uncaught exception — process staying alive", { error: String(err), stack: err?.stack });
  });

  process.on("unhandledRejection", (reason) => {
    logDb("ERROR", "Unhandled promise rejection — process staying alive", { reason: String(reason) });
  });

  logEnvironmentStatus();

  const dbCheck = await verifyDatabaseConnection();
  if (dbCheck.ok) {
    logDb("INFO", "Database schema verified at startup", { schema: dbCheck.schema });
  } else {
    logDb("ERROR", "Database schema verification failed at startup", {
      schema: dbCheck.schema,
      error: dbCheck.error,
    });
  }

  try {
    await seedDatabase();
  } catch (err) {
    logDb("ERROR", "Startup seed failed — server continuing", { error: String(err) });
  }

  try {
    await synchronizePostgresSequences();
  } catch (err) {
    logDb("WARN", "PostgreSQL sequence sync skipped", { error: String(err) });
  }
  const smtpCheck = await verifySmtpConnection();
  if (smtpCheck.ok) {
    logEmail("INFO", "SMTP connection verified at startup", { smtp: smtpCheck.details });
  } else {
    logEmail(smtpCheck.configured ? "ERROR" : "WARN", "SMTP connection verification failed at startup", {
      smtp: smtpCheck.details,
      error: smtpCheck.error,
    });
  }
  const smtpBanner = await readSmtpBanner();
  if (smtpBanner.ok) {
    logEmail("INFO", "SMTP banner received at startup", { smtp: smtpBanner.details, banner: smtpBanner.banner });
  } else {
    logEmail("WARN", "SMTP banner check failed at startup", { smtp: smtpBanner.details, error: "error" in smtpBanner ? smtpBanner.error : undefined });
  }

  // ─── Cache pruner + monitoring de performance ────────────────────────────
  startCachePruner();
  startPerformanceMonitor(Number(process.env.PERF_MONITOR_INTERVAL_MS) || 30_000);

  app.use("/api", (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const status = apiErrorStatus(err);
    const code = err?.code || err?.name || "API_ERROR";
    logDb("ERROR", "API route failed", {
      method: req.method,
      path: req.originalUrl,
      status,
      code,
      message: apiErrorMessage(err),
    });
    if (res.headersSent) {
      next(err);
      return;
    }
    res.status(status).json(
      isProduction
        ? { error: apiErrorMessage(err) }
        : {
            error: apiErrorMessage(err),
            code,
            route: `${req.method} ${req.originalUrl}`,
          },
    );
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware activated in Express.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static files in production mode.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Axelmond Research Labs server running at http://localhost:${PORT}`);
  });
}

setupApp().catch((err) => {
  logDb("ERROR", "Server startup failed", { error: String(err) });
  process.exit(1);
});
