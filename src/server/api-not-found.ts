import type express from "express";

type ApiRouteLayer = { route?: { methods?: Record<string, boolean> }; regexp?: RegExp };

export function createUnknownApiRouteGuard(app: express.Express): express.RequestHandler {
  return (req, res, next) => {
    const pathname = req.originalUrl.split("?")[0] || req.originalUrl;
    const method = req.method.toLowerCase() === "head" ? "get" : req.method.toLowerCase();
    const routeStack = (app as unknown as { _router?: { stack?: ApiRouteLayer[] } })._router?.stack;
    const isRegisteredRoute = Boolean(
      routeStack?.some(
        (layer) => layer.route?.methods?.[method] && layer.regexp instanceof RegExp && layer.regexp.test(pathname),
      ),
    );
    const isRegisteredMiddlewareRoute = pathname.startsWith("/api/uploadthing");
    if (!isRegisteredRoute && !isRegisteredMiddlewareRoute) {
      res.status(404).json({ error: "Route API introuvable", code: "API_ROUTE_NOT_FOUND" });
      return;
    }
    next();
  };
}
