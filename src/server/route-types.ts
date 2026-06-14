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
