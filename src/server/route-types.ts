import type { Request } from "express";
import type { AppUser } from "../shared/app-user";

export type { AppUser };

export interface AuthenticatedRequest extends Request {
  authUser: AppUser;
}

export function setAuthUser(req: Request, user: AppUser): void {
  (req as AuthenticatedRequest).authUser = user;
}

export function getAuthUser(req: Request): AppUser {
  return (req as AuthenticatedRequest).authUser;
}

export function tryGetAuthUser(req: Request): AppUser | undefined {
  return (req as Partial<AuthenticatedRequest>).authUser;
}
