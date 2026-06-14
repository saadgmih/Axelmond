/** Match Express route registration even when Prettier breaks arguments across lines. */
export function matchAppRoute(
  source: string,
  method: "get" | "post" | "put" | "patch" | "delete",
  routePath: string,
): boolean {
  const escapedPath = routePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`app\\.${method}\\(\\s*"${escapedPath}"`).test(source);
}

/** Match a middleware chain segment after a route path. */
export function matchAppRouteWithMiddleware(
  source: string,
  method: "get" | "post" | "put" | "patch" | "delete",
  routePath: string,
  middleware: string[],
): boolean {
  const escapedPath = routePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const middlewarePattern = middleware.map((name) => `(?:[\\s\\S]*?${name})`).join("");
  return new RegExp(`app\\.${method}\\(\\s*"${escapedPath}"${middlewarePattern}`).test(source);
}

/** Match Express app.use registration even when Prettier breaks arguments across lines. */
export function matchAppUse(source: string, routePath: string, middleware?: string): boolean {
  const escapedPath = routePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (middleware) {
    return new RegExp(`app\\.use\\(\\s*"${escapedPath}"[\\s\\S]*?${middleware}`).test(source);
  }
  return new RegExp(`app\\.use\\(\\s*"${escapedPath}"`).test(source);
}

/** Match source text allowing Prettier line breaks between chained calls. */
export function matchChainedCall(source: string, objectName: string, methodName: string): boolean {
  return new RegExp(`${objectName}[\\s\\S]*?\\.${methodName}\\(`).test(source);
}
