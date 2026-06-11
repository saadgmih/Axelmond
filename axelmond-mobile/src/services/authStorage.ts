import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { AppUser } from "../types";

const ACCESS_TOKEN_KEY = "axelmond_access_token";
const REFRESH_TOKEN_KEY = "axelmond_refresh_token";
const CSRF_TOKEN_KEY = "axelmond_csrf_token";
const USER_KEY = "axelmond_user";

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return globalThis.localStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveAuthSession(data: {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  user: AppUser;
}): Promise<void> {
  await Promise.all([
    setItem(ACCESS_TOKEN_KEY, data.accessToken),
    setItem(REFRESH_TOKEN_KEY, data.refreshToken),
    setItem(CSRF_TOKEN_KEY, data.csrfToken),
    setItem(USER_KEY, JSON.stringify(data.user)),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(REFRESH_TOKEN_KEY);
}

export async function getCsrfToken(): Promise<string | null> {
  return getItem(CSRF_TOKEN_KEY);
}

export async function getStoredUser(): Promise<AppUser | null> {
  const raw = await getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
}

export async function updateStoredUser(user: AppUser): Promise<void> {
  await setItem(USER_KEY, JSON.stringify(user));
}

export async function updateAccessTokens(data: {
  accessToken: string;
  refreshToken?: string;
  csrfToken?: string;
}): Promise<void> {
  const tasks = [setItem(ACCESS_TOKEN_KEY, data.accessToken)];
  if (data.refreshToken) {
    tasks.push(setItem(REFRESH_TOKEN_KEY, data.refreshToken));
  }
  if (data.csrfToken) {
    tasks.push(setItem(CSRF_TOKEN_KEY, data.csrfToken));
  }
  await Promise.all(tasks);
}

export async function clearAuthSession(): Promise<void> {
  await Promise.all([
    removeItem(ACCESS_TOKEN_KEY),
    removeItem(REFRESH_TOKEN_KEY),
    removeItem(CSRF_TOKEN_KEY),
    removeItem(USER_KEY),
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
