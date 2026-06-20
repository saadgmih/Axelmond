#!/usr/bin/env node
/**
 * Generate from the checked-out schema on every regular install. The generated
 * directory can survive between CI jobs, so its mere presence is not proof that
 * it matches the current Prisma schema.
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

if (process.env.SKIP_PRISMA_POSTINSTALL === "1") {
  console.log("[postinstall] SKIP_PRISMA_POSTINSTALL=1 — skipping prisma generate");
  process.exit(0);
}

const prismaCli = path.resolve("node_modules/prisma/build/index.js");
if (!existsSync(prismaCli)) {
  console.error("[postinstall] Prisma CLI is missing; cannot generate the client");
  process.exit(1);
}

console.log("[postinstall] Generating Prisma client from prisma/schema.prisma");
const result = spawnSync(process.execPath, [prismaCli, "generate"], {
  stdio: "inherit",
  shell: false,
});
process.exit(result.status ?? 1);
