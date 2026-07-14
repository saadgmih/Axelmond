import assert from "node:assert/strict";
import { verifyProductionEdge } from "../scripts/verify-production-edge.mjs";
import { rulesTest } from "./helpers/rulesTest.ts";

function validResponse(input: string | URL) {
  const pathname = new URL(String(input)).pathname;
  if (pathname === "/") {
    return new Response(
      '<html><head><title>Performance Académique</title></head><body><div id="root"></div></body></html>',
    );
  }
  if (pathname === "/api/health") {
    return Response.json({ status: "UP" });
  }
  if (pathname === "/api/courses") {
    return Response.json([{ id: 1, title: "Module" }]);
  }
  return new Response("Not found", { status: 404 });
}

rulesTest("production-edge-probe-stable", async () => {
  let calls = 0;
  await verifyProductionEdge({
    baseUrl: "https://example.test",
    rounds: 2,
    delayMs: 0,
    timeoutMs: 1_000,
    fetchImpl: async (input) => {
      calls += 1;
      return validResponse(input as string | URL);
    },
    log: () => undefined,
  });
  assert.equal(calls, 6);
});

rulesTest("production-edge-probe-rejects-intermittent-hcdn-403", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      verifyProductionEdge({
        baseUrl: "https://example.test",
        rounds: 2,
        delayMs: 0,
        timeoutMs: 1_000,
        fetchImpl: async (input) => {
          const round = Math.floor(calls / 3) + 1;
          calls += 1;
          const pathname = new URL(String(input)).pathname;
          if (round === 2 && pathname === "/api/health") {
            return new Response("<html><h1>403</h1><h2>Forbidden</h2></html>", {
              status: 403,
              headers: { "x-hcdn-request-id": "test-edge-request" },
            });
          }
          return validResponse(input as string | URL);
        },
        log: () => undefined,
      }),
    /Production edge probe round 2 failed: health: HTTP 403 Hostinger hCDN/,
  );
});
