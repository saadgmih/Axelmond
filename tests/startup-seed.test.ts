import assert from "node:assert/strict";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import fs from "node:fs";
import { shouldSkipStartupSeed } from "../src/startup-seed.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("startup-seed", () => {
  const serverSource = readApiRouteSources();
  const dbSource = fs.readFileSync("src/db.ts", "utf8");
  const schemaSource = fs.readFileSync("prisma/schema.prisma", "utf8");
  const packageJsonSource = fs.readFileSync("package.json", "utf8");

  assert.match(serverSource, /shouldSkipStartupSeed\(\)/);
  assert.match(serverSource, /Startup seed failed — server continuing/);
  assert.match(serverSource, /Startup seed skipped/);
  assert.match(dbSource, /PrismaPg/);
  assert.match(dbSource, /quotePgIdentifier\(schema\)/);
  assert.match(dbSource, /PostgreSQL active schema/);
  assert.match(dbSource, /isVerboseStartup\(\)/);
  assert.match(dbSource, /Prisma datasource schema forced/);
  assert.match(dbSource, /process\.env\.DATABASE_URL = fixed\.url/);
  assert.match(dbSource, /connectionString:\s*fixedDatabaseUrl/);

  const generatedSchema = fs.readFileSync("node_modules/.prisma/client/schema.prisma", "utf8");
  assert.match(generatedSchema, /schemas\s*=\s*\["AxelmondResearchLab"\]/);
  assert.match(generatedSchema, /model Course[\s\S]*@@schema\("AxelmondResearchLab"\)/);
  assert.match(schemaSource, /engineType = "client"/);
  assert.match(packageJsonSource, /"postinstall": "prisma generate"/);
  assert.match(packageJsonSource, /"build": "prisma generate && vite build/);

  const originalNodeEnv = process.env.NODE_ENV;
  const originalFlag = process.env.RUN_STARTUP_SEED;

  try {
    process.env.NODE_ENV = "production";
    delete process.env.RUN_STARTUP_SEED;
    assert.equal(shouldSkipStartupSeed(), true);

    process.env.RUN_STARTUP_SEED = "true";
    assert.equal(shouldSkipStartupSeed(), false);

    process.env.RUN_STARTUP_SEED = "false";
    assert.equal(shouldSkipStartupSeed(), true);

    process.env.NODE_ENV = "development";
    delete process.env.RUN_STARTUP_SEED;
    assert.equal(shouldSkipStartupSeed(), false);
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalFlag === undefined) delete process.env.RUN_STARTUP_SEED;
    else process.env.RUN_STARTUP_SEED = originalFlag;
  }
});
