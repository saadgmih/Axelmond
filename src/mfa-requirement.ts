import type { Request } from "express";
import { isTeacherSpaceRole, normalizeApiRoutePath, normalizeRole } from "./rbac";
import { userHasPasskeys } from "./mfa-totp";

const MFA_SETUP_EXEMPT_PATHS = new Set(["/api/auth/me", "/api/auth/logout", "/api/auth/refresh"]);

const MFA_SETUP_EXEMPT_PREFIXES = ["/api/auth/mfa"];

export function isPrivilegedAccountRole(role: unknown): boolean {
  const normalized = normalizeRole(role);
  if (!normalized) return false;
  return isTeacherSpaceRole(normalized) || normalized === "ADMIN";
}

export function isMfaSetupExemptRoute(req: Pick<Request, "method" | "path" | "baseUrl">): boolean {
  if (req.method.toUpperCase() === "OPTIONS") return true;
  const apiPath = normalizeApiRoutePath(req);
  if (MFA_SETUP_EXEMPT_PATHS.has(apiPath)) return true;
  return MFA_SETUP_EXEMPT_PREFIXES.some((prefix) => apiPath === prefix || apiPath.startsWith(`${prefix}/`));
}

export async function privilegedUserRequiresMfaSetup(user: {
  id: string;
  totpEnabled: boolean;
}): Promise<boolean> {
  if (user.totpEnabled) return false;
  return !(await userHasPasskeys(user.id));
}

export function isPrivilegedMfaEnforced(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === "production";
}
