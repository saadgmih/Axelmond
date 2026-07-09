import type { Express } from "express";
import type { RouteContext } from "../server/route-context";
import { buildCatalogCourseVisibilityWhere } from "../catalog-visibility";
import { getActiveEnrolledCourseIds } from "../enrollment-access";
import * as api from "../server/route-deps";

export function registerCatalogRoutes(app: Express, ctx: RouteContext): void {
  void ctx;

  app.get("/api/domains", async (req, res) => {
    const authUser = await api.getOptionalAuthUser(req);
    const dbUser = authUser ? await api.getOptionalAuthDbUser(req) : null;
    const bypassCache = req.query.fresh === "1";

    // Cache uniquement pour les visiteurs anonymes/étudiants (données publiées)

    const cacheKey = authUser && authUser.role !== "STUDENT" ? null : "api:domains:public";

    if (cacheKey && !bypassCache) {
      const cached = await api.cacheGet(cacheKey);

      if (cached) {
        res.json(JSON.parse(cached));
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

    if (cacheKey) await api.cacheSet(cacheKey, JSON.stringify(payload), Number(process.env.CACHE_TTL_SECONDS) || 60);

    res.json(payload);
  });
}
