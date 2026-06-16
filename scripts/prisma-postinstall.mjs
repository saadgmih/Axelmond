#!/usr/bin/env node
/**
 * Avoid duplicate prisma generate during Hostinger deploy overlap.
 * Build (`npm run build` / `hostinger:build`) always runs generate explicitly.
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

if (process.env.SKIP_PRISMA_POSTINSTALL === "1") {
  console.log("[postinstall] SKIP_PRISMA_POSTINSTALL=1 — skipping prisma generate");
  process.exit(0);
}

const clientEntry = "node_modules/.prisma/client/index.js";
if (existsSync(clientEntry) && process.env.FORCE_PRISMA_GENERATE !== "1") {
  console.log("[postinstall] Prisma client already present — skipping generate");
  process.exit(0);
}

const result = spawnSync("npx", ["prisma", "generate"], { stdio: "inherit", shell: true });
process.exit(result.status ?? 1);
