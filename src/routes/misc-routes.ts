import type { Express } from "express";
import { getAuthUser } from "../server/route-types";
import rateLimit from "express-rate-limit";
import type { CourseModule } from "../server/route-deps";
import type { RouteContext } from "../server/route-context";
import type { AppUser } from "../server/route-deps";
import * as api from "../server/route-deps";

export function registerMiscRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, validateBody } = ctx.middleware;

  // POST /api/contact

  app.post("/api/contact", requireAuth, validateBody(api.contactSchema), async (req, res) => {
    const authUser = getAuthUser(req);

    const { name, email, subject, category, message } = req.body;

    try {
      await api.logAudit(
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

        req.ip,
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

  app.post("/api/support/tickets", requireAuth, validateBody(api.supportTicketSchema), async (req, res) => {
    const authUser = getAuthUser(req);

    const { subject, category, description, screenshotUrl } = req.body;

    if (screenshotUrl && !api.isAllowedAvatarUrl(String(screenshotUrl))) {
      res.status(400).json({ error: "URL de capture d'écran non autorisée" });

      return;
    }

    try {
      await api.logAudit(
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

        req.ip,
      );

      res.json({
        success: true,

        message:
          "Votre ticket de support a été créé avec succès. Notre équipe technique l'examinera dans les plus brefs délais.",

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

  // ─── AI Tutor (OpenAI, server-side only) ────────────────────────────────────

  api.initializeOpenAIService();

  async function findCourseLearningAccessRecord(courseId: number) {
    return api.prisma.course.findUnique({
      where: { id: courseId },

      select: { id: true, title: true, createdById: true, modules: true, liveSubject: true },
    });
  }

  function resolveChatTutorModuleTitle(
    course: { modules?: unknown; liveSubject?: string | null },

    moduleId?: number,
  ): string | null {
    if (moduleId !== undefined) {
      const modules = Array.isArray(course.modules) ? (course.modules as CourseModule[]) : [];

      const module = modules.find((item) => item.id === moduleId);

      return module?.title ?? null;
    }

    const liveSubject = typeof course.liveSubject === "string" ? course.liveSubject.trim() : "";

    return liveSubject || "Sujet Libre";
  }

  app.post("/api/chat-tutor", requireAuth, validateBody(api.chatTutorSchema), async (req, res) => {
    const authUser = getAuthUser(req);

    const { courseId, moduleId, prompt, chatHistory } = req.body;

    const access = await api.assertCourseLearningAccess(
      authUser,

      courseId,

      findCourseLearningAccessRecord,
    );

    if (access.ok === false) {
      api.logSecurity("WARN", "Chat tutor access denied", { userId: authUser.id, courseId, status: access.status });

      res.status(access.status).json({ error: access.error });

      return;
    }

    const moduleName = resolveChatTutorModuleTitle(access.course, moduleId);

    if (moduleId !== undefined && !moduleName) {
      res.status(400).json({ error: "Module introuvable pour ce cours" });

      return;
    }

    const courseName = access.course.title;

    const resolvedModuleName = moduleName || "Sujet Libre";

    try {
      const text = await api.generateChatTutorResponse({
        courseName,

        moduleName: resolvedModuleName,

        prompt,

        chatHistory,
      });

      res.json({ text });
    } catch (err) {
      if (err instanceof api.ChatTutorServiceError) {
        res.status(err.statusCode).json(api.toChatTutorClientResponse(err));
        return;
      }

      console.error("OpenAI chat-tutor route error:", err);

      res.status(500).json({ error: "L'assistant a rencontré une erreur." });
    }
  });

  // ─── Vite / Static Setup ────────────────────────────────────────────────────

  function apiErrorStatus(err: any) {
    const dbUnavailableCodes = new Set(["P1000", "P1001", "P1002", "P1003", "P1008", "P1017", "P2021", "P2022"]);

    if (dbUnavailableCodes.has(err?.code)) return 503;

    if (err?.code === "P2002") return 409;

    if (err?.code === "P2025") return 404;

    if (err instanceof api.Prisma.PrismaClientValidationError) return 400;

    return Number.isInteger(err?.status) ? err.status : 500;
  }

  function apiErrorMessage(err: any) {
    const dbUnavailableCodes = new Set(["P1000", "P1001", "P1002", "P1003", "P1008", "P1017", "P2021", "P2022"]);

    if (dbUnavailableCodes.has(err?.code)) {
      return "Service temporairement indisponible. Réessayez dans quelques minutes.";
    }

    if (err?.code === "P2002") return "Conflit en base de données";

    if (err?.code === "P2025") return "Ressource introuvable";

    if (err instanceof api.Prisma.PrismaClientValidationError) return "Requête invalide pour la base de données";

    const status = apiErrorStatus(err);

    if (status >= 500) {
      return "Une erreur interne est survenue";
    }

    return "Erreur serveur";
  }

  // ─── GET /api/health — healthcheck léger ────────────────────────────────────

  const HEALTH_CACHE_TTL_MS = 5_000;

  let healthCache: { checkedAt: number; dbHealthy: boolean } | null = null;

  const healthRateLimiter = rateLimit({
    windowMs: 60 * 1000,

    max: api.isSecurityRuntimeTest ? 9999 : 60,

    standardHeaders: true,

    legacyHeaders: false,

    message: { error: "Trop de requêtes healthcheck. Veuillez patienter.", code: "HEALTH_RATE_LIMIT_EXCEEDED" },
  });

  app.get("/api/health", healthRateLimiter, async (req, res) => {
    let dbStatus = "HEALTHY";

    const dbSchema = api.getActivePgSchema();

    const now = Date.now();

    if (!healthCache || now - healthCache.checkedAt >= HEALTH_CACHE_TTL_MS) {
      try {
        await api.prisma.$queryRaw`SELECT 1`;

        healthCache = { checkedAt: now, dbHealthy: true };
      } catch {
        healthCache = { checkedAt: now, dbHealthy: false };
      }
    }

    if (!healthCache.dbHealthy) {
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
}
