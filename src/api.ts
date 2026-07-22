import { purgeLegacySessionUserStorage } from "./session-storage";
import {
  getRetryDelayMs,
  isDefinitiveRefreshFailure,
  NETWORK_ERROR_MESSAGE,
  normalizeApiError,
  readApiResponseBody,
  shouldRetryHttpResponse,
  shouldRetryNetworkError,
  TEMPORARY_SERVICE_MESSAGE,
  TIMEOUT_ERROR_MESSAGE,
} from "./api-response";
import type { Discipline, FacultyDomain, QuizAttemptResult, QuizQuestion } from "./types";
import type { OnboardingSnapshot, OnboardingUpdate } from "./onboarding/onboarding-types";
import type {
  AdminCenterPaymentRequestView,
  CenterPaymentConfig,
  CenterPaymentMethod,
  CenterPaymentRequestView,
  CenterPaymentStatus,
} from "./center-payment-types";
import type { PromoCodeDetails, PromoCodeInput, PromoCodeView, PromoQuote } from "./promo-code-types";

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
const LONG_REQUEST_PATH_PREFIXES = ["/api/paypal/", "/api/contact", "/api/support"];
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
const API_MAX_IDEMPOTENT_RETRIES = 2;
const SESSION_UNAVAILABLE_EVENT = "axelmond:session-unavailable";
const SESSION_EXPIRED_EVENT = "axelmond:session-expired";

export type SessionRefreshState =
  | "idle"
  | "refreshing"
  | "anonymous"
  | "available"
  | "temporarily-unavailable"
  | "expired";

export type AuthenticationLifecycleState =
  | "AUTH_INITIALIZING"
  | "AUTHENTICATED"
  | "REFRESHING_SESSION"
  | "TEMPORARILY_OFFLINE"
  | "UNAUTHENTICATED";

let refreshPromise: Promise<string | null> | null = null;
let sessionExpiredNotified = false;
let accessTokenMemory: string | null = null;
let csrfTokenMemory: string | null = null;
let refreshedSessionUserMemory: Record<string, unknown> | null = null;
let lastSessionRefreshState: SessionRefreshState = "idle";
let authenticationLifecycleState: AuthenticationLifecycleState = "AUTH_INITIALIZING";
const inFlightGetRequests = new Map<string, Promise<unknown>>();

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
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

function notifySessionUnavailable(message = TEMPORARY_SERVICE_MESSAGE) {
  lastSessionRefreshState = "temporarily-unavailable";
  authenticationLifecycleState = "TEMPORARILY_OFFLINE";
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_UNAVAILABLE_EVENT, { detail: { message } }));
  }
}

function clearReadableCsrfCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${CSRF_COOKIE_NAME}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`;
}

function clearSessionTokens() {
  inFlightGetRequests.clear();
  accessTokenMemory = null;
  csrfTokenMemory = null;
  refreshedSessionUserMemory = null;
  purgeLegacyTokenStorage();
  clearReadableCsrfCookie();
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchWithTransientRetry(
  method: string,
  url: string,
  body: unknown,
  token: string | null,
  timeoutMs: number,
): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetch(url, buildRequestOptions(method, body, token, timeoutMs));
      if (!shouldRetryHttpResponse(method, response, attempt, API_MAX_IDEMPOTENT_RETRIES)) return response;
      await response.body?.cancel().catch(() => undefined);
      await sleep(getRetryDelayMs(attempt, response));
    } catch (error) {
      if (!shouldRetryNetworkError(method, attempt, API_MAX_IDEMPOTENT_RETRIES)) throw error;
      await sleep(getRetryDelayMs(attempt));
    }
  }
}

async function performSessionRefresh(): Promise<string | null> {
  const legacyRefreshToken = localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY);
  // Web: refresh uses HttpOnly cookie + CSRF double-submit. Without a CSRF cookie/memory
  // (and no legacy mobile body token), skip the call — otherwise csrfProtection returns
  // 403 before the route runs, which spams logs on anonymous boot.
  if (!legacyRefreshToken && !getCsrfToken()) {
    lastSessionRefreshState = "anonymous";
    authenticationLifecycleState = "UNAUTHENTICATED";
    return null;
  }
  const body = legacyRefreshToken ? { refreshToken: legacyRefreshToken } : undefined;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/auth/refresh`, buildRequestOptions("POST", body, null, API_REQUEST_TIMEOUT_MS));
  } catch (error: unknown) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    console.warn("[auth] Session refresh temporarily unavailable", { timedOut });
    notifySessionUnavailable(timedOut ? TIMEOUT_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE);
    return null;
  }

  const parsed = await readApiResponseBody(res);
  if (!res.ok) {
    if (isDefinitiveRefreshFailure(res, parsed)) {
      lastSessionRefreshState = "expired";
      authenticationLifecycleState = "UNAUTHENTICATED";
      clearSessionTokens();
      notifySessionExpired();
      return null;
    }

    const normalized = normalizeApiError(res, parsed);
    console.warn("[auth] Session refresh temporarily unavailable", {
      status: res.status,
      responseKind: normalized.responseKind,
      requestId: normalized.requestId,
    });
    notifySessionUnavailable(normalized.message);
    return null;
  }

  if (parsed.kind !== "json" || !parsed.payload || Array.isArray(parsed.payload)) {
    console.warn("[auth] Session refresh returned an unexpected response", { responseKind: parsed.kind });
    notifySessionUnavailable();
    return null;
  }

  const payload = parsed.payload;
  if (typeof payload.token !== "string" || !payload.token) {
    console.warn("[auth] Session refresh response did not contain an access token");
    notifySessionUnavailable();
    return null;
  }

  accessTokenMemory = payload.token;
  const sessionUser = { ...payload };
  delete sessionUser.token;
  delete sessionUser.csrfToken;
  delete sessionUser.refreshToken;
  refreshedSessionUserMemory = typeof sessionUser.id === "string" ? sessionUser : null;
  if (typeof payload.csrfToken === "string" && payload.csrfToken) csrfTokenMemory = payload.csrfToken;
  const cookieCsrf = readCsrfFromCookie();
  if (cookieCsrf) csrfTokenMemory = cookieCsrf;
  purgeLegacyTokenStorage();
  sessionExpiredNotified = false;
  lastSessionRefreshState = "available";
  authenticationLifecycleState = "AUTHENTICATED";
  return payload.token;
}

export function getSessionRefreshState(): SessionRefreshState {
  return lastSessionRefreshState;
}

export function getAuthenticationLifecycleState(): AuthenticationLifecycleState {
  return authenticationLifecycleState;
}

export const sessionAvailabilityEvents = {
  unavailable: SESSION_UNAVAILABLE_EVENT,
  expired: SESSION_EXPIRED_EVENT,
} as const;

export async function refreshSessionToken(): Promise<string | null> {
  if (!refreshPromise) {
    lastSessionRefreshState = "refreshing";
    authenticationLifecycleState = "REFRESHING_SESSION";
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

async function executeRequest<T>(method: string, path: string, body?: unknown, allowCsrfRetry = true): Promise<T> {
  let token = accessTokenMemory;
  const url = `${BASE_URL}${path}`;
  const timeoutMs = getRequestTimeoutMs(path);
  let res: Response;
  try {
    res = await fetchWithTransientRetry(method, url, body, token, timeoutMs);
    if (res.status === 401 && !AUTH_PATHS_WITHOUT_REFRESH.has(path)) {
      token = await refreshSessionToken();
      if (token) res = await fetchWithTransientRetry(method, url, body, token, timeoutMs);
    }
  } catch (err: unknown) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    const error = new Error(timedOut ? TIMEOUT_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE) as Error &
      Record<string, unknown>;
    Object.assign(error, { status: 0, method, path, url, timeout: timedOut, timeoutMs, isTransient: true });
    throw error;
  }

  const parsed = await readApiResponseBody(res);

  if (!res.ok) {
    const normalized = normalizeApiError(res, parsed);

    if (
      allowCsrfRetry &&
      res.status === 403 &&
      normalized.code === "CSRF_TOKEN_INVALID" &&
      UNSAFE_HTTP_METHODS.has(method) &&
      !AUTH_PATHS_WITHOUT_REFRESH.has(path)
    ) {
      csrfTokenMemory = null;
      token = await refreshSessionToken();
      if (token) {
        return executeRequest<T>(method, path, body, false);
      }
    }

    if (normalized.responseKind !== "json") {
      console.warn("[api] Non-application response received", {
        method,
        path,
        status: res.status,
        responseKind: normalized.responseKind,
        requestId: normalized.requestId,
      });
    }

    const error = new Error(normalized.message) as Error & Record<string, unknown>;
    Object.assign(error, normalized, { status: res.status, method, path, url });
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
      Object.assign(error, {
        isRateLimit: true,
        retryAfter: normalized.retryAfter ?? retryAfterSeconds,
        maxAttempts: normalized.maxAttempts,
      });
    }
    throw error;
  }

  if (parsed.kind === "empty") return undefined as T;
  if (parsed.kind !== "json") {
    const error = new Error(TEMPORARY_SERVICE_MESSAGE) as Error & Record<string, unknown>;
    Object.assign(error, { status: res.status, method, path, url, isTransient: true, responseKind: parsed.kind });
    throw error;
  }
  return parsed.payload as T;
}

function request<T>(method: string, path: string, body?: unknown, allowCsrfRetry = true): Promise<T> {
  if (method !== "GET" || body !== undefined || !allowCsrfRetry) {
    return executeRequest<T>(method, path, body, allowCsrfRetry);
  }

  const key = `${accessTokenMemory || "anonymous"}:${path}`;
  const existing = inFlightGetRequests.get(key);
  if (existing) return existing as Promise<T>;

  const pending = executeRequest<T>(method, path, body, allowCsrfRetry);
  inFlightGetRequests.set(key, pending);
  const clearPending = () => {
    if (inFlightGetRequests.get(key) === pending) inFlightGetRequests.delete(key);
  };
  void pending.then(clearPending, clearPending);
  return pending;
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
  retryVideoJob: (jobId: string) => request<any>("POST", `/api/teacher/video-jobs/${jobId}/retry`),
  getVideoJobStatus: (jobId: string) => request<any>("GET", `/api/teacher/video-jobs/${jobId}`),
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
  getLessonContentMediaSource: (contentId: string) =>
    request<{ sourceUrl: string; proxySourceUrl?: string; mimeType: string; brandedIntroDuration?: number }>(
      "GET",
      `/api/lesson-contents/${contentId}/media-source`,
    ),
  getQuiz: (courseId: number, moduleId: number) =>
    request<QuizQuestion[]>("GET", `/api/courses/${courseId}/quizzes/${moduleId}`),
  submitQuizAttempt: (courseId: number, moduleId: number, answers: Record<string, string>) =>
    request<QuizAttemptResult>("POST", `/api/courses/${courseId}/modules/${moduleId}/quiz-attempts`, { answers }),
  getCourseGrades: (courseId: number) => request<any[]>("GET", `/api/courses/${courseId}/grades`),
  completeModule: (courseId: number, moduleId: number) =>
    request<any>("POST", `/api/courses/${courseId}/modules/${moduleId}/complete`),
  setModuleProgress: (courseId: number, moduleId: number, completed: boolean) =>
    request<{ courseId: number; moduleId: number; completed: boolean }>(
      "PUT",
      `/api/courses/${courseId}/modules/${moduleId}/progress`,
      { completed },
    ),
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
  getCenterPaymentConfig: () => request<CenterPaymentConfig>("GET", "/api/center-payment/config"),
  createCenterPaymentRequest: (courseId: number, data: { promoCode?: string; studentNote?: string } = {}) =>
    request<{ duplicate: boolean; request: CenterPaymentRequestView }>(
      "POST",
      `/api/courses/${courseId}/center-payment-requests`,
      data,
    ),
  getMyCenterPaymentRequests: () => request<CenterPaymentRequestView[]>("GET", "/api/me/center-payment-requests"),
  getMyCenterPaymentRequest: (reference: string) =>
    request<CenterPaymentRequestView>("GET", `/api/me/center-payment-requests/${encodeURIComponent(reference)}`),
  cancelMyCenterPaymentRequest: (reference: string) =>
    request<CenterPaymentRequestView>(
      "POST",
      `/api/me/center-payment-requests/${encodeURIComponent(reference)}/cancel`,
      {},
    ),
  getAdminCenterPaymentRequests: (
    filters: {
      status?: CenterPaymentStatus;
      q?: string;
      courseId?: number;
      amount?: number;
      validatedBy?: string;
      from?: string;
      to?: string;
    } = {},
  ) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") params.set(key, String(value));
    });
    const query = params.toString();
    return request<AdminCenterPaymentRequestView[]>(
      "GET",
      `/api/admin/center-payment-requests${query ? `?${query}` : ""}`,
    );
  },
  getAdminCenterPaymentRequest: (reference: string) =>
    request<AdminCenterPaymentRequestView>(
      "GET",
      `/api/admin/center-payment-requests/${encodeURIComponent(reference)}`,
    ),
  reviewCenterPaymentRequest: (reference: string, internalNote?: string) =>
    request<AdminCenterPaymentRequestView>(
      "POST",
      `/api/admin/center-payment-requests/${encodeURIComponent(reference)}/review`,
      { internalNote },
    ),
  validateCenterPaymentRequest: (
    reference: string,
    data: {
      receivedAmount: number;
      paymentMethod: CenterPaymentMethod;
      physicalReceiptReference?: string;
      internalNote?: string;
      idempotencyKey: string;
    },
  ) =>
    request<{ idempotent: boolean; request: AdminCenterPaymentRequestView }>(
      "POST",
      `/api/admin/center-payment-requests/${encodeURIComponent(reference)}/validate`,
      data,
    ),
  rejectCenterPaymentRequest: (reference: string, publicReason: string, internalNote?: string) =>
    request<AdminCenterPaymentRequestView>(
      "POST",
      `/api/admin/center-payment-requests/${encodeURIComponent(reference)}/reject`,
      { publicReason, internalNote },
    ),
  cancelAdminCenterPaymentRequest: (reference: string, publicReason: string, internalNote?: string) =>
    request<AdminCenterPaymentRequestView>(
      "POST",
      `/api/admin/center-payment-requests/${encodeURIComponent(reference)}/cancel`,
      { publicReason, internalNote },
    ),
  refundCenterPaymentRequest: (reference: string, publicReason: string, internalNote?: string) =>
    request<AdminCenterPaymentRequestView>(
      "POST",
      `/api/admin/center-payment-requests/${encodeURIComponent(reference)}/refund`,
      { publicReason, internalNote },
    ),
  addCenterPaymentAdminNote: (reference: string, note: string) =>
    request<AdminCenterPaymentRequestView>(
      "POST",
      `/api/admin/center-payment-requests/${encodeURIComponent(reference)}/note`,
      { note },
    ),
  createPayPalOrder: (courseId: number, promoCode?: string) =>
    request<{ id: string; currency?: string; amount?: string; amountMad?: string }>(
      "POST",
      "/api/paypal/create-order",
      { courseId, ...(promoCode ? { promoCode } : {}) },
    ),
  capturePayPalOrder: (orderId: string, courseId: number) =>
    request<{ ok: boolean; invoice?: any; user?: any; message?: string }>("POST", "/api/paypal/capture-order", {
      orderId,
      courseId,
    }),
  cancelPayPalOrder: (orderId: string) =>
    request<{ released: boolean }>("POST", "/api/paypal/cancel-order", { orderId }),
  freeEnrollCourse: (courseId: number, promoCode?: string) =>
    request<{ ok: boolean; invoice?: any; user?: any; message?: string }>(
      "POST",
      `/api/courses/${courseId}/free-enroll`,
      {
        ...(promoCode ? { promoCode } : {}),
      },
    ),
  validatePromoCode: (courseId: number, code: string) =>
    request<PromoQuote>("POST", `/api/modules/${courseId}/promo-code/validate`, { code }),
  removePromoCode: (courseId: number) => request<{ removed: boolean }>("DELETE", `/api/modules/${courseId}/promo-code`),
  getAdminPromoOptions: () =>
    request<{
      courses: Array<{ id: number; title: string; price: number }>;
      students: Array<{ id: string; fullName: string; email: string; filiere: string | null }>;
      creators: Array<{ id: string; fullName: string; email: string }>;
      filieres: string[];
      timeZone: string;
      currency: string;
    }>("GET", "/api/admin/promo-codes/options"),
  generatePromoCode: () => request<{ code: string }>("POST", "/api/admin/promo-codes/generate", {}),
  getAdminPromoCodes: (filters: Record<string, string | number | boolean | undefined> = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") params.set(key, String(value));
    });
    const query = params.toString();
    return request<{ items: PromoCodeView[]; page: number; pageSize: number; total: number; totalPages: number }>(
      "GET",
      `/api/admin/promo-codes${query ? `?${query}` : ""}`,
    );
  },
  getAdminPromoCode: (id: string) =>
    request<PromoCodeDetails>("GET", `/api/admin/promo-codes/${encodeURIComponent(id)}`),
  createAdminPromoCode: (data: PromoCodeInput) => request<PromoCodeView>("POST", "/api/admin/promo-codes", data),
  updateAdminPromoCode: (id: string, data: Partial<PromoCodeInput>) =>
    request<PromoCodeView>("PATCH", `/api/admin/promo-codes/${encodeURIComponent(id)}`, data),
  setAdminPromoStatus: (id: string, action: "activate" | "pause" | "disable" | "archive", reason?: string) =>
    request<PromoCodeView>("POST", `/api/admin/promo-codes/${encodeURIComponent(id)}/${action}`, { reason }),
  duplicateAdminPromoCode: (id: string) =>
    request<PromoCodeView>("POST", `/api/admin/promo-codes/${encodeURIComponent(id)}/duplicate`, {}),
  deleteAdminPromoCode: (id: string) =>
    request<{ deleted: boolean; id: string }>("DELETE", `/api/admin/promo-codes/${encodeURIComponent(id)}`),
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
  getNotificationsOverview: () =>
    request<{ notifications: any[]; unreadCount: number }>("GET", "/api/notifications/overview"),
  getNotificationUnreadCount: () => request<{ count: number }>("GET", "/api/notifications/unread-count"),
  getVapidPublicKey: () =>
    request<{ publicKey: string; configured?: boolean }>("GET", "/api/notifications/vapid-public-key"),
  markNotificationRead: (id: string) => request<any>("PATCH", `/api/notifications/${id}/read`),
  markAllNotificationsRead: () => request<any>("POST", "/api/notifications/read-all"),
  subscribePushNotifications: (data: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
    request<any>("POST", "/api/notifications/push-subscribe", data),
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
  inFlightGetRequests.clear();
  if (token) {
    accessTokenMemory = token;
    if (csrfToken) csrfTokenMemory = csrfToken;
    sessionExpiredNotified = false;
    lastSessionRefreshState = "available";
    authenticationLifecycleState = "AUTHENTICATED";
  } else {
    lastSessionRefreshState = "anonymous";
    authenticationLifecycleState = "UNAUTHENTICATED";
    clearSessionTokens();
  }
}
