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
   * POST /api/admin/access-codes/generate
   * Admin: generate an access code for one or multiple modules (or all modules), for a single student.
   */
  app.post("/api/admin/access-codes/generate", requireAuth, requireAdmin, async (req, res) => {
    try {
      const admin = getAuthUser(req);
      const courseIds = Array.isArray(req.body?.courseIds)
        ? req.body.courseIds.map((id: unknown) => Number(id)).filter((n: number) => Number.isInteger(n) && n > 0)
        : req.body?.courseId
          ? [Number(req.body.courseId)]
          : [];
      const allModules = Boolean(req.body?.allModules);
      const singleStudentOnly = req.body?.singleStudentOnly !== false;

      if (!allModules && courseIds.length === 0) {
        return void res.status(400).json({ error: "Veuillez sélectionner au moins un module ou 'Tous les modules'." });
      }

      const result = await generateEnrollmentAccessCode(
        admin.id,
        {
          courseIds,
          allModules,
        },
        {
          startsAt: req.body?.startsAt ? new Date(String(req.body.startsAt)) : undefined,
          endsAt: req.body?.endsAt ? new Date(String(req.body.endsAt)) : undefined,
          expiresInDays: Number(req.body?.expiresInDays) || undefined,
          maxUses: Number(req.body?.maxUses) || 1,
          label: req.body?.label ? String(req.body.label).slice(0, 100) : undefined,
          singleStudentOnly,
        },
      );

      await ctx.deps
        .logAudit(
          admin.id,
          admin.email,
          "ACCESS_CODE_GENERATED",
          "PromoCode",
          result.code,
          {
            courseIds: result.courseIds,
            allModules: result.allModules,
            singleStudentOnly: result.singleStudentOnly,
            expiresAt: result.expiresAt,
            maxUses: result.maxUses,
          },
          req.ip,
        )
        .catch(() => undefined);

      res.status(201).json(result);
    } catch (error) {
      handleAccessCodeError(error, res);
    }
  });

  /**
   * GET /api/admin/access-codes
   * Admin: list all access codes across all modules with usage and module details.
   */
  app.get("/api/admin/access-codes", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const codes = await ctx.deps.prisma.promoCode.findMany({
        where: {
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
          appliesToAllModules: true,
          createdAt: true,
          modules: {
            select: {
              course: {
                select: { id: true, title: true },
              },
            },
          },
          usages: {
            where: { status: "CONFIRMED" },
            select: {
              id: true,
              userId: true,
              createdAt: true,
              user: {
                select: { id: true, fullName: true, email: true },
              },
              course: {
                select: { id: true, title: true },
              },
            },
            take: 5,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 150,
      });

      res.json(codes);
    } catch (error) {
      handleAccessCodeError(error, res);
    }
  });

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
        singleStudentOnly: req.body?.singleStudentOnly !== false,
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
   * GET /api/admin/modules/:courseId/access-codes
   * Admin: list existing access codes for a module (promo codes with [Code acces] prefix).
   */
  app.get("/api/admin/modules/:courseId/access-codes", requireAuth, requireAdmin, async (req, res) => {
    try {
      const courseId = api.parsePositiveInt(req.params.courseId);
      if (!courseId) return void res.status(400).json({ error: "Identifiant de module invalide" });

      const codes = await ctx.deps.prisma.promoCode.findMany({
        where: {
          internalName: { startsWith: "[Code acces]" },
          OR: [{ appliesToAllModules: true }, { modules: { some: { courseId } } }],
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
          appliesToAllModules: true,
          createdAt: true,
          modules: {
            select: {
              course: {
                select: { id: true, title: true },
              },
            },
          },
          usages: {
            where: { status: "CONFIRMED" },
            select: {
              id: true,
              userId: true,
              createdAt: true,
              user: {
                select: { id: true, fullName: true, email: true },
              },
              course: {
                select: { id: true, title: true },
              },
            },
            take: 5,
          },
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
   * Returns { valid: true, code, modules, isMultiModule, appliesToAllModules, singleStudentOnly }
   */
  app.post("/api/modules/:courseId/access-code/validate", requireAuth, async (req, res) => {
    try {
      const user = getAuthUser(req);
      if (user.role !== "STUDENT" && user.role !== "ADMIN") {
        return void res.status(403).json({ error: "Cette action est réservée aux étudiants.", code: "STUDENT_ONLY" });
      }
      const courseId = api.parsePositiveInt(req.params.courseId);
      if (!courseId) return void res.status(400).json({ error: "Identifiant de module invalide" });

      const code = String(req.body?.code || "").trim();
      const result = await validateAccessCodeForRedemption(user.id, courseId, code);
      res.json({
        valid: true,
        code: result.code,
        finalAmount: result.finalAmount,
        modules: result.modules,
        isMultiModule: result.isMultiModule,
        appliesToAllModules: result.appliesToAllModules,
        singleStudentOnly: result.singleStudentOnly,
      });
    } catch (error) {
      handleAccessCodeError(error, res);
    }
  });
}
