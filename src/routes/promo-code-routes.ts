import type { Express } from "express";
import type { RouteContext } from "../server/route-context";
import { getAuthUser } from "../server/route-deps";
import { parseDateTimeInTimeZone } from "../promo-code-domain";
import {
  createPromoCode,
  deletePromoCode,
  duplicatePromoCode,
  generateUniquePromoCode,
  getPromoCodeDetails,
  getPromoCodeStatistics,
  listPromoAdminOptions,
  listPromoCodes,
  PromoCodeError,
  setPromoCodeStatus,
  updatePromoCode,
  validatePromoCodeEligibility,
} from "../promo-code-service";

function sendPromoError(res: any, error: unknown) {
  if (error instanceof PromoCodeError) {
    res.status(error.statusCode).json({ error: error.message, code: error.code });
    return;
  }
  console.error("[promo-code] request failed", error);
  res.status(500).json({ error: "La gestion du code promotionnel a échoué.", code: "PROMO_INTERNAL_ERROR" });
}

function readDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const raw = String(value).trim();
  let date: Date;
  try {
    date = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(raw) ? parseDateTimeInTimeZone(raw) : new Date(raw);
  } catch {
    return undefined;
  }
  return Number.isFinite(date.getTime()) ? date : undefined;
}

export function registerPromoCodeRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireAdmin } = ctx.middleware;

  app.get("/api/admin/promo-codes/options", requireAuth, requireAdmin, async (_req, res) => {
    try {
      res.json(await listPromoAdminOptions());
    } catch (error) {
      sendPromoError(res, error);
    }
  });

  app.post("/api/admin/promo-codes/generate", requireAuth, requireAdmin, async (_req, res) => {
    try {
      res.json({ code: await generateUniquePromoCode() });
    } catch (error) {
      sendPromoError(res, error);
    }
  });

  app.get("/api/admin/promo-codes", requireAuth, requireAdmin, async (req, res) => {
    try {
      res.json(
        await listPromoCodes({
          q: String(req.query.q || ""),
          status: req.query.status ? String(req.query.status) : undefined,
          discountType: req.query.discountType ? String(req.query.discountType) : undefined,
          courseId: req.query.courseId ? Number(req.query.courseId) : undefined,
          creatorId: req.query.creatorId ? String(req.query.creatorId) : undefined,
          usage: req.query.usage === "USED" || req.query.usage === "UNUSED" ? req.query.usage : undefined,
          startsFrom: readDate(req.query.startsFrom),
          endsBefore: readDate(req.query.endsBefore),
          page: Number(req.query.page) || 1,
          pageSize: Number(req.query.pageSize) || 25,
          includeArchived: req.query.includeArchived === "true",
        }),
      );
    } catch (error) {
      sendPromoError(res, error);
    }
  });

  app.post("/api/admin/promo-codes", requireAuth, requireAdmin, async (req, res) => {
    try {
      res.status(201).json(await createPromoCode(getAuthUser(req).id, req.body || {}));
    } catch (error) {
      sendPromoError(res, error);
    }
  });

  app.get("/api/admin/promo-codes/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      res.json(await getPromoCodeDetails(String(req.params.id)));
    } catch (error) {
      sendPromoError(res, error);
    }
  });

  app.patch("/api/admin/promo-codes/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      res.json(await updatePromoCode(getAuthUser(req).id, String(req.params.id), req.body || {}));
    } catch (error) {
      sendPromoError(res, error);
    }
  });

  const actionStatus = {
    activate: "ACTIVE",
    pause: "PAUSED",
    disable: "DISABLED",
    archive: "ARCHIVED",
  } as const;
  Object.entries(actionStatus).forEach(([action, status]) => {
    app.post(`/api/admin/promo-codes/:id/${action}`, requireAuth, requireAdmin, async (req, res) => {
      try {
        res.json(await setPromoCodeStatus(getAuthUser(req).id, String(req.params.id), status, req.body?.reason));
      } catch (error) {
        sendPromoError(res, error);
      }
    });
  });

  app.post("/api/admin/promo-codes/:id/duplicate", requireAuth, requireAdmin, async (req, res) => {
    try {
      res.status(201).json(await duplicatePromoCode(getAuthUser(req).id, String(req.params.id)));
    } catch (error) {
      sendPromoError(res, error);
    }
  });

  app.delete("/api/admin/promo-codes/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      res.json(await deletePromoCode(getAuthUser(req).id, String(req.params.id)));
    } catch (error) {
      sendPromoError(res, error);
    }
  });

  app.get("/api/admin/promo-codes/:id/statistics", requireAuth, requireAdmin, async (req, res) => {
    try {
      res.json(await getPromoCodeStatistics(String(req.params.id)));
    } catch (error) {
      sendPromoError(res, error);
    }
  });

  app.get("/api/admin/promo-codes/:id/usages", requireAuth, requireAdmin, async (req, res) => {
    try {
      const detail = await getPromoCodeDetails(String(req.params.id));
      res.json(detail.usages);
    } catch (error) {
      sendPromoError(res, error);
    }
  });

  app.get("/api/admin/promo-codes/:id/audit-log", requireAuth, requireAdmin, async (req, res) => {
    try {
      const detail = await getPromoCodeDetails(String(req.params.id));
      res.json(detail.auditLog);
    } catch (error) {
      sendPromoError(res, error);
    }
  });

  app.post("/api/modules/:moduleId/promo-code/validate", requireAuth, async (req, res) => {
    try {
      const user = getAuthUser(req);
      if (user.role !== "STUDENT") {
        res.status(403).json({ error: "Cette action est réservée aux étudiants.", code: "PROMO_STUDENT_ONLY" });
        return;
      }
      const courseId = Number(req.params.moduleId);
      const course = await ctx.deps.prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, price: true, published: true },
      });
      if (!course || !course.published) {
        res.status(404).json({ error: "Module non trouvé", code: "COURSE_NOT_FOUND" });
        return;
      }
      res.json(
        await validatePromoCodeEligibility({
          code: String(req.body?.code || ""),
          userId: user.id,
          courseId,
          originalAmount: course.price,
        }),
      );
    } catch (error) {
      sendPromoError(res, error);
    }
  });

  app.delete("/api/modules/:moduleId/promo-code", requireAuth, (_req, res) => {
    res.json({ removed: true });
  });
}
