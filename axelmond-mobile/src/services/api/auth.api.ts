import type { AppUser } from "../../types";
import { getRefreshToken } from "../authStorage";
import { apiRequest, clearAuthSession } from "./client";

function normalizeAuthResponse(payload: AppUser & { token?: string; refreshToken?: string; csrfToken?: string }) {
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

export const authApi = {
  login: async (email: string, password: string, role: string) =>
    normalizeAuthResponse(
      await apiRequest<AppUser & { token: string; refreshToken: string; csrfToken: string }>(
        "POST",
        "/api/auth/login",
        { email, password, role },
        false,
      ),
    ),
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    role: string;
    levelOrTitle?: string;
    filiere?: string;
    professorInviteCode?: string;
  }) =>
    apiRequest<{ verificationRequired?: boolean; email?: string; message?: string }>(
      "POST",
      "/api/auth/register",
      data,
      false,
    ),
  verifyEmail: async (email: string, code: string) =>
    normalizeAuthResponse(
      await apiRequest<AppUser & { token: string; refreshToken: string; csrfToken: string }>(
        "POST",
        "/api/auth/verify-email",
        { email, code },
        false,
      ),
    ),
  resendVerificationCode: (email: string) =>
    apiRequest("POST", "/api/auth/resend-verification-code", { email }, false),
  me: () => apiRequest<AppUser>("GET", "/api/auth/me"),
  logout: async () => {
    const refreshToken = await getRefreshToken();
    try {
      await apiRequest("POST", "/api/auth/logout", refreshToken ? { refreshToken } : undefined);
    } finally {
      await clearAuthSession();
    }
  },
};
