import assert from "node:assert/strict";
import fs from "node:fs";
import { buildFixedDatabaseUrl } from "../src/db.ts";
import { isVerboseStartup } from "../src/server/startup-logging.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("startup-logging", () => {
  const startServerSource = fs.readFileSync("src/server/start-server.ts", "utf8");
  const loadEnvSource = fs.readFileSync("src/load-env.ts", "utf8");

  assert.match(loadEnvSource, /dotenv\.config\(\{\s*quiet:\s*true\s*\}\)/);
  assert.match(startServerSource, /Production environment loaded/);
  assert.match(startServerSource, /isVerboseStartup\(\)/);
  assert.match(startServerSource, /getSmtpStartupSummary/);
  assert.match(startServerSource, /if \(isVerboseStartup\(\)\) \{[\s\S]*readSmtpBanner/);

  const originalNodeEnv = process.env.NODE_ENV;
  const originalVerbose = process.env.STARTUP_VERBOSE;

  try {
    process.env.NODE_ENV = "production";
    delete process.env.STARTUP_VERBOSE;
    assert.equal(isVerboseStartup(), false);

    process.env.STARTUP_VERBOSE = "true";
    assert.equal(isVerboseStartup(), true);

    process.env.NODE_ENV = "development";
    delete process.env.STARTUP_VERBOSE;
    assert.equal(isVerboseStartup(), true);
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalVerbose === undefined) delete process.env.STARTUP_VERBOSE;
    else process.env.STARTUP_VERBOSE = originalVerbose;
  }

  const normalized = buildFixedDatabaseUrl("postgresql://user:pass@host/neondb?sslmode=require");
  assert.match(normalized.url, /sslmode=verify-full/);
});
