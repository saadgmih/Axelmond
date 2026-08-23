// ─── Pagination opt-in du catalogue académique ──────────────────────────────
//
// GET /api/courses?page=1&pageSize=50 (plafonnée à 100) renvoie
// { items, page, pageSize, total, totalPages }. Sans paramètre `page`,
// la réponse reste le tableau complet (rétrocompatible avec les clients
// et les tests existants).

export interface CatalogPagination {
  page: number;
  pageSize: number;
  isPaginated: boolean;
}

export const MAX_CATALOG_PAGE_SIZE = 100;
export const DEFAULT_CATALOG_PAGE_SIZE = 50;

export function parseCatalogPagination(query: Record<string, unknown>): CatalogPagination {
  const requestedPage = Number(query.page) || 0;
  const requestedPageSize = Number(query.pageSize) || 0;
  const isPaginated = Number.isInteger(requestedPage) && requestedPage >= 1;
  return {
    page: isPaginated ? requestedPage : 1,
    pageSize: Math.min(Math.max(requestedPageSize || DEFAULT_CATALOG_PAGE_SIZE, 1), MAX_CATALOG_PAGE_SIZE),
    isPaginated,
  };
}

/** Clé de cache fragment incluant la pagination (vide si non paginé). */
export function catalogPaginationCachePart(pagination: CatalogPagination): string {
  return pagination.isPaginated ? `:p=${pagination.page}:${pagination.pageSize}` : "";
}

/** Corps de réponse final : enveloppe paginée ou tableau brut. */
export function buildCatalogResponseBody<T>(items: T[], pagination: CatalogPagination, total: number | null): string {
  if (pagination.isPaginated && total !== null) {
    return JSON.stringify({
      items,
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
    });
  }
  return JSON.stringify(items);
}
