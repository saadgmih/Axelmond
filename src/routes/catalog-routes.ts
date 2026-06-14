import type { Express } from "express";
import type { RouteContext } from "../server/route-context";
import * as api from "../server/route-deps";

export function registerCatalogRoutes(app: Express, ctx: RouteContext): void {
  void ctx;

  app.get("/api/domains", async (req, res) => {
    const authUser = await api.getOptionalAuthUser(req);

    // Cache uniquement pour les visiteurs anonymes/étudiants (données publiées)

    const cacheKey = authUser && authUser.role !== "STUDENT" ? null : "api:domains:public";

    if (cacheKey) {
      const cached = await api.cacheGet(cacheKey);

      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }
    }

    const courseWhere =
      authUser?.role === "ADMIN"
        ? {}
        : authUser && (authUser.role === "PROFESSOR" || authUser.role === "RESEARCHER")
          ? { createdById: authUser.id }
          : { published: true };

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

  async function invalidatePublicCatalogCache(): Promise<void> {
    await api.cacheDel("api:domains:public");

    await api.cacheDelByPrefix("api:courses:public:");
  }
}
