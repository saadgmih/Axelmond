import type { Express } from "express";
import type { RouteContext } from "../server/route-context";
import { registerRegisterLoginRoutes } from "./auth/register-login-routes";
import { registerSessionRoutes } from "./auth/session-routes";
import { registerEmailVerificationRoutes } from "./auth/email-verification-routes";
import { registerPasswordRoutes } from "./auth/password-routes";

export function registerAuthRoutes(app: Express, ctx: RouteContext): void {
  registerRegisterLoginRoutes(app, ctx);
  registerSessionRoutes(app, ctx);
  registerEmailVerificationRoutes(app, ctx);
  registerPasswordRoutes(app, ctx);
}
