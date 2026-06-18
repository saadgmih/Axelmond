import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("hostinger-deploy", () => {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const scripts = packageJson.scripts as Record<string, string>;
  const startServer = fs.readFileSync("src/server/start-server.ts", "utf8");
  const ecosystem = fs.readFileSync("ecosystem.config.cjs", "utf8");
  const hostingerDoc = fs.readFileSync("docs/HOSTINGER-HPANEL.md", "utf8");
  const hostingerEnv = fs.readFileSync("scripts/build-hostinger-env.mjs", "utf8");

  assert.match(scripts["hostinger:build"], /prisma migrate deploy/);
  assert.match(scripts.start, /hostinger-preflight/);
  assert.match(scripts.start, /node dist\/server\.cjs/);
  assert.doesNotMatch(JSON.stringify(scripts), /prestart/);

  assert.match(scripts.postinstall, /prisma-postinstall/);
  assert.ok(fs.existsSync("scripts/prisma-postinstall.mjs"));
  assert.ok(fs.existsSync("scripts/hostinger-preflight.mjs"));

  assert.match(startServer, /closeAllConnections/);
  assert.match(startServer, /shutdownTimeoutMs/);
  assert.match(startServer, /isProduction \? 3_000 : 15_000/);

  assert.match(ecosystem, /HOSTINGER_WEBAPP/);
  assert.match(hostingerDoc, /hostinger:build/);
  assert.match(hostingerDoc, /SKIP_PRISMA_POSTINSTALL/);
  assert.match(hostingerDoc, /HOSTINGER_WEBAPP/);
  assert.match(hostingerEnv, /HOSTINGER_WEBAPP/);
  assert.match(hostingerEnv, /SKIP_PRISMA_POSTINSTALL/);
  assert.match(hostingerEnv, /CACHE_TTL_SECONDS/);
  assert.match(hostingerEnv, /AUTH_USER_CACHE_MS/);
  assert.match(hostingerEnv, /DATABASE_POOL_MAX/);

  console.log("Hostinger deploy guards passed");
});
