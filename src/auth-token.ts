import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { UserRole, normalizeRole } from "./rbac";
import { prisma } from "./db";
import { hashRefreshToken } from "./security-hardening";
import { APP_USER_BILLING_INCLUDE } from "./course-payments";

const DEFAULT_AUTH_TOKEN_SECRET = "axelmond-dev-secret";

export const REFRESH_TOKEN_TTL_DAYS = 7;
export const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

export type AuthTokenSession = {
  userId: string;
  role: UserRole;
  authTokenVersion: number;
};

export function getAuthTokenSecret(env: NodeJS.ProcessEnv = process.env) {
  const secret = env.AUTH_TOKEN_SECRET?.trim();
  if (!secret) {
    if (env.NODE_ENV === "production") {
      throw new Error("AUTH_TOKEN_SECRET must be set in production");
    }
    return DEFAULT_AUTH_TOKEN_SECRET;
  }
  if (env.NODE_ENV === "production" && secret === DEFAULT_AUTH_TOKEN_SECRET) {
    throw new Error("AUTH_TOKEN_SECRET must not use the default dev secret in production");
  }
  return secret;
}

export function signAuthToken(
  user: { id: string; role: UserRole; authTokenVersion?: number | null },
  secret = getAuthTokenSecret(),
) {
  const authTokenVersion = Number.isInteger(user.authTokenVersion) ? Number(user.authTokenVersion) : 0;
  return jwt.sign(
    { userId: user.id, role: user.role, tv: authTokenVersion },
    secret,
    { expiresIn: "15m", algorithm: "HS256" },
  );
}

export function verifyAuthToken(token: string | undefined, secret = getAuthTokenSecret()): AuthTokenSession | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] }) as {
      userId: string;
      role: string;
      tv?: number;
    };
    const role = normalizeRole(decoded.role);
    if (!decoded.userId || !role || typeof decoded.tv !== "number" || !Number.isInteger(decoded.tv) || decoded.tv < 0) {
      return null;
    }
    return { userId: String(decoded.userId), role, authTokenVersion: decoded.tv };
  } catch (_err) {
    return null;
  }
}

export async function bumpAuthTokenVersion(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { authTokenVersion: { increment: 1 } },
  });
}

export async function createRefreshToken(userId: string) {
  const token = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      userId,
      token: hashRefreshToken(token),
      expiresAt,
    },
  });

  return token;
}

export async function findValidRefreshToken(rawToken: string) {
  return prisma.refreshToken.findUnique({
    where: { token: hashRefreshToken(rawToken) },
    include: { user: { include: APP_USER_BILLING_INCLUDE } },
  });
}

export async function revokeRefreshToken(rawToken: string) {
  return prisma.refreshToken.updateMany({
    where: { token: hashRefreshToken(rawToken) },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserRefreshTokens(userId: string) {
  await prisma.$transaction([
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { authTokenVersion: { increment: 1 } },
    }),
  ]);
}

export async function rotateRefreshToken(id: string, userId: string) {
  const token = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.$transaction(async (tx) => {
    const revoked = await tx.refreshToken.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count !== 1) throw new Error("Refresh token already revoked");
    await tx.refreshToken.create({
      data: {
        userId,
        token: hashRefreshToken(token),
        expiresAt,
      },
    });
    await tx.user.update({
      where: { id: userId },
      data: { authTokenVersion: { increment: 1 } },
    });
  });

  return token;
}

if (process.env.NODE_ENV === "production") {
  getAuthTokenSecret(process.env);
}
