// ─── Construction de la requête catalogue académique ────────────────────────
// Extrait de courses-routes.ts pour garder ce module sous sa limite de taille
// (tests/server-routes-modular.test.ts) et isoler la logique de requête.

import type { Prisma } from "@prisma/client";
import * as api from "../server/route-deps";

const CATALOG_QUERY_TIMEOUT_MS = Number(process.env.CATALOG_QUERY_TIMEOUT_MS) || 15000;

export async function withCatalogTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${CATALOG_QUERY_TIMEOUT_MS}ms`));
        }, CATALOG_QUERY_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Where Prisma filtré par discipline directe ou par toutes les disciplines
 * d'un domaine. `visibilityWhere` (droits de visibilité catalogue) est
 * fusionné en amont par l'appelant.
 */
export async function resolveCourseCatalogWhere(
  visibilityWhere: Prisma.CourseWhereInput,
  domainId: number,
  disciplineId: number,
): Promise<Prisma.CourseWhereInput> {
  const where: Prisma.CourseWhereInput = { ...visibilityWhere };

  if (Number.isInteger(disciplineId) && disciplineId > 0) {
    return { ...where, disciplineId };
  }

  if (Number.isInteger(domainId) && domainId > 0) {
    const disciplineIds = await withCatalogTimeout(
      api.prisma.discipline.findMany({
        where: { domainId },
        select: { id: true },
      }),
      "discipline lookup",
    );
    return { ...where, disciplineId: { in: disciplineIds.map((discipline) => discipline.id) } };
  }

  return where;
}
