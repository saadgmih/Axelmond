import type { NextFunction, Request, Response } from "express";
import { hasMobileClientHeader, isMobileClientRequest, MOBILE_CLIENT_HEADER } from "./auth-mobile";
import { logSecurity } from "./security-logger";

export function isMobileClientSpoofAttempt(
  req: Pick<Request, "headers">,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!hasMobileClientHeader(req)) return false;
  return !isMobileClientRequest(req, env);
}

export function mobileClientSpoofGuard(req: Request, res: Response, next: NextFunction): void {
  if (!req.path.startsWith("/api/")) {
    next();
    return;
  }

  if (!isMobileClientSpoofAttempt(req)) {
    next();
    return;
  }

  logSecurity("WARN", "Mobile client header spoof rejected", {
    path: req.path,
    method: req.method,
    ip: req.ip,
    header: MOBILE_CLIENT_HEADER,
  });

  res.status(403).json({
    error: "Client mobile non autorisé",
    code: "MOBILE_CLIENT_REJECTED",
  });
}
