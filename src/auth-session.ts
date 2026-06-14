import type { Request, Response } from "express";
import type { prisma } from "./db";
import type { createRefreshToken, signAuthToken } from "./auth-token";
import type { setAuthCookies } from "./auth-cookies";
import type { withMobileRefreshToken } from "./auth-mobile";
import type { logSecurity } from "./security-logger";
import type { toAppUser } from "./server/route-mappers";

export type AuthSessionApi = {
  prisma: typeof prisma;
  toAppUser: typeof toAppUser;
  createRefreshToken: typeof createRefreshToken;
  setAuthCookies: typeof setAuthCookies;
  signAuthToken: typeof signAuthToken;
  withMobileRefreshToken: typeof withMobileRefreshToken;
  logSecurity: typeof logSecurity;
};

export async function issueAuthenticatedSession(
  req: Request,
  res: Response,
  api: AuthSessionApi,
  user: Parameters<typeof toAppUser>[0],
  logMessage = "User logged in",
) {
  await api.prisma.user.update({
    where: { id: (user as { id: string }).id },
    data: { failedLoginAttempts: 0, lockoutUntil: null },
  });

  const safeUser = api.toAppUser(user);
  const refreshToken = await api.createRefreshToken(safeUser.id);
  const csrfToken = api.setAuthCookies(res, refreshToken);
  api.logSecurity("INFO", logMessage, { userId: safeUser.id, role: safeUser.role });

  return api.withMobileRefreshToken(
    req,
    { ...safeUser, token: api.signAuthToken(safeUser), csrfToken },
    refreshToken,
  );
}

export async function userRequiresTotpAfterPassword(userId: string): Promise<boolean> {
  const { prisma: db } = await import("./db");
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { totpEnabled: true },
  });
  return Boolean(user?.totpEnabled);
}
