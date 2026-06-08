import type { Request } from "express";
import { ipKeyGenerator } from "express-rate-limit";
import { verifyAuthToken } from "./auth-token";

function readBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (typeof header !== "string") return undefined;
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token || undefined;
}

export function liveKitRateLimitKey(req: Request): string {
  const session = verifyAuthToken(readBearerToken(req));
  if (session?.userId) {
    return `user:${session.userId}`;
  }
  return `ip:${ipKeyGenerator(req.ip || "")}`;
}
