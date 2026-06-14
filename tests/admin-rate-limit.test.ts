import assert from "node:assert/strict";import type { Request } from "express";import { ipKeyGenerator } from "express-rate-limit";import { signAuthToken } from "../src/auth-token.ts";import { adminRateLimitKey } from "../src/admin-rate-limit.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("admin-rate-limit", () => {
function mockRequest(options: { ip?: string; authorization?: string } = {}): Request {
  return {
    ip: options.ip ?? "203.0.113.42",
    headers: options.authorization ? { authorization: options.authorization } : {},
  } as Request;
}

const adminToken = signAuthToken({ id: "admin-rate-limit-1", role: "ADMIN" });
const otherAdminToken = signAuthToken({ id: "admin-rate-limit-2", role: "ADMIN" });
const fallbackIp = `ip:${ipKeyGenerator("203.0.113.42")}`;

assert.equal(
  adminRateLimitKey(mockRequest({ authorization: `Bearer ${adminToken}` })),
  "user:admin-rate-limit-1",
  "utilise userId quand le JWT Bearer est valide",
);

assert.equal(
  adminRateLimitKey(mockRequest({ authorization: `Bearer ${adminToken}`, ip: "203.0.113.11" })),
  adminRateLimitKey(mockRequest({ authorization: `Bearer ${adminToken}`, ip: "203.0.113.22" })),
  "deux IP différentes avec le même JWT partagent le même bucket",
);

assert.notEqual(
  adminRateLimitKey(mockRequest({ authorization: `Bearer ${adminToken}` })),
  adminRateLimitKey(mockRequest({ authorization: `Bearer ${otherAdminToken}` })),
  "deux admins différents derrière la même IP ont des buckets différents",
);

assert.equal(
  adminRateLimitKey(mockRequest({ ip: "203.0.113.42" })),
  fallbackIp,
  "utilise l'IP quand Authorization est absent",
);

assert.equal(
  adminRateLimitKey(mockRequest({ authorization: "Bearer", ip: "203.0.113.42" })),
  fallbackIp,
  "utilise l'IP quand le Bearer est vide",
);

assert.equal(
  adminRateLimitKey(mockRequest({ authorization: "Bearer not-a-valid-jwt", ip: "203.0.113.42" })),
  fallbackIp,
  "utilise l'IP quand le JWT est invalide",
);

});
