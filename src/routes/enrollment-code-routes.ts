import type { Express, Response } from "express";
import type { RouteContext } from "../server/route-context";
import { getAuthUser } from "../server/route-types";
import {
  AccessCodeError,
  generateEnrollmentAccessCode,
  validateAccessCodeForRedemption,
} from "../enrollment-access-code-service";
import * as api from "../server/route-deps";

function handleAccessCodeError(error: unknown, res: Response) {
  if (error instanceof AccessCodeError) {
    res.status(error.statusCode).json({ error: error.message, code: error.code });
    return;
  }
  console.error("[access-code] request failed", error);
  res.status(500).json({ error: "Traitement du code d'acces impossible" });
}

export function registerEnrollmentCodeRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireAdmin } = ctx.middleware;

  /**
   * POST /api/admin/modules/:courseId/access-codes/generate
   * Admin: generate a single-use 100% access code for a module.
   */
  app.post("/api/admin/modules/:courseId/access-codes/generate", requireAuth, requireAdmin, async (req, res) => {
    try {
      const admin = getAuthUser(req);
      const courseId = api.parsePositiveInt(req.params.courseId);
      if (!courseId) return void res.status(400).json({ error: "Identifiant de module invalide" });

      const result = await generateEnrollmentAccessCode(admin.id, courseId, {
        startsAt: req.body?.startsAt ? new Date(String(req.body.startsAt)) : undefined,
        endsAt: req.body?.endsAt ? new Date(String(req.body.endsAt)) : undefined,
        expiresInDays: Number(req.body?.expiresInDays) || undefined,
        maxUses: Number(req.body?.maxUses) || 1,
        label: req.body?.label ? String(req.body.label).slice(0, 100) : undefined,
      });

      await ctx.deps
        .logAudit(
          admin.id,
          admin.email,
          "ACCESS_CODE_GENERATED",
          "PromoCode",
          result.code,
          { courseId, expiresAt: result.expiresAt, maxUses: result.maxUses },
          req.ip,
        )
        .catch(() => undefined);

      res.status(201).json(result);
    } catch (error) {
      handleAccessCodeError(error, res);
    }
  });

  /**
   * POST /api/admin/modules/:courseId/access-codes/list
   * Admin: list existing access codes for a module (promo codes with [Code acces] prefix).
   */
  app.get("/api/admin/modules/:courseId/access-codes", requireAuth, requireAdmin, async (req, res) => {
    try {
      const courseId = api.parsePositiveInt(req.params.courseId);
      if (!courseId) return void res.status(400).json({ error: "Identifiant de module invalide" });

      const codes = await ctx.deps.prisma.promoCode.findMany({
        where: {
          modules: { some: { courseId } },
          internalName: { startsWith: "[Code acces]" },
        },
        select: {
          id: true,
          code: true,
          internalName: true,
          administrativeStatus: true,
          startsAt: true,
          endsAt: true,
          maxTotalUses: true,
          totalConfirmedUses: true,
          totalReservedUses: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      res.json(codes);
    } catch (error) {
      handleAccessCodeError(error, res);
    }
  });

  /**
   * POST /api/modules/:courseId/access-code/validate
   * Student: validate an access code (must result in 100% discount).
   * Returns { valid: true, code } on success so the frontend can proceed to free-enroll.
   */
  app.post("/api/modules/:courseId/access-code/validate", requireAuth, async (req, res) => {
    try {
      const user = getAuthUser(req);
      if (user.role !== "STUDENT") {
        return void res.status(403).json({ error: "Cette action est reservee aux etudiants.", code: "STUDENT_ONLY" });
      }
      const courseId = api.parsePositiveInt(req.params.courseId);
      if (!courseId) return void res.status(400).json({ error: "Identifiant de module invalide" });

      const code = String(req.body?.code || "").trim();
      const result = await validateAccessCodeForRedemption(user.id, courseId, code);
      res.json({ valid: true, code: result.code, finalAmount: result.finalAmount });
    } catch (error) {
      handleAccessCodeError(error, res);
    }
  });
}
