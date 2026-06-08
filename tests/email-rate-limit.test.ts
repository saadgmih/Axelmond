import assert from "node:assert/strict";
import type { Request } from "express";
import { ipKeyGenerator } from "express-rate-limit";
import { emailRateLimitKey } from "../src/email-rate-limit.ts";

function mockRequest(body: Record<string, unknown> = {}, ip = "203.0.113.42"): Request {
  return { body, ip } as Request;
}

assert.equal(
  emailRateLimitKey(mockRequest({ email: "User@Example.COM" })),
  "email:user@example.com",
  "normalise l'email en minuscules",
);

assert.equal(
  emailRateLimitKey(mockRequest({ email: "  user@test.com  " })),
  "email:user@test.com",
  "supprime les espaces autour de l'email",
);

const fallbackIp = `ip:${ipKeyGenerator("203.0.113.42")}`;
assert.equal(
  emailRateLimitKey(mockRequest({}, "203.0.113.42")),
  fallbackIp,
  "utilise l'IP quand l'email est absent",
);

assert.equal(
  emailRateLimitKey(mockRequest({ email: "" }, "203.0.113.42")),
  fallbackIp,
  "utilise l'IP quand l'email est vide",
);

assert.equal(
  emailRateLimitKey(mockRequest({ email: "   " }, "203.0.113.42")),
  fallbackIp,
  "utilise l'IP quand l'email ne contient que des espaces",
);

console.log("Email rate limit tests passed");
