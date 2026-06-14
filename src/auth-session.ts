import type { Request, Response } from "express";
import type { AppUser } from "./server/route-types";

type AuthApi = {
  prisma: { user: { update: (args: unknown) => Promise<unknown> } };
  toAppUser: (user: unknown) => AppUser;
  createRefreshToken: (userId: string) => Promise<string>;
  setAuthCookies: (res: Response, refreshToken: string) => string;
  signAuthToken: (user: AppUser) => string;
  withMobileRefreshToken: (req: Request, body: Record<string, unknown>, refreshToken: string) => Record<string, unknown>;
  logSecurity: (level: string, message: string, meta?: Record<string, unknown>) => void;
};

export async function issueAuthenticatedSession(
  req: Request,
  res: Response,
  api: AuthApi,
  user: Parameters<AuthApi["toAppUser"]>[0],
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
  const { prisma } = await import("./db");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpEnabled: true },
  });
  return Boolean(user?.totpEnabled);
}
