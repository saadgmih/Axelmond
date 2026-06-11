import { API_BASE_URL, MOBILE_CLIENT_HEADER, MOBILE_CLIENT_VALUE } from "../config";
import type { ApiError, AppUser, Course, LiveKitSession, LiveMessage } from "../types";
import {
  clearAuthSession,
  getAccessToken,
  getCsrfToken,
  getRefreshToken,
  isAccessTokenFresh,
  updateAccessTokens,
} from "./authStorage";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
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

function buildApiError(method: string, path: string, status: number, payload: Record<string, unknown>, fallback: string): ApiError {
  const error = new Error((payload.error as string) || (payload.message as string) || fallback) as ApiError;
  Object.assign(error, payload, { status, method, path });
  return error;
}

async function buildRequestOptions(method: string, body: unknown, token: string | null): Promise<RequestInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    [MOBILE_CLIENT_HEADER]: MOBILE_CLIENT_VALUE,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (UNSAFE_METHODS.has(method)) {
    const csrfToken = await getCsrfToken();
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  }

  const opts: RequestInit = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);
  return opts;
}

async function performSessionRefresh(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    await clearAuthSession();
    return null;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, await buildRequestOptions("POST", { refreshToken }, null));
    if (!res.ok) throw new Error("Refresh rejected");
    const payload = await res.json();
    if (!payload?.token) throw new Error("Missing access token");
    await updateAccessTokens({
      accessToken: payload.token,
      refreshToken: payload.refreshToken,
      csrfToken: payload.csrfToken,
    });
    return payload.token as string;
  } catch {
    await clearAuthSession();
    return null;
  }
}

async function getFreshAccessToken(): Promise<string | null> {
  const token = await getAccessToken();
  if (token && isAccessTokenFresh(token)) return token;
  if (!refreshPromise) {
    refreshPromise = performSessionRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function request<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
  let token = auth ? await getAccessToken() : null;
  const url = `${API_BASE_URL}${path}`;
  let res = await fetch(url, await buildRequestOptions(method, body, token));

  if (auth && res.status === 401 && !AUTH_PATHS_WITHOUT_REFRESH.has(path)) {
    token = await performSessionRefresh();
    if (token) {
      res = await fetch(url, await buildRequestOptions(method, body, token));
    }
  }

  if (!res.ok) {
    const text = await res.text();
    let payload: Record<string, unknown> = {};
    try {
      payload = text ? JSON.parse(text) : { error: res.statusText };
    } catch {
      payload = { error: text || res.statusText };
    }
    throw buildApiError(method, path, res.status, payload, res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function normalizeAuthResponse(payload: AppUser & { token?: string; refreshToken?: string; csrfToken?: string }): {
  user: AppUser;
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
} {
  const { token, refreshToken, csrfToken, ...userFields } = payload;
  if (!token || !refreshToken || !csrfToken) {
    throw new Error("Réponse d'authentification incomplète pour mobile");
  }
  return {
    user: userFields as AppUser,
    accessToken: token,
    refreshToken,
    csrfToken,
  };
}

export const api = {
  health: () => request<{ status: string }>("GET", "/api/health", undefined, false),
  getDomains: () => request<any[]>("GET", "/api/domains", undefined, false),
  getCourses: (filters?: { domainId?: number; disciplineId?: number }) => {
    const params = new URLSearchParams();
    if (filters?.domainId) params.set("domainId", String(filters.domainId));
    if (filters?.disciplineId) params.set("disciplineId", String(filters.disciplineId));
    const query = params.toString();
    return request<Course[]>("GET", `/api/courses${query ? `?${query}` : ""}`, undefined, false);
  },
  getCourse: (id: number) => request<Course>("GET", `/api/courses/${id}`, undefined, false),
  getCourseContent: (id: number) => request<any[]>("GET", `/api/courses/${id}/content`),
  me: () => request<AppUser>("GET", "/api/auth/me"),
  getProfile: () => request<any>("GET", "/api/me/profile"),
  getStudentProfile: () => request<{ user: AppUser; objectivesSummary: Record<string, number> }>("GET", "/api/mobile/student-profile"),
  updateProfile: (data: Record<string, unknown>) => request<any>("PUT", "/api/me/profile", data),
  getStudentObjectivesSummary: () => request<any>("GET", "/api/me/objectives/summary"),
  getStudySchedule: () => request<any[]>("GET", "/api/me/study-schedule"),
  login: async (email: string, password: string, role: string) =>
    normalizeAuthResponse(await request<AppUser & { token: string; refreshToken: string; csrfToken: string }>(
      "POST",
      "/api/auth/login",
      { email, password, role },
      false,
    )),
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    role: string;
    levelOrTitle?: string;
    filiere?: string;
    professorInviteCode?: string;
  }) => request<{ verificationRequired?: boolean; email?: string; message?: string }>("POST", "/api/auth/register", data, false),
  verifyEmail: async (email: string, code: string) =>
    normalizeAuthResponse(await request<AppUser & { token: string; refreshToken: string; csrfToken: string }>(
      "POST",
      "/api/auth/verify-email",
      { email, code },
      false,
    )),
  resendVerificationCode: (email: string) =>
    request<any>("POST", "/api/auth/resend-verification-code", { email }, false),
  logout: async () => {
    const refreshToken = await getRefreshToken();
    try {
      await request("POST", "/api/auth/logout", refreshToken ? { refreshToken } : undefined);
    } finally {
      await clearAuthSession();
    }
  },
  getLiveKitToken: (courseId: number) => request<LiveKitSession>("POST", "/api/livekit/token", { courseId }),
  getLiveMessages: (courseId: number) => request<LiveMessage[]>("GET", `/api/livekit/messages/${courseId}`),
  saveLiveMessage: (courseId: number, message: { id: string; text: string }) =>
    request<any>("POST", "/api/livekit/messages", { courseId, messageId: message.id, text: message.text }),
  leaveLiveAttendance: (courseId: number) => request<any>("POST", "/api/livekit/attendance/leave", { courseId }),
  enrollMock: (courseId: number) => request<any>("POST", "/api/payments/enroll-mock", { courseId }),
};

export { getFreshAccessToken, clearAuthSession };
