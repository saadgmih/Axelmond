export const INSTITUTIONAL_VIEWS = new Set(["about", "contact", "support", "privacy", "terms", "cookies", "legal"]);

export const STUDENT_VIEWS = new Set([
  "dashboard",
  "catalog",
  "course",
  "profile",
  "account-security",
  "live",
  "study-plan",
  "study-schedule",
  "objectives",
  "messages",
  "notifications",
  "charity",
  "payments",
]);

export const TEACHER_VIEWS = new Set([
  "dashboard",
  "access-keys",
  "charity",
  "curriculum",
  "live-control",
  "academic-profile",
  "account-security",
  "schedule",
  "messages",
  "notifications",
  "center-payments",
  "promo-codes",
]);

export function isKnownPlatformPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0) return true;
  if (segments.length === 1 && INSTITUTIONAL_VIEWS.has(segments[0])) return true;
  if (segments.length === 1 && ["student", "teacher", "professor", "admin"].includes(segments[0])) return true;
  if (segments.length !== 2) return false;
  if (segments[0] === "student") return STUDENT_VIEWS.has(segments[1]);
  if (["teacher", "professor", "admin"].includes(segments[0])) return TEACHER_VIEWS.has(segments[1]);
  return false;
}

export function buildPlatformPath(role: "student" | "teacher", view: string, teacherView?: string) {
  if (role === "teacher") {
    const segment = teacherView || view || "dashboard";
    return `/teacher/${segment}`;
  }
  if (INSTITUTIONAL_VIEWS.has(view)) return `/${view}`;
  const segment = STUDENT_VIEWS.has(view) ? view : "dashboard";
  return `/student/${segment}`;
}

export function parsePlatformPath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const segments = normalized.split("/").filter(Boolean);

  if (segments.length === 0) {
    return {
      studentView: "dashboard" as const,
      teacherView: "dashboard" as const,
      institutionalView: null as string | null,
      notFound: false,
    };
  }

  if (segments[0] === "student") {
    const view = segments[1] || "dashboard";
    let studentView = STUDENT_VIEWS.has(view) ? view : "dashboard";
    if (view === "study-schedule" || view === "objectives") {
      studentView = "study-plan";
    }
    return {
      studentView,
      teacherView: "dashboard" as const,
      institutionalView: null as string | null,
      notFound: !STUDENT_VIEWS.has(view) || segments.length > 2,
    };
  }

  if (segments[0] === "teacher" || segments[0] === "professor" || segments[0] === "admin") {
    const teacherView = segments[1] || "dashboard";
    const normalizedTeacherView = TEACHER_VIEWS.has(teacherView) ? teacherView : "dashboard";
    return {
      studentView: "dashboard" as const,
      teacherView: normalizedTeacherView,
      institutionalView: null as string | null,
      notFound: !TEACHER_VIEWS.has(teacherView) || segments.length > 2,
    };
  }

  if (segments.length === 1 && INSTITUTIONAL_VIEWS.has(segments[0])) {
    return {
      studentView: segments[0],
      teacherView: "dashboard" as const,
      institutionalView: segments[0],
      notFound: false,
    };
  }

  return {
    studentView: "dashboard" as const,
    teacherView: "dashboard" as const,
    institutionalView: null as string | null,
    notFound: true,
  };
}

export function resolveInitialPlatformRoute(pathname: string) {
  const parsed = parsePlatformPath(pathname);
  return {
    currentView: parsed.notFound ? "not-found" : (parsed.institutionalView ?? parsed.studentView),
    teacherView: parsed.teacherView,
    notFound: parsed.notFound,
  };
}
