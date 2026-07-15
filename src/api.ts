import { purgeLegacySessionUserStorage } from "./session-storage";
import type { Discipline, FacultyDomain } from "./types";
import type { OnboardingSnapshot, OnboardingUpdate } from "./onboarding/onboarding-types";

export interface SiteSettings {
  forceDesktopMode: boolean;
}

const BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL || "").replace(/\/$/, "");
const LEGACY_ACCESS_TOKEN_KEY = "axelmond_session_token";
const LEGACY_REFRESH_TOKEN_KEY = "axelmond_refresh_token";
const CSRF_COOKIE_NAME = "csrf_token";
const UNSAFE_HTTP_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const API_REQUEST_TIMEOUT_MS = Number((import.meta as any).env?.VITE_API_TIMEOUT_MS) || 20_000;
const API_LONG_REQUEST_TIMEOUT_MS = Number((import.meta as any).env?.VITE_API_LONG_TIMEOUT_MS) || 45_000;
const LONG_REQUEST_PATH_PREFIXES = ["/api/paypal/", "/api/chat-tutor", "/api/contact", "/api/support"];
const AUTH_PATHS_WITHOUT_REFRESH = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/verify-email",
  "/api/auth/resend-verification-code",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/refresh",
  "/api/auth/logout",
]);

let refreshPromise: Promise<string | null> | null = null;
let sessionExpiredNotified = false;
let accessTokenMemory: string | null = null;
let csrfTokenMemory: string | null = null;
let refreshedSessionUserMemory: Record<string, unknown> | null = null;

function buildApiErrorMessage(method: string, path: string, status: number, payload: any, fallback: string) {
  return payload?.error || payload?.message || fallback;
}

function readCsrfFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function getCsrfToken(): string | null {
  const fromCookie = readCsrfFromCookie();
  if (fromCookie) {
    csrfTokenMemory = fromCookie;
    return fromCookie;
  }
  return csrfTokenMemory;
}

function purgeLegacyTokenStorage() {
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  purgeLegacySessionUserStorage();
}

function getRequestTimeoutMs(path: string): number {
  return LONG_REQUEST_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))
    ? API_LONG_REQUEST_TIMEOUT_MS
    : API_REQUEST_TIMEOUT_MS;
}

function buildRequestOptions(method: string, body: unknown, token: string | null, timeoutMs: number): RequestInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (UNSAFE_HTTP_METHODS.has(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  }

  const opts: RequestInit = {
    method,
    credentials: "include",
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  return opts;
}

function notifySessionExpired() {
  if (sessionExpiredNotified) return;
  sessionExpiredNotified = true;
  window.dispatchEvent(new CustomEvent("axelmond:session-expired"));
}

function clearSessionTokens() {
  accessTokenMemory = null;
  csrfTokenMemory = null;
  refreshedSessionUserMemory = null;
  purgeLegacyTokenStorage();
}

async function performSessionRefresh(): Promise<string | null> {
  const legacyRefreshToken = localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY);
  // Web: refresh uses HttpOnly cookie + CSRF double-submit. Without a CSRF cookie/memory
  // (and no legacy mobile body token), skip the call — otherwise csrfProtection returns
  // 403 before the route runs, which spams logs on anonymous boot.
  if (!legacyRefreshToken && !getCsrfToken()) {
    return null;
  }
  const body = legacyRefreshToken ? { refreshToken: legacyRefreshToken } : undefined;

  try {
    const res = await fetch(
      `${BASE_URL}/api/auth/refresh`,
      buildRequestOptions("POST", body, null, API_REQUEST_TIMEOUT_MS),
    );
    if (!res.ok) throw new Error("Refresh token rejected");
    const payload = await res.json();
    if (!payload?.token) throw new Error("Refresh token response missing access token");
    accessTokenMemory = payload.token;
    const sessionUser = { ...payload };
    delete sessionUser.token;
    delete sessionUser.csrfToken;
    delete sessionUser.refreshToken;
    refreshedSessionUserMemory = typeof sessionUser.id === "string" ? sessionUser : null;
    if (payload.csrfToken) csrfTokenMemory = payload.csrfToken;
    const cookieCsrf = readCsrfFromCookie();
    if (cookieCsrf) csrfTokenMemory = cookieCsrf;
    purgeLegacyTokenStorage();
    sessionExpiredNotified = false;
    return payload.token;
  } catch (err) {
    console.warn("[auth] Session refresh failed", err);
    clearSessionTokens();
    notifySessionExpired();
    return null;
  }
}

export async function refreshSessionToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performSessionRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function isAccessTokenFresh(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp !== "number" || payload.exp > Math.floor(Date.now() / 1000) + 30;
  } catch {
    return false;
  }
}

export async function getFreshSessionToken(): Promise<string | null> {
  if (accessTokenMemory && isAccessTokenFresh(accessTokenMemory)) return accessTokenMemory;
  return refreshSessionToken();
}

export function takeRefreshedSessionUser<T>(): T | null {
  const user = refreshedSessionUserMemory as T | null;
  refreshedSessionUserMemory = null;
  return user;
}

export function getStoredRefreshToken(): string | null {
  return null;
}

async function request<T>(method: string, path: string, body?: unknown, allowCsrfRetry = true): Promise<T> {
  let token = accessTokenMemory;
  const url = `${BASE_URL}${path}`;
  const timeoutMs = getRequestTimeoutMs(path);
  let res: Response;
  try {
    res = await fetch(url, buildRequestOptions(method, body, token, timeoutMs));
    if (res.status === 401 && !AUTH_PATHS_WITHOUT_REFRESH.has(path)) {
      token = await refreshSessionToken();
      if (token) res = await fetch(url, buildRequestOptions(method, body, token, timeoutMs));
    }
  } catch (err: any) {
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    const error = new Error(
      timedOut
        ? "Le serveur met trop de temps à répondre. Veuillez réessayer."
        : "Erreur de connexion au serveur. Veuillez vérifier votre connexion internet et réessayer.",
    ) as Error & Record<string, unknown>;
    Object.assign(error, { status: 0, method, path, url, timeout: timedOut, timeoutMs, cause: err });
    throw error;
  }

  if (!res.ok) {
    const text = await res.text();
    let err: any;
    try {
      err = text ? JSON.parse(text) : { error: res.statusText };
    } catch {
      err = { error: text || res.statusText };
    }

    if (
      allowCsrfRetry &&
      res.status === 403 &&
      err?.code === "CSRF_TOKEN_INVALID" &&
      UNSAFE_HTTP_METHODS.has(method) &&
      !AUTH_PATHS_WITHOUT_REFRESH.has(path)
    ) {
      csrfTokenMemory = null;
      token = await refreshSessionToken();
      if (token) {
        return request<T>(method, path, body, false);
      }
    }

    const error = new Error(buildApiErrorMessage(method, path, res.status, err, res.statusText)) as Error &
      Record<string, unknown>;
    Object.assign(error, err, { status: res.status, method, path, url, response: text });
    if (res.status === 429) {
      const retryAfterHeader = res.headers.get("Retry-After");
      const resetHeader = res.headers.get("RateLimit-Reset") || res.headers.get("X-RateLimit-Reset");
      let retryAfterSeconds: number | undefined;
      if (retryAfterHeader) {
        retryAfterSeconds = parseInt(retryAfterHeader, 10);
      } else if (resetHeader) {
        const resetTimestamp = parseInt(resetHeader, 10);
        if (!isNaN(resetTimestamp)) {
          retryAfterSeconds = Math.max(0, resetTimestamp - Math.floor(Date.now() / 1000));
        }
      }
      const bodyRetryAfter = typeof err?.retryAfter === "number" ? err.retryAfter : undefined;
      Object.assign(error, {
        isRateLimit: true,
        retryAfter: bodyRetryAfter ?? retryAfterSeconds,
        maxAttempts: err?.maxAttempts,
      });
    }
    throw error;
  }
  return res.json();
}

export const api = {
  getOnboarding: () => request<OnboardingSnapshot>("GET", "/api/onboarding"),
  updateOnboarding: (data: OnboardingUpdate) => request<OnboardingSnapshot>("PUT", "/api/onboarding", data),
  restartOnboarding: () => request<OnboardingSnapshot>("POST", "/api/onboarding/restart", {}),
  getSiteSettings: () => request<SiteSettings>("GET", "/api/site-settings"),
  getAdminSiteSettings: () => request<SiteSettings>("GET", "/api/admin/site-settings"),
  updateAdminSiteSettings: (data: SiteSettings) => request<SiteSettings>("PUT", "/api/admin/site-settings", data),
  getDomains: (options?: { fresh?: boolean }) => {
    const query = options?.fresh ? "?fresh=1" : "";
    return request<any[]>("GET", `/api/domains${query}`);
  },
  getCourses: (filters?: { domainId?: number; disciplineId?: number; fresh?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.domainId) params.set("domainId", String(filters.domainId));
    if (filters?.disciplineId) params.set("disciplineId", String(filters.disciplineId));
    if (filters?.fresh) params.set("fresh", "1");
    const query = params.toString();
    return request<any[]>("GET", `/api/courses${query ? `?${query}` : ""}`);
  },
  getCourse: (id: number) => request<any>("GET", `/api/courses/${id}`),
  getCourseContent: (id: number) => request<any[]>("GET", `/api/courses/${id}/content`),
  getModuleContents: (id: number) => request<any[]>("GET", `/api/courses/${id}/module-contents`),
  createCourse: (data: {
    title: string;
    level: string;
    credits: number;
    duration: string;
    category?: string;
    disciplineId: number;
    price: number;
    freeAccessStartsAt?: string | null;
    freeAccessEndsAt?: string | null;
    freeAccessDurationDays?: number | null;
    instructor?: string;
    description: string;
    published: boolean;
  }) => request<any>("POST", "/api/courses", data),
  updateCourseDetails: (
    courseId: number,
    data: {
      title?: string;
      description?: string;
      level?: string;
      credits?: number;
      duration?: string;
      disciplineId?: number;
      price?: number;
      freeAccessStartsAt?: string | null;
      freeAccessEndsAt?: string | null;
      freeAccessDurationDays?: number | null;
      published?: boolean;
    },
  ) => request<any>("PUT", `/api/courses/${courseId}`, data),
  confirmCourseImage: (courseId: number, customId: string) =>
    request<any>("POST", `/api/courses/${courseId}/image`, { customId }),
  confirmLessonAsset: (
    courseId: number,
    data: {
      customId: string;
      sectionId: string | null;
      title: string;
      contentType: "VIDEO" | "PDF" | "IMAGE";
      published: boolean;
      fileName: string;
      mimeType: string;
      size: number;
    },
  ) => request<any>("POST", `/api/courses/${courseId}/lesson-assets/confirm`, data),
  deleteCourse: (courseId: number) => request<any>("DELETE", `/api/courses/${courseId}`),
  getChapters: (courseId: number) => request<any[]>("GET", `/api/courses/${courseId}/chapters`),
  createChapter: (courseId: number, data: { title: string; description?: string; published: boolean }) =>
    request<any>("POST", `/api/courses/${courseId}/chapters`, data),
  updateChapter: (
    chapterId: string,
    data: { title?: string; description?: string | null; published?: boolean; order?: number },
  ) => request<any>("PUT", `/api/chapters/${chapterId}`, data),
  publishChapter: (chapterId: string, published: boolean) =>
    request<any>("PATCH", `/api/chapters/${chapterId}`, { published }),
  deleteChapter: (chapterId: string) => request<any>("DELETE", `/api/chapters/${chapterId}`),
  createSection: (
    courseId: number,
    data: { title: string; description?: string; parentId?: string; chapterId?: string; published: boolean },
  ) => request<any>("POST", `/api/courses/${courseId}/sections`, data),
  createTextContent: (sectionId: string, data: { title: string; body: string; published: boolean }) =>
    request<any>("POST", `/api/content-sections/${sectionId}/contents`, data),
  putContentSection: (
    sectionId: string,
    data: { title?: string; description?: string | null; published?: boolean; order?: number },
  ) => request<any>("PUT", `/api/content-sections/${sectionId}`, data),
  updateContentSection: (
    sectionId: string,
    data: { title?: string; description?: string | null; published?: boolean },
  ) => request<any>("PATCH", `/api/content-sections/${sectionId}`, data),
  deleteContentSection: (sectionId: string) => request<any>("DELETE", `/api/content-sections/${sectionId}`),
  putLessonContent: (contentId: string, data: { title?: string; body?: string | null; published?: boolean }) =>
    request<any>("PUT", `/api/lesson-contents/${contentId}`, data),
  updateLessonContent: (contentId: string, data: { title?: string; body?: string | null; published?: boolean }) =>
    request<any>("PATCH", `/api/lesson-contents/${contentId}`, data),
  deleteLessonContent: (contentId: string) => request<any>("DELETE", `/api/lesson-contents/${contentId}`),
  getQuiz: (courseId: number, moduleId: number) =>
    request<any[]>("GET", `/api/courses/${courseId}/quizzes/${moduleId}`),
  submitQuizAttempt: (courseId: number, moduleId: number, answers: Record<string, string>) =>
    request<any>("POST", `/api/courses/${courseId}/modules/${moduleId}/quiz-attempts`, { answers }),
  getCourseGrades: (courseId: number) => request<any[]>("GET", `/api/courses/${courseId}/grades`),
  completeModule: (courseId: number, moduleId: number) =>
    request<any>("POST", `/api/courses/${courseId}/modules/${moduleId}/complete`),
  setModuleProgress: (courseId: number, moduleId: number, completed: boolean) =>
    request<any>("PUT", `/api/courses/${courseId}/modules/${moduleId}/progress`, { completed }),
  addModule: (courseId: number, data: { title: string; type: string; duration: string; contentMarkdown?: string }) =>
    request<any>("POST", `/api/courses/${courseId}/modules`, data),
  updateCourse: (
    courseId: number,
    data: {
      price?: number;
      freeAccessStartsAt?: string | null;
      freeAccessEndsAt?: string | null;
      freeAccessDurationDays?: number | null;
      isLiveNow?: boolean;
      liveSubject?: string | null;
      published?: boolean;
    },
  ) => request<any>("PATCH", `/api/courses/${courseId}`, data),
  getPayPalConfig: () =>
    request<{ clientId: string; env: "sandbox" | "live"; currency: string }>("GET", "/api/paypal/config"),
  createPayPalOrder: (courseId: number, promoCode?: string, includeAiAssistant?: boolean) =>
    request<{ id: string; currency?: string; amount?: string; amountMad?: string }>(
      "POST",
      "/api/paypal/create-order",
      { courseId, ...(promoCode ? { promoCode } : {}), ...(includeAiAssistant ? { includeAiAssistant: true } : {}) },
    ),
  capturePayPalOrder: (orderId: string, courseId: number) =>
    request<{ ok: boolean; invoice?: any; user?: any; message?: string }>("POST", "/api/paypal/capture-order", {
      orderId,
      courseId,
    }),
  freeEnrollCourse: (courseId: number, promoCode?: string, includeAiAssistant?: boolean) =>
    request<{ ok: boolean; invoice?: any; user?: any; message?: string }>(
      "POST",
      `/api/courses/${courseId}/free-enroll`,
      {
        ...(promoCode ? { promoCode } : {}),
        ...(includeAiAssistant ? { includeAiAssistant: true } : {}),
      },
    ),
  login: (email: string, password: string, role: string) =>
    request<any>("POST", "/api/auth/login", { email, password, role }),
  verifyMfaTotp: (mfaToken: string, code: string) =>
    request<any>("POST", "/api/auth/mfa/totp/verify", { mfaToken, code }),
  beginPasskeyLogin: (email?: string) =>
    request<any>("POST", "/api/auth/mfa/passkey/login/options", email ? { email } : {}),
  completePasskeyLogin: (challengeId: string, response: unknown, role?: string) =>
    request<any>("POST", "/api/auth/mfa/passkey/login/verify", { challengeId, response, role }),
  getMfaStatus: () => request<any>("GET", "/api/auth/mfa/status"),
  setupTotp: () => request<any>("POST", "/api/auth/mfa/totp/setup", {}),
  enableTotp: (challengeId: string, code: string) =>
    request<any>("POST", "/api/auth/mfa/totp/enable", { challengeId, code }),
  disableTotp: (password: string, code: string) =>
    request<any>("POST", "/api/auth/mfa/totp/disable", { password, code }),
  beginPasskeyRegister: (deviceName?: string) =>
    request<any>("POST", "/api/auth/mfa/passkey/register/options", deviceName ? { deviceName } : {}),
  completePasskeyRegister: (challengeId: string, response: unknown, deviceName?: string) =>
    request<any>("POST", "/api/auth/mfa/passkey/register/verify", { challengeId, response, deviceName }),
  deletePasskey: (id: string, password: string) => request<any>("DELETE", `/api/auth/mfa/passkeys/${id}`, { password }),
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    role: string;
    levelOrTitle?: string;
    filiere?: string;
    professorInviteCode?: string;
  }) => request<any>("POST", "/api/auth/register", data),
  verifyEmail: (email: string, code: string) => request<any>("POST", "/api/auth/verify-email", { email, code }),
  resendVerificationCode: (email: string) => request<any>("POST", "/api/auth/resend-verification-code", { email }),
  forgotPassword: (email: string) => request<any>("POST", "/api/auth/forgot-password", { email }),
  resetPassword: (email: string, code: string, newPassword: string) =>
    request<any>("POST", "/api/auth/reset-password", { email, code, newPassword }),
  sendTestEmail: (to: string) => request<any>("POST", "/api/test-email", { to }),
  getEmailDeliverySummary: () => request<any>("GET", "/api/admin/email-delivery-summary"),
  getEmailDeliveryLogs: () => request<any[]>("GET", "/api/admin/email-delivery-logs"),
  getProfessorInvites: () => request<any[]>("GET", "/api/admin/professor-invites"),
  createProfessorInvite: (data?: { code?: string }) => request<any>("POST", "/api/admin/professor-invites", data),
  deleteProfessorInvite: (code: string) => request<any>("DELETE", `/api/admin/professor-invites/${code}`),
  createAcademicDomain: (data: {
    name: string;
    slug?: string;
    iconName?: string;
    color?: string;
    description?: string;
    order?: number;
  }) => request<FacultyDomain>("POST", "/api/admin/academic-domains", data),
  updateAcademicDomain: (
    domainId: number,
    data: {
      name?: string;
      slug?: string;
      iconName?: string;
      color?: string;
      description?: string;
      order?: number;
    },
  ) => request<FacultyDomain>("PUT", `/api/admin/academic-domains/${domainId}`, data),
  deleteAcademicDomain: (domainId: number) =>
    request<{ ok: boolean }>("DELETE", `/api/admin/academic-domains/${domainId}`),
  createAcademicDiscipline: (
    domainId: number,
    data: {
      name: string;
      slug?: string;
      order?: number;
    },
  ) => request<Discipline>("POST", `/api/admin/academic-domains/${domainId}/disciplines`, data),
  updateAcademicDiscipline: (
    disciplineId: number,
    data: {
      domainId?: number;
      name?: string;
      slug?: string;
      order?: number;
    },
  ) => request<Discipline>("PUT", `/api/admin/academic-disciplines/${disciplineId}`, data),
  deleteAcademicDiscipline: (disciplineId: number) =>
    request<{ ok: boolean }>("DELETE", `/api/admin/academic-disciplines/${disciplineId}`),
  removeStudentFromCourse: (courseId: number, studentId: string) =>
    request<{
      ok: boolean;
      courseId: number;
      studentId: string;
      removedEnrollmentId: string;
      paidEnrollment: boolean;
    }>("DELETE", `/api/admin/courses/${courseId}/enrollments/${studentId}`),
  getAcademicProfile: () => request<any>("GET", "/api/me/profile"),
  updateAcademicProfile: (data: {
    title?: string;
    department?: string;
    lab?: string;
    speciality?: string;
    teachingDomains?: string[];
    researchDomains?: string[];
    bio?: string;
    avatarUrl?: string;
    links?: Record<string, string>;
  }) => request<any>("PUT", "/api/me/profile", data),
  updateAcademicAvatar: (avatarUrl: string) => request<any>("POST", "/api/me/avatar", { avatarUrl }),
  deleteAvatar: () => request<any>("DELETE", "/api/me/avatar"),
  changeAcademicPassword: (currentPassword: string, newPassword: string) =>
    request<any>("POST", "/api/me/password", { currentPassword, newPassword }),
  logout: () => request<any>("POST", "/api/auth/logout"),
  getAdminAcademicProfiles: () => request<any[]>("GET", "/api/admin/academic-profiles"),
  me: () => request<any>("GET", "/api/auth/me"),
  getLiveKitToken: (courseId: number) => request<any>("POST", "/api/livekit/token", { courseId }),
  getLiveMessages: (courseId: number) => request<any[]>("GET", `/api/livekit/messages/${courseId}`),
  saveLiveMessage: (courseId: number, message: { id: string | number; text: string }) =>
    request<any>("POST", "/api/livekit/messages", { courseId, messageId: message.id, text: message.text }),
  leaveLiveAttendance: (courseId: number) => request<any>("POST", "/api/livekit/attendance/leave", { courseId }),
  getLiveAttendance: (courseId: number) => request<any>("GET", `/api/livekit/attendance/${courseId}`),
  logLiveEvent: (data: {
    courseId: number;
    action: string;
    targetIdentity?: string | null;
    targetName?: string | null;
    details?: Record<string, unknown>;
  }) => request<any>("POST", "/api/livekit/events", data),
  moderateLiveParticipant: (data: {
    courseId: number;
    action: string;
    targetIdentity: string;
    targetName?: string | null;
    trackSid?: string | null;
  }) => request<any>("POST", "/api/livekit/moderation", data),
  publishLiveSync: (courseId: number, message: Record<string, unknown>) =>
    request<any>("POST", "/api/livekit/sync", { courseId, message }),
  getCourseQuizzes: (courseId: number) => request<any[]>("GET", `/api/courses/${courseId}/quizzes`),
  getQuizById: (quizId: string) => request<any>("GET", `/api/quizzes/${quizId}`),
  createCourseQuiz: (
    courseId: number,
    data: { moduleId?: number | null; sectionId?: string | null; title: string; published: boolean },
  ) => request<any>("POST", `/api/courses/${courseId}/quizzes`, data),
  updateQuiz: (quizId: string, data: { title?: string; published?: boolean }) =>
    request<any>("PATCH", `/api/quizzes/${quizId}`, data),
  deleteQuiz: (quizId: string) => request<any>("DELETE", `/api/quizzes/${quizId}`),
  submitQuizAttemptById: (quizId: string, answers: Record<string, string>) =>
    request<any>("POST", `/api/quizzes/${quizId}/attempts`, { answers }),
  addQuizQuestion: (
    quizId: string,
    data: { question: string; options: string[]; answer: string; explanation: string },
  ) => request<any>("POST", `/api/quizzes/${quizId}/questions`, data),
  deleteQuizQuestion: (questionId: string) => request<any>("DELETE", `/api/quiz-questions/${questionId}`),
  submitContact: (data: { name: string; email: string; subject: string; category: string; message: string }) =>
    request<any>("POST", "/api/contact", data),
  createSupportTicket: (data: {
    subject: string;
    category: string;
    description: string;
    screenshotUrl?: string | null;
  }) => request<any>("POST", "/api/support/tickets", data),
  getSchedule: () => request<any[]>("GET", "/api/me/schedule"),
  createScheduleSession: (data: {
    dayOfWeek: number;
    title: string;
    moduleName: string;
    startTime: string;
    endTime: string;
    sessionType: string;
    roomOrLink?: string;
    description?: string;
  }) => request<any>("POST", "/api/me/schedule", data),
  updateScheduleSession: (
    id: string,
    data: {
      dayOfWeek: number;
      title: string;
      moduleName: string;
      startTime: string;
      endTime: string;
      sessionType: string;
      roomOrLink?: string;
      description?: string;
    },
  ) => request<any>("PUT", `/api/me/schedule/${id}`, data),
  deleteScheduleSession: (id: string) => request<any>("DELETE", `/api/me/schedule/${id}`),
  getStudySchedule: () => request<any[]>("GET", "/api/me/study-schedule"),
  createStudyScheduleSession: (data: {
    dayOfWeek: number;
    title: string;
    moduleName: string;
    startTime: string;
    endTime: string;
    sessionType: string;
    roomOrLink?: string;
    description?: string;
  }) => request<any>("POST", "/api/me/study-schedule", data),
  updateStudyScheduleSession: (
    id: string,
    data: {
      dayOfWeek: number;
      title: string;
      moduleName: string;
      startTime: string;
      endTime: string;
      sessionType: string;
      roomOrLink?: string;
      description?: string;
    },
  ) => request<any>("PUT", `/api/me/study-schedule/${id}`, data),
  deleteStudyScheduleSession: (id: string) => request<any>("DELETE", `/api/me/study-schedule/${id}`),
  getStudentObjectives: () => request<any[]>("GET", "/api/me/objectives"),
  getStudentObjectivesSummary: () => request<any>("GET", "/api/me/objectives/summary"),
  createStudentObjective: (data: {
    title: string;
    description?: string;
    startAt: string;
    endAt: string;
    status?: "IN_PROGRESS" | "COMPLETED";
    objectiveType?: string;
    focusContentTitle?: string;
    focusContentUrl?: string;
    focusContentType?: string;
    recurrence?: string;
  }) => request<any>("POST", "/api/me/objectives", data),
  updateStudentObjective: (
    id: string,
    data: {
      title: string;
      description?: string;
      startAt: string;
      endAt: string;
      status?: "IN_PROGRESS" | "COMPLETED";
      objectiveType?: string;
      focusContentTitle?: string;
      focusContentUrl?: string;
      focusContentType?: string;
      recurrence?: string;
    },
  ) => request<any>("PUT", `/api/me/objectives/${id}`, data),
  completeStudentObjective: (id: string) => request<any>("PATCH", `/api/me/objectives/${id}/complete`),
  deleteStudentObjective: (id: string) => request<any>("DELETE", `/api/me/objectives/${id}`),
  searchMessagingUsers: (query: string) =>
    request<any[]>("GET", `/api/messaging/users/search?q=${encodeURIComponent(query)}`),
  getConversations: () => request<any[]>("GET", "/api/conversations"),
  createConversation: (participantUserId: string) => request<any>("POST", "/api/conversations", { participantUserId }),
  getConversationMessages: (conversationId: string) =>
    request<any[]>("GET", `/api/conversations/${conversationId}/messages`),
  sendConversationMessage: (conversationId: string, data: { body?: string; attachment?: unknown }) =>
    request<any>("POST", `/api/conversations/${conversationId}/messages`, data),
  confirmConversationAttachment: (
    conversationId: string,
    data: { storageKey: string; fileName: string; mimeType: string; sizeBytes: number },
  ) => request<any>("POST", `/api/conversations/${conversationId}/attachments/confirm`, data),
  deleteConversationMessage: (conversationId: string, messageId: string) =>
    request<{ ok: true; messageId: string; conversationId: string }>(
      "DELETE",
      `/api/conversations/${conversationId}/messages/${messageId}`,
    ),
  markConversationRead: (conversationId: string) => request<any>("POST", `/api/conversations/${conversationId}/read`),
  getNotifications: () => request<any[]>("GET", "/api/notifications"),
  getNotificationUnreadCount: () => request<{ count: number }>("GET", "/api/notifications/unread-count"),
  getVapidPublicKey: () =>
    request<{ publicKey: string; configured?: boolean }>("GET", "/api/notifications/vapid-public-key"),
  markNotificationRead: (id: string) => request<any>("PATCH", `/api/notifications/${id}/read`),
  markAllNotificationsRead: () => request<any>("POST", "/api/notifications/read-all"),
  subscribePushNotifications: (data: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
    request<any>("POST", "/api/notifications/push-subscribe", data),
  chatTutor: (data: {
    courseId: number;
    moduleId?: number;
    prompt: string;
    chatHistory?: Array<{ role: "user" | "model" | "assistant"; text: string }>;
  }) => request<{ text: string }>("POST", "/api/chat-tutor", data),

  getCharityAccessStatus: () =>
    request<{ pageEnabled: boolean; hasAccess: boolean; needsCode: boolean }>("GET", "/api/charity/access-status"),
  verifyCharityCode: (code: string) =>
    request<{ ok: boolean; hasAccess: boolean }>("POST", "/api/charity/verify-code", { code }),
  getCharityContent: () => request<any>("GET", "/api/charity/content"),
  createCharityPayPalOrder: (data: { campaignId: string; amount: number }) =>
    request<{ id: string; currency: string; amount: string; amountMad: string; donation: any }>(
      "POST",
      "/api/charity/donations/paypal/create-order",
      data,
    ),
  captureCharityPayPalOrder: (data: { orderId: string; donationId: string }) =>
    request<{ ok: boolean; message?: string; donation?: any; duplicate?: boolean }>(
      "POST",
      "/api/charity/donations/paypal/capture-order",
      data,
    ),
  pledgeCharityDonation: (data: { campaignId: string; amount: number }) =>
    request<any>("POST", "/api/charity/donations", data),

  getAdminCharitySettings: () => request<any>("GET", "/api/admin/charity/settings"),
  updateAdminCharitySettings: (pageEnabled: boolean) =>
    request<any>("PUT", "/api/admin/charity/settings", { pageEnabled }),
  getAdminCharityAccessCodes: () => request<any[]>("GET", "/api/admin/charity/access-codes"),
  createAdminCharityAccessCode: (data?: { deactivateOthers?: boolean }) =>
    request<any>("POST", "/api/admin/charity/access-codes", data),
  deactivateAdminCharityAccessCode: (id: string) =>
    request<any>("PATCH", `/api/admin/charity/access-codes/${id}/deactivate`),
  getAdminCharityCodeUsages: (id: string) => request<any[]>("GET", `/api/admin/charity/access-codes/${id}/usages`),
  getAdminCharityEvents: () => request<any[]>("GET", "/api/admin/charity/events"),
  createAdminCharityEvent: (data: Record<string, unknown>) => request<any>("POST", "/api/admin/charity/events", data),
  updateAdminCharityEvent: (id: string, data: Record<string, unknown>) =>
    request<any>("PUT", `/api/admin/charity/events/${id}`, data),
  deleteAdminCharityEvent: (id: string) => request<{ ok: boolean }>("DELETE", `/api/admin/charity/events/${id}`),
  getAdminCharityCampaigns: () => request<any[]>("GET", "/api/admin/charity/campaigns"),
  createAdminCharityCampaign: (data: { title: string; description: string; isActive?: boolean }) =>
    request<any>("POST", "/api/admin/charity/campaigns", data),
  updateAdminCharityCampaign: (id: string, data: Record<string, unknown>) =>
    request<any>("PUT", `/api/admin/charity/campaigns/${id}`, data),
  deleteAdminCharityCampaign: (id: string) => request<{ ok: boolean }>("DELETE", `/api/admin/charity/campaigns/${id}`),
  getAdminCharityDonations: () => request<any[]>("GET", "/api/admin/charity/donations"),
};

export function setSessionToken(token: string | undefined, csrfToken?: string) {
  purgeLegacyTokenStorage();
  if (token) {
    accessTokenMemory = token;
    if (csrfToken) csrfTokenMemory = csrfToken;
    sessionExpiredNotified = false;
  } else {
    clearSessionTokens();
  }
}
