import type express from "express";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;

/** Ensures rejected promises from async route handlers reach Express error middleware. */
export function patchExpressAsyncRoutes(app: express.Application) {
  for (const method of HTTP_METHODS) {
    const original = app[method].bind(app);
    app[method] = ((path: string, ...handlers: express.RequestHandler[]) => {
      const wrappedHandlers = handlers.map((handler) => {
        if (typeof handler !== "function" || handler.length >= 4) {
          return handler;
        }
        return (req: express.Request, res: express.Response, next: express.NextFunction) => {
          Promise.resolve(handler(req, res, next)).catch(next);
        };
      });
      return original(path, ...wrappedHandlers);
    }) as typeof app[typeof method];
  }
}
