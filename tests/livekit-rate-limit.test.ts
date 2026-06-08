import assert from "node:assert/strict";
import type { Request } from "express";
import { ipKeyGenerator } from "express-rate-limit";
import { signAuthToken } from "../src/auth-token.ts";
import { liveKitRateLimitKey } from "../src/livekit-rate-limit.ts";

function mockRequest(options: { ip?: string; authorization?: string } = {}): Request {
  return {
    ip: options.ip ?? "203.0.113.42",
    headers: options.authorization ? { authorization: options.authorization } : {},
  } as Request;
}

const professorToken = signAuthToken({ id: "prof-livekit-1", role: "PROFESSOR" });
const studentToken = signAuthToken({ id: "student-livekit-2", role: "STUDENT" });
const fallbackIp = `ip:${ipKeyGenerator("203.0.113.42")}`;

assert.equal(
  liveKitRateLimitKey(mockRequest({ authorization: `Bearer ${professorToken}` })),
  "user:prof-livekit-1",
  "utilise userId quand le JWT Bearer est valide",
);

assert.equal(
  liveKitRateLimitKey(mockRequest({ authorization: `Bearer ${professorToken}`, ip: "203.0.113.11" })),
  liveKitRateLimitKey(mockRequest({ authorization: `Bearer ${professorToken}`, ip: "203.0.113.22" })),
  "deux IP différentes avec le même JWT partagent le même bucket",
);

assert.notEqual(
  liveKitRateLimitKey(mockRequest({ authorization: `Bearer ${professorToken}` })),
  liveKitRateLimitKey(mockRequest({ authorization: `Bearer ${studentToken}` })),
  "deux utilisateurs différents derrière la même IP ont des buckets différents",
);

assert.equal(
  liveKitRateLimitKey(mockRequest({ ip: "203.0.113.42" })),
  fallbackIp,
  "utilise l'IP quand Authorization est absent",
);

assert.equal(
  liveKitRateLimitKey(mockRequest({ authorization: "Bearer", ip: "203.0.113.42" })),
  fallbackIp,
  "utilise l'IP quand le Bearer est vide",
);

assert.equal(
  liveKitRateLimitKey(mockRequest({ authorization: "Bearer not-a-valid-jwt", ip: "203.0.113.42" })),
  fallbackIp,
  "utilise l'IP quand le JWT est invalide",
);

console.log("LiveKit rate limit tests passed");
