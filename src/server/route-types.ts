import type { Request } from "express";
import type { UserRole } from "../rbac";

export interface AppUser {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  role: UserRole;
  emailVerified: boolean;
  levelOrTitle: string;
  filiere?: string;
  avatarUrl?: string;
  enrolledCourses: number[];
  invoices: { id: string; date: string; courseTitle: string; amount: number; status: string }[];
}

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
