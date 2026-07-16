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
  const postinstall = fs.readFileSync("scripts/prisma-postinstall.mjs", "utf8");
  const ciWorkflow = fs.readFileSync(".github/workflows/ci.yml", "utf8");
  const deployWorkflow = fs.readFileSync(".github/workflows/hostinger-deploy.yml", "utf8");
  const productionProbe = fs.readFileSync("scripts/verify-production-edge.mjs", "utf8");
  const legacyVpsDeploy = fs.readFileSync("scripts/deploy-hostinger.sh", "utf8");

  assert.match(scripts["hostinger:build"], /prisma migrate deploy/);
  assert.match(scripts.start, /hostinger-preflight/);
  assert.match(scripts.start, /prisma migrate deploy/);
  assert.match(scripts.start, /hostinger-start/);
  assert.doesNotMatch(scripts.start, /node dist\/server\.cjs/);
  assert.doesNotMatch(JSON.stringify(scripts), /prestart/);
  assert.ok(scripts.start.indexOf("prisma migrate deploy") < scripts.start.indexOf("hostinger-start"));
  assert.equal(packageJson.engines?.node, "^20.19.0 || ^22.12.0");

  assert.match(scripts.postinstall, /prisma-postinstall/);
  assert.ok(fs.existsSync("scripts/prisma-postinstall.mjs"));
  assert.ok(fs.existsSync("scripts/hostinger-preflight.mjs"));
  assert.ok(fs.existsSync("scripts/hostinger-start.mjs"));
  assert.match(postinstall, /Generating Prisma client/);
  assert.doesNotMatch(postinstall, /clientEntry|already present/);

  assert.match(hostingerEnv, /HOSTINGER_PORT_WAIT_MS/);
  assert.match(startServer, /EADDRINUSE/);
  assert.match(startServer, /closeAllConnections/);
  assert.match(startServer, /shutdownTimeoutMs/);
  assert.match(startServer, /HOSTINGER_WEBAPP === "1" \? 8_000/);

  assert.match(ecosystem, /HOSTINGER_WEBAPP/);
  assert.match(legacyVpsDeploy, /deploy-hostinger\.sh is VPS-only/);
  assert.match(deployWorkflow, /group:\s*hostinger-production/);
  assert.match(deployWorkflow, /cancel-in-progress:\s*false/);
  assert.match(ciWorkflow, /runs-on:\s*windows-latest/);
  assert.match(deployWorkflow, /runs-on:\s*\[self-hosted, Windows, X64\]/);
  assert.doesNotMatch(ciWorkflow, /^\s*pull_request:/m);
  assert.match(deployWorkflow, /actions\/checkout@v5/);
  assert.match(deployWorkflow, /actions\/setup-node@v5/);
  assert.match(deployWorkflow, /node scripts\/verify-production-edge\.mjs/);
  assert.match(deployWorkflow, /PRODUCTION_PROBE_ROUNDS:\s*"5"/);
  assert.match(deployWorkflow, /PRODUCTION_PROBE_DELAY_MS:\s*"15000"/);
  assert.match(productionProbe, /Promise\.allSettled/);
  assert.match(productionProbe, /Hostinger hCDN/);
  assert.match(productionProbe, /<title>Performance Académique/);
  assert.match(productionProbe, /payload\?\.status !== "UP"/);
  assert.match(productionProbe, /Array\.isArray\(payload\)/);
  assert.doesNotMatch(deployWorkflow, /HOSTINGER_PROBE_BLOCKED/);
  assert.match(hostingerDoc, /hostinger:build/);
  assert.match(hostingerDoc, /SKIP_PRISMA_POSTINSTALL/);
  assert.match(hostingerDoc, /HOSTINGER_WEBAPP/);
  assert.match(hostingerEnv, /HOSTINGER_WEBAPP/);
  assert.match(hostingerEnv, /SKIP_PRISMA_POSTINSTALL/);
  assert.match(hostingerEnv, /CACHE_TTL_SECONDS/);
  assert.match(hostingerEnv, /AUTH_USER_CACHE_MS/);
  assert.match(hostingerEnv, /DATABASE_POOL_MAX/);
  assert.match(hostingerEnv, /DATABASE_POOL_MAX:\s*"2"/);
  assert.match(hostingerEnv, /RUN_STARTUP_PURGES:\s*"false"/);
  assert.match(hostingerEnv, /STARTUP_DB_TIMEOUT_MS/);
  assert.match(hostingerEnv, /GRACEFUL_SHUTDOWN_MS:\s*"8000"/);
  assert.doesNotMatch(hostingerEnv, /AUTH_MAX_ATTEMPTS|AUTH_LOCKOUT_WINDOW_MS/);
  assert.match(startServer, /startupState\.listening\s*=\s*true/);
  assert.match(startServer, /verifyDatabaseAtStartup/);

  console.log("Hostinger deploy guards passed");
});
