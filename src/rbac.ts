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
  if (normalized === "ADMIN") return "Administrateur";
  return "Professeur";
}

/** Onglet de connexion — espace enseignant (professeur, admin). */
export function getTeacherLoginTabLabel(): string {
  return "Espace Professeur / Admin";
}

/** Sous-titre du secteur enseignant sur l'écran de connexion. */
export function getTeacherLoginSectorLabel(): string {
  return "Professeurs & Administration";
}

/** Titre de navigation sidebar selon le rôle connecté. */
export function getTeacherSpaceTitle(role: unknown): string {
  const normalized = normalizeRole(role);
  if (normalized === "ADMIN") return "Espace Administrateur";
  return "Espace Professeur";
}

export type TeacherRoleBadgeTone = "professor" | "admin";

export function getTeacherRoleBadgeTone(role: unknown): TeacherRoleBadgeTone {
  const normalized = normalizeRole(role);
  if (normalized === "ADMIN") return "admin";
  return "professor";
}

export function getRedirectPathForRole(role: unknown, pathname: string): string | null {
  const normalized = normalizeRole(role);
  if (!normalized) return "/login";

  const path = pathname.toLowerCase();
  const isTeacherPath = path.startsWith("/teacher") || path.startsWith("/professor") || path.startsWith("/admin");
  const isStudentPath =
    path.startsWith("/student") ||
    path.startsWith("/catalog") ||
    path.startsWith("/course") ||
    path.startsWith("/profile") ||
    path.startsWith("/dashboard");

  if (normalized === "STUDENT" && isTeacherPath) return "/student";
  if (teacherSpaceRoles.includes(normalized) && isStudentPath) return "/teacher";
  return null;
}

const RBAC_EXEMPT_AUTH_PATHS = new Set([
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/auth/verify-email",
  "/api/auth/resend-verification-code",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
]);

const RBAC_EXEMPT_PREFIXES = ["/api/uploadthing", "/api/paypal/webhook", "/api/admin/", "/api/auth/mfa"];

export function isRbacExemptRoute(method: string, path: string): boolean {
  const verb = method.toUpperCase();
  const cleanPath = path.split("?")[0];

  if (verb === "OPTIONS") return true;
  if (RBAC_EXEMPT_AUTH_PATHS.has(cleanPath)) return true;
  if (cleanPath === "/api/test-email") return true;

  if (RBAC_EXEMPT_PREFIXES.some((prefix) => cleanPath === prefix || cleanPath.startsWith(prefix))) {
    return true;
  }

  if (
    verb === "GET" &&
    (cleanPath === "/api/health" ||
      cleanPath === "/api/live" ||
      cleanPath === "/api/domains" ||
      cleanPath === "/api/courses" ||
      cleanPath === "/api/site-settings" ||
      cleanPath === "/api/mobile/routes" ||
      cleanPath === "/api/paypal/config" ||
      /^\/api\/courses\/\d+$/.test(cleanPath))
  ) {
    return true;
  }

  return false;
}

/** Rebuild /api/... path when middleware is mounted on app.use("/api", ...). */
export function normalizeApiRoutePath(req: { baseUrl?: string; path: string }): string {
  const joined = `${req.baseUrl || ""}${req.path || ""}`.split("?")[0];
  if (joined.startsWith("/api")) return joined;
  return `/api${joined.startsWith("/") ? joined : `/${joined}`}`;
}

export function canAccessApiRoute(role: unknown, method: string, path: string): boolean {
  const normalized = normalizeRole(role);
  if (!normalized) return false;

  const verb = method.toUpperCase();
  const cleanPath = path.split("?")[0];

  if (
    ((verb === "GET" || verb === "PUT") && cleanPath === "/api/onboarding") ||
    (verb === "POST" && cleanPath === "/api/onboarding/restart")
  ) {
    return true;
  }

  if (verb === "POST" && cleanPath === "/api/courses") {
    return teacherSpaceRoles.includes(normalized);
  }

  if (verb === "POST" && /^\/api\/courses\/\d+\/modules\/\d+\/complete$/.test(cleanPath)) {
    return normalized === "STUDENT";
  }

  if (verb === "PUT" && /^\/api\/courses\/\d+\/modules\/\d+\/progress$/.test(cleanPath)) {
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

  if (verb === "POST" && /^\/api\/courses\/\d+\/image$/.test(cleanPath)) {
    return teacherSpaceRoles.includes(normalized);
  }

  if (verb === "POST" && /^\/api\/courses\/\d+\/lesson-assets\/confirm$/.test(cleanPath)) {
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

  if (verb === "POST" && /^\/api\/content-sections\/[^/]+\/contents$/.test(cleanPath)) {
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
    return true;
  }

  if (verb === "GET" && cleanPath === "/api/me/schedule") {
    return teacherSpaceRoles.includes(normalized);
  }
  if (verb === "POST" && cleanPath === "/api/me/schedule") {
    return teacherSpaceRoles.includes(normalized);
  }
  if ((verb === "PUT" || verb === "DELETE") && /^\/api\/me\/schedule\/[^/]+$/.test(cleanPath)) {
    return teacherSpaceRoles.includes(normalized);
  }

  if (verb === "GET" && cleanPath === "/api/me/study-schedule") {
    return normalized === "STUDENT";
  }
  if (verb === "POST" && cleanPath === "/api/me/study-schedule") {
    return normalized === "STUDENT";
  }
  if ((verb === "PUT" || verb === "DELETE") && /^\/api\/me\/study-schedule\/[^/]+$/.test(cleanPath)) {
    return normalized === "STUDENT";
  }

  if (verb === "GET" && cleanPath === "/api/me/objectives") {
    return normalized === "STUDENT";
  }
  if (verb === "GET" && cleanPath === "/api/me/objectives/summary") {
    return normalized === "STUDENT";
  }
  if (verb === "POST" && cleanPath === "/api/me/objectives") {
    return normalized === "STUDENT";
  }
  if ((verb === "PUT" || verb === "DELETE") && /^\/api\/me\/objectives\/[^/]+$/.test(cleanPath)) {
    return normalized === "STUDENT";
  }
  if (verb === "PATCH" && /^\/api\/me\/objectives\/[^/]+\/complete$/.test(cleanPath)) {
    return normalized === "STUDENT";
  }

  if (
    verb === "GET" &&
    (cleanPath === "/api/conversations" ||
      cleanPath === "/api/messaging/users/search" ||
      cleanPath === "/api/notifications" ||
      cleanPath === "/api/notifications/unread-count" ||
      cleanPath === "/api/notifications/vapid-public-key")
  ) {
    return true;
  }
  if (
    verb === "POST" &&
    (cleanPath === "/api/conversations" ||
      cleanPath === "/api/notifications/read-all" ||
      cleanPath === "/api/notifications/push-subscribe")
  ) {
    return true;
  }
  if (verb === "PATCH" && /^\/api\/notifications\/[^/]+\/read$/.test(cleanPath)) {
    return true;
  }
  if ((verb === "GET" || verb === "POST") && /^\/api\/conversations\/[^/]+\/(messages|read)$/.test(cleanPath)) {
    return true;
  }
  if (verb === "POST" && /^\/api\/conversations\/[^/]+\/attachments\/confirm$/.test(cleanPath)) {
    return true;
  }
  if (verb === "DELETE" && /^\/api\/conversations\/[^/]+\/messages\/[^/]+$/.test(cleanPath)) {
    return true;
  }

  if (verb === "GET" && cleanPath === "/api/admin/academic-profiles") {
    return normalized === "ADMIN";
  }

  if (verb === "POST" && cleanPath === "/api/livekit/moderation") {
    return teacherSpaceRoles.includes(normalized);
  }

  if (verb === "POST" && cleanPath === "/api/livekit/sync") {
    return true;
  }

  if (verb === "POST" && (cleanPath === "/api/livekit/events" || cleanPath === "/api/livekit/attendance/leave")) {
    return true;
  }

  if (verb === "GET" && /^\/api\/livekit\/attendance\/\d+$/.test(cleanPath)) {
    return isTeacherSpaceRole(normalized);
  }

  // Routes quiz professeur (CRUD quiz)
  if (verb === "GET" && /^\/api\/courses\/\d+\/quizzes$/.test(cleanPath)) {
    return true;
  }
  if (verb === "GET" && /^\/api\/quizzes\/[^/]+$/.test(cleanPath)) {
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

  if (verb === "GET" && cleanPath === "/api/auth/me") {
    return true;
  }

  if (verb === "POST" && cleanPath === "/api/auth/sessions/revoke-all") {
    return true;
  }

  if (
    verb === "GET" &&
    (/^\/api\/courses\/\d+\/content$/.test(cleanPath) ||
      /^\/api\/courses\/\d+\/module-contents$/.test(cleanPath) ||
      /^\/api\/courses\/\d+\/chapters$/.test(cleanPath) ||
      /^\/api\/courses\/\d+\/grades$/.test(cleanPath) ||
      /^\/api\/courses\/\d+\/quizzes\/\d+$/.test(cleanPath) ||
      /^\/api\/lesson-contents\/[^/]+\/document$/.test(cleanPath))
  ) {
    return true;
  }

  if (verb === "GET" && /^\/api\/livekit\/messages\/\d+$/.test(cleanPath)) {
    return true;
  }

  if (
    verb === "POST" &&
    (cleanPath === "/api/livekit/token" ||
      cleanPath === "/api/livekit/messages" ||
      cleanPath === "/api/paypal/create-order" ||
      cleanPath === "/api/paypal/capture-order" ||
      cleanPath === "/api/payments/enroll-mock" ||
      cleanPath === "/api/contact" ||
      cleanPath === "/api/support/tickets")
  ) {
    return true;
  }

  if (verb === "POST" && /^\/api\/courses\/\d+\/free-enroll$/.test(cleanPath)) {
    return normalized === "STUDENT";
  }

  if (verb === "POST" && cleanPath === "/api/chat-tutor") {
    return normalized === "STUDENT";
  }

  if (verb === "GET" && cleanPath === "/api/mobile/student-profile") {
    return normalized === "STUDENT";
  }

  if (cleanPath.startsWith("/api/charity/")) {
    return true;
  }

  return false;
}
