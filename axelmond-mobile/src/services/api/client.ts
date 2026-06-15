import { API_BASE_URL, MOBILE_CLIENT_HEADER, MOBILE_CLIENT_VALUE, MOBILE_CLIENT_KEY, MOBILE_CLIENT_KEY_HEADER } from "../../config";
import type { ApiError } from "../../types";
import {
  clearAuthSession,
  getAccessToken,
  getCsrfToken,
  getRefreshToken,
  isAccessTokenFresh,
  updateAccessTokens,
} from "../authStorage";

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

type SessionInvalidationListener = () => void;
const sessionInvalidationListeners = new Set<SessionInvalidationListener>();

export function onSessionInvalidated(listener: SessionInvalidationListener): () => void {
  sessionInvalidationListeners.add(listener);
  return () => {
    sessionInvalidationListeners.delete(listener);
  };
}

function notifySessionInvalidated(): void {
  sessionInvalidationListeners.forEach((listener) => listener());
}

function buildApiError(
  method: string,
  path: string,
  status: number,
  payload: Record<string, unknown>,
  fallback: string,
): ApiError {
  const error = new Error((payload.error as string) || (payload.message as string) || fallback) as ApiError;
  Object.assign(error, payload, { status, method, path });
  return error;
}

async function buildRequestOptions(method: string, body: unknown, token: string | null): Promise<RequestInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    [MOBILE_CLIENT_HEADER]: MOBILE_CLIENT_VALUE,
    ...(MOBILE_CLIENT_KEY ? { [MOBILE_CLIENT_KEY_HEADER]: MOBILE_CLIENT_KEY } : {}),
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
    notifySessionInvalidated();
    return null;
  }
}

export async function getFreshAccessToken(): Promise<string | null> {
  const token = await getAccessToken();
  if (token && isAccessTokenFresh(token)) return token;
  if (!refreshPromise) {
    refreshPromise = performSessionRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiRequest<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
  let token = auth ? await getFreshAccessToken() : null;
  if (auth && !token) {
    throw buildApiError(method, path, 401, { error: "Session expirée", code: "SESSION_EXPIRED" }, "Session expirée");
  }

  const url = `${API_BASE_URL}${path}`;
  let res = await fetch(url, await buildRequestOptions(method, body, token));

  if (auth && res.status === 401 && !AUTH_PATHS_WITHOUT_REFRESH.has(path)) {
    token = await performSessionRefresh();
    if (token) {
      res = await fetch(url, await buildRequestOptions(method, body, token));
    } else {
      throw buildApiError(method, path, 401, { error: "Session expirée", code: "SESSION_EXPIRED" }, "Session expirée");
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

export { clearAuthSession, performSessionRefresh };
