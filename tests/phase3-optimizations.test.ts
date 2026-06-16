import assert from "node:assert/strict";
import fs from "node:fs";
import { z } from "zod";
import { cacheGet, cacheSet, getCacheBackendKind, initCache } from "../src/cache.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("phase3-optimizations", async () => {
  // P6 — validateBody no longer HTML-encodes strings before Zod
  const routeSchemas = fs.readFileSync("src/server/route-schemas.ts", "utf8");
  assert.doesNotMatch(routeSchemas, /sanitizeObject/);
  assert.doesNotMatch(routeSchemas, /sanitizeInputText/);
  assert.match(routeSchemas, /safeParseAsync\(req\.body\)/);

  const testSchema = z.object({ title: z.string().min(1) });
  let capturedBody: unknown = null;
  const middleware = (
    await import("../src/server/route-schemas.ts")
  ).validateBody(testSchema);
  const req: any = { body: { title: "A & B <script>" } };
  const res: any = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json() {},
  };
  await new Promise<void>((resolve) => {
    middleware(req, res, () => {
      capturedBody = req.body;
      resolve();
    });
  });
  assert.equal((capturedBody as { title: string }).title, "A & B <script>");

  // P8 — Redis-ready cache with memory fallback
  delete process.env.REDIS_URL;
  await initCache();
  assert.equal(getCacheBackendKind(), "memory");
  await cacheSet("phase3:test", "ok", 30);
  assert.equal(await cacheGet("phase3:test"), "ok");

  // P9 — RBAC logs denials by default; grants only when RBAC_VERBOSE_LOGGING=true
  const routeDeps = fs.readFileSync("src/server/route-deps.ts", "utf8");
  assert.match(routeDeps, /RBAC_VERBOSE_LOGGING/);
  assert.match(routeDeps, /if \(RBAC_VERBOSE_LOGGING\)[\s\S]*Access granted/);

  // P18 — PM2 cluster gated on REDIS_URL
  const ecosystem = fs.readFileSync("ecosystem.config.cjs", "utf8");
  assert.match(ecosystem, /REDIS_URL/);
  assert.match(ecosystem, /HOSTINGER_WEBAPP/);
  assert.match(ecosystem, /exec_mode: useCluster \? "cluster" : "fork"/);

  console.log("Phase 3 optimization guards passed");
});
