import type { UserRole } from "../rbac";
import type { Invoice } from "../types";

/** Canonical session user shape — shared by API responses, server auth, and client state. */
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
  aiTutorCourseIds: number[];
  invoices: Invoice[];
  /** Present only immediately after login/refresh on the client. */
  token?: string;
  csrfToken?: string;
}

export type ClientSessionUser = AppUser;
