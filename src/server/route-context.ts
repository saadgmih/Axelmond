import type { RequestHandler } from "express";
import type { z } from "zod";
import type * as RouteDeps from "./route-deps";

export type RouteMiddleware = {
  requireAuth: RequestHandler;
  requireRbac: RequestHandler;
  requireGlobalApiRbac: RequestHandler;
  requireAdmin: RequestHandler;
  validateBody: (schema: z.ZodTypeAny) => RequestHandler;
};

export type RouteContext = {
  middleware: RouteMiddleware;
  deps: typeof RouteDeps;
};

export function createRouteContext(deps: typeof RouteDeps): RouteContext {
  const { requireAuth, requireRbac, requireGlobalApiRbac, requireAdmin, validateBody } = deps;
  return {
    middleware: { requireAuth, requireRbac, requireGlobalApiRbac, requireAdmin, validateBody },
    deps,
  };
}
