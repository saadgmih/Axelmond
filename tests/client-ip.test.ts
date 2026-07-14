import assert from "node:assert/strict";
import type { Request } from "express";
import { getClientIp, parseTrustProxySetting, rateLimitIpKey } from "../src/client-ip.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

function mockRequest(overrides: Partial<Request> & { headers?: Record<string, string> } = {}): Request {
  return {
    ip: "203.0.113.10",
    headers: {},
    ...overrides,
  } as Request;
}

rulesTest("client-ip", () => {
  assert.equal(parseTrustProxySetting(undefined), 1);
  assert.equal(parseTrustProxySetting("2"), 2);
  assert.equal(parseTrustProxySetting("true"), true);
  assert.equal(parseTrustProxySetting("false"), false);

  assert.equal(getClientIp(mockRequest()), "203.0.113.10");
  assert.equal(getClientIp(mockRequest({ headers: { "cf-connecting-ip": "198.51.100.42" } })), "198.51.100.42");
  assert.equal(
    getClientIp(mockRequest({ ip: "203.0.113.10", headers: { "cf-connecting-ip": " 198.51.100.42 " } })),
    "198.51.100.42",
  );

  const keyed = rateLimitIpKey(mockRequest({ headers: { "cf-connecting-ip": "198.51.100.42" } }));
  assert.match(keyed, /198\.51\.100\.42/);
});
