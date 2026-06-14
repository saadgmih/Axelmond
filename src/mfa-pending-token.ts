import jwt from "jsonwebtoken";
import { getAuthTokenSecret } from "./auth-token";

const MFA_PENDING_TTL = "5m";

export interface MfaPendingClaims {
  userId: string;
  typ: "mfa_pending";
}

export function signMfaPendingToken(userId: string, secret = getAuthTokenSecret()): string {
  return jwt.sign({ userId, typ: "mfa_pending" }, secret, { expiresIn: MFA_PENDING_TTL, algorithm: "HS256" });
}

export function verifyMfaPendingToken(token: string | undefined, secret = getAuthTokenSecret()): MfaPendingClaims | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] }) as { userId?: string; typ?: string };
    if (decoded.typ !== "mfa_pending" || !decoded.userId) return null;
    return { userId: String(decoded.userId), typ: "mfa_pending" };
  } catch {
    return null;
  }
}
