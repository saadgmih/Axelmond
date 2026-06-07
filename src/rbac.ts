export type UserRole = "STUDENT" | "PROFESSOR" | "RESEARCHER" | "ADMIN";
export type UiRole = "student" | "teacher";

const roleAliases: Record<string, UserRole> = {
  student: "STUDENT",
  STUDENT: "STUDENT",
  teacher: "PROFESSOR",
  professor: "PROFESSOR",
  PROF: "PROFESSOR",
  PROFESSOR: "PROFESSOR",
  researcher: "RESEARCHER",
  chercheur: "RESEARCHER",
  RESEARCHER: "RESEARCHER",
  admin: "ADMIN",
  ADMIN: "ADMIN",
};

const teacherSpaceRoles: UserRole[] = ["PROFESSOR", "RESEARCHER", "ADMIN"];

export function normalizeRole(role: unknown): UserRole | null {
  if (typeof role !== "string") return null;
  return roleAliases[role.trim()] || null;
}

export function isStudentRole(role: unknown): boolean {
  return normalizeRole(role) === "STUDENT";
}

export function isTeacherSpaceRole(role: unknown): boolean {
  const normalized = normalizeRole(role);
  return normalized ? teacherSpaceRoles.includes(normalized) : false;
}

export function canManageContent(role: unknown): boolean {
  return isTeacherSpaceRole(role);
}

export function canAccessAcademicProfile(role: unknown): boolean {
  return isTeacherSpaceRole(role);
}

export function getAllowedUiRole(role: unknown): UiRole {
  return isTeacherSpaceRole(role) ? "teacher" : "student";
}

export function canLoginToRequestedRole(actualRole: unknown, requestedRole: unknown): boolean {
  const actual = normalizeRole(actualRole);
  const requested = normalizeRole(requestedRole);
  if (!actual || !requested) return false;
  if (requested === "STUDENT") return actual === "STUDENT";
  if (requested === "PROFESSOR") return teacherSpaceRoles.includes(actual);
  return actual === requested;
}

export function getRoleLabel(role: unknown): string {
  const normalized = normalizeRole(role);
  if (normalized === "STUDENT") return "Étudiant";
  if (normalized === "RESEARCHER") return "Chercheur";
  if (normalized === "ADMIN") return "Administrateur";
  return "Professeur";
}

export function getRedirectPathForRole(role: unknown, pathname: string): string | null {
  const normalized = normalizeRole(role);
  if (!normalized) return "/login";

  const path = pathname.toLowerCase();
  const isTeacherPath = path.startsWith("/teacher") || path.startsWith("/professor") || path.startsWith("/admin");
  const isStudentPath = path.startsWith("/student") || path.startsWith("/catalog") || path.startsWith("/course") || path.startsWith("/profile") || path.startsWith("/dashboard");

  if (normalized === "STUDENT" && isTeacherPath) return "/student";
  if (teacherSpaceRoles.includes(normalized) && isStudentPath) return "/teacher";
  return null;
}

export function canAccessApiRoute(role: unknown, method: string, path: string): boolean {
  const normalized = normalizeRole(role);
  if (!normalized) return false;

  const verb = method.toUpperCase();
  const cleanPath = path.split("?")[0];

  if (verb === "POST" && cleanPath === "/api/courses") {
    return teacherSpaceRoles.includes(normalized);
  }

  if (verb === "POST" && /^\/api\/courses\/\d+\/modules\/\d+\/complete$/.test(cleanPath)) {
    return normalized === "STUDENT";
  }

  if (verb === "POST" && /^\/api\/courses\/\d+\/modules\/\d+\/quiz-attempts$/.test(cleanPath)) {
    return normalized === "STUDENT";
  }

  if (verb === "POST" && /^\/api\/quizzes\/[^/]+\/attempts$/.test(cleanPath)) {
    return normalized === "STUDENT";
  }

  if (verb === "POST" && /^\/api\/courses\/\d+\/modules$/.test(cleanPath)) {
    return teacherSpaceRoles.includes(normalized);
  }

  if (verb === "POST" && /^\/api\/courses\/\d+\/chapters$/.test(cleanPath)) {
    return teacherSpaceRoles.includes(normalized);
  }

  if (verb === "POST" && /^\/api\/courses\/\d+\/sections$/.test(cleanPath)) {
    return teacherSpaceRoles.includes(normalized);
  }

  if ((verb === "PUT" || verb === "PATCH" || verb === "DELETE") && /^\/api\/courses\/\d+$/.test(cleanPath)) {
    return teacherSpaceRoles.includes(normalized);
  }

  if ((verb === "PUT" || verb === "PATCH" || verb === "DELETE") && /^\/api\/chapters\/[^/]+$/.test(cleanPath)) {
    return teacherSpaceRoles.includes(normalized);
  }

  if ((verb === "PUT" || verb === "PATCH" || verb === "DELETE") && /^\/api\/content-sections\/[^/]+$/.test(cleanPath)) {
    return teacherSpaceRoles.includes(normalized);
  }

  if ((verb === "POST") && /^\/api\/content-sections\/[^/]+\/contents$/.test(cleanPath)) {
    return teacherSpaceRoles.includes(normalized);
  }

  if ((verb === "PUT" || verb === "PATCH" || verb === "DELETE") && /^\/api\/lesson-contents\/[^/]+$/.test(cleanPath)) {
    return teacherSpaceRoles.includes(normalized);
  }

  if ((verb === "GET" || verb === "PUT") && cleanPath === "/api/me/profile") {
    return teacherSpaceRoles.includes(normalized);
  }

  if ((verb === "POST" || verb === "DELETE") && cleanPath === "/api/me/avatar") {
    return true;
  }

  if (verb === "POST" && cleanPath === "/api/me/password") {
    return teacherSpaceRoles.includes(normalized);
  }

  if (verb === "GET" && cleanPath === "/api/admin/academic-profiles") {
    return normalized === "ADMIN";
  }

  if (verb === "POST" && cleanPath === "/api/livekit/moderation") {
    return teacherSpaceRoles.includes(normalized);
  }

  if ((verb === "POST" && (cleanPath === "/api/livekit/events" || cleanPath === "/api/livekit/attendance/leave"))
    || (verb === "GET" && /^\/api\/livekit\/attendance\/\d+$/.test(cleanPath))) {
    return true;
  }

  if (verb === "PUT" && cleanPath === "/api/users/sync") {
    return normalized === "STUDENT";
  }

  // Routes quiz professeur (CRUD quiz)
  if (verb === "GET" && /^\/api\/courses\/\d+\/quizzes$/.test(cleanPath)) {
    return true;
  }
  if (verb === "POST" && /^\/api\/courses\/\d+\/quizzes$/.test(cleanPath)) {
    return teacherSpaceRoles.includes(normalized);
  }
  if ((verb === "PATCH" || verb === "DELETE") && /^\/api\/quizzes\/[^/]+$/.test(cleanPath)) {
    return teacherSpaceRoles.includes(normalized);
  }
  if (verb === "POST" && /^\/api\/quizzes\/[^/]+\/questions$/.test(cleanPath)) {
    return teacherSpaceRoles.includes(normalized);
  }
  if (verb === "DELETE" && /^\/api\/quiz-questions\/[^/]+$/.test(cleanPath)) {
    return teacherSpaceRoles.includes(normalized);
  }

  return false;
}
