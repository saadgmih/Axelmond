import * as SecureStore from "expo-secure-store";
import type { AppUser } from "../types";

const ACCESS_TOKEN_KEY = "axelmond_access_token";
const REFRESH_TOKEN_KEY = "axelmond_refresh_token";
const CSRF_TOKEN_KEY = "axelmond_csrf_token";
const USER_KEY = "axelmond_user";

export async function saveAuthSession(data: {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  user: AppUser;
}): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken),
    SecureStore.setItemAsync(CSRF_TOKEN_KEY, data.csrfToken),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user)),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function getCsrfToken(): Promise<string | null> {
  return SecureStore.getItemAsync(CSRF_TOKEN_KEY);
}

export async function getStoredUser(): Promise<AppUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
}

export async function updateStoredUser(user: AppUser): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function updateAccessTokens(data: {
  accessToken: string;
  refreshToken?: string;
  csrfToken?: string;
}): Promise<void> {
  const tasks = [SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken)];
  if (data.refreshToken) {
    tasks.push(SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken));
  }
  if (data.csrfToken) {
    tasks.push(SecureStore.setItemAsync(CSRF_TOKEN_KEY, data.csrfToken));
  }
  await Promise.all(tasks);
}

export async function clearAuthSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(CSRF_TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}

function decodeJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function isAccessTokenFresh(token: string): boolean {
  const exp = decodeJwtExp(token);
  if (!exp) return false;
  return exp > Math.floor(Date.now() / 1000) + 30;
}
