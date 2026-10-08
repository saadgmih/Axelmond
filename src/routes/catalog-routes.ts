import type { Express } from "express";
import type { RouteContext } from "../server/route-context";
import { buildCatalogCourseVisibilityWhere } from "../catalog-visibility";
import { getActiveEnrolledCourseIds } from "../enrollment-access";
import { sendPublicJsonWithEtag } from "../server/http-cache";
import * as api from "../server/route-deps";

export function registerCatalogRoutes(app: Express, ctx: RouteContext): void {
  void ctx;

  app.get("/api/domains", async (req, res) => {
    const authUser = await api.getOptionalAuthUser(req);
    const dbUser = authUser ? await api.getOptionalAuthDbUser(req) : null;
    const bypassCache = req.query.fresh === "1";

    // Cache pour visiteurs anonymes, étudiants, admins et enseignants
    let cacheKey: string | null = null;
    if (!bypassCache) {
      if (!authUser || authUser.role === "STUDENT") {
        cacheKey = "api:domains:public";
      } else if (authUser.role === "ADMIN") {
        cacheKey = "api:domains:admin";
      } else {
        cacheKey = `api:domains:teacher:${authUser.id}`;
      }
    }

    if (cacheKey && !bypassCache) {
      const cached = await api.cacheGet(cacheKey);

      if (cached) {
        if (cacheKey === "api:domains:public") {
          sendPublicJsonWithEtag(req, res, cached);
        } else {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.send(cached);
        }
        return;
      }
    }

    const studentEnrolledIds =
      authUser?.role === "STUDENT" && dbUser ? getActiveEnrolledCourseIds(dbUser.enrollments) : [];

    const courseWhere = buildCatalogCourseVisibilityWhere({
      role: authUser?.role ?? null,
      userId: authUser?.id ?? null,
      fullName: authUser?.fullName ?? null,
      studentEnrolledIds,
    });

    const [domains, courseCounts] = await Promise.all([
      api.prisma.facultyDomain.findMany({
        include: { disciplines: { orderBy: { order: "asc" } } },

        orderBy: { order: "asc" },
      }),

      api.prisma.course.groupBy({
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

      return api.toDomain({
        ...domain,

        courseCount: disciplines.reduce((sum, discipline) => sum + discipline.courseCount, 0),

        disciplines,
      });
    });

    api.logDb("INFO", "Academic domains listed", { userId: authUser?.id, domains: payload.length });

    const responseBody = JSON.stringify(payload);

    if (cacheKey) {
      await api.cacheSet(cacheKey, responseBody, Number(process.env.DOMAINS_CACHE_SECONDS) || 3600);
    }

    if (cacheKey === "api:domains:public") {
      sendPublicJsonWithEtag(req, res, responseBody);
    } else {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.send(responseBody);
    }
  });
}
