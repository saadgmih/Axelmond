import type { Express } from "express";
import { getAuthUser } from "../server/route-types";
import rateLimit from "express-rate-limit";
import type { RouteContext } from "../server/route-context";
import { startupState } from "../server/startup-state";
import * as api from "../server/route-deps";

export function registerMiscRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, validateBody } = ctx.middleware;

  app.get("/api/site-settings", async (_req, res) => {
    try {
      const settings = await api.getSiteSettings();
      res.setHeader("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=120");
      res.removeHeader("Pragma");
      res.removeHeader("Expires");
      res.json(settings);
    } catch (err) {
      api.logDb("WARN", "Public site settings unavailable", { error: String(err) });
      res.status(503).json({ error: "Réglages du site temporairement indisponibles" });
    }
  });

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

  // ─── Vite / Static Setup ────────────────────────────────────────────────────

  function apiErrorStatus(err: any) {
    const dbUnavailableCodes = new Set(["P1000", "P1001", "P1002", "P1003", "P1008", "P1017", "P2021", "P2022"]);

    if (dbUnavailableCodes.has(err?.code)) return 503;

    if (err?.code === "P2002") return 409;

    if (err?.code === "P2025") return 404;

    if (err instanceof api.Prisma.PrismaClientValidationError) return 400;

    return Number.isInteger(err?.status) ? err.status : 500;
  }

  function _apiErrorMessage(err: any) {
    const dbUnavailableCodes = new Set(["P1000", "P1001", "P1002", "P1003", "P1008", "P1017", "P2021", "P2022"]);

    if (dbUnavailableCodes.has(err?.code)) {
      return "Service temporairement indisponible. Réessayez dans quelques minutes.";
    }

    if (err?.code === "P2002") return "Cette action entre en conflit avec une donnée existante";

    if (err?.code === "P2025") return "Ressource introuvable";

    if (err instanceof api.Prisma.PrismaClientValidationError) return "Requête invalide";

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

  app.get("/api/live", (_req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
  });

  app.get("/api/health", healthRateLimiter, async (req, res) => {
    if (!startupState.dbVerified) {
      res.status(200).json({
        status: startupState.listening ? "STARTING" : "BOOTING",
        timestamp: new Date().toISOString(),
      });
      return;
    }

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
      payload.memory = api.collectRuntimeMemoryMetrics();
      payload.dbStatus = dbStatus;
      payload.dbSchema = dbSchema;
    }

    res.status(dbStatus === "HEALTHY" ? 200 : 503).json(payload);
  });
}
