#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const category = process.argv[2];
if (!new Set(["static", "unit"]).has(category)) {
  throw new Error("Usage: node scripts/run-vitest-category.mjs <static|unit>");
}

function collectTestFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTestFiles(absolute);
    return /\.test\.tsx?$/.test(entry.name) ? [absolute.replaceAll("\\", "/")] : [];
  });
}

function excludedFromStandardVitest(file) {
  const name = path.basename(file);
  return name.startsWith("security-runtime-") || name === "mobile-api-runtime.test.ts";
}

function isStaticRulesTest(file) {
  const source = fs.readFileSync(file, "utf8");
  return /from\s+["'][^"']*helpers\/rulesTest(?:\.ts)?["']/.test(source);
}

const standardFiles = collectTestFiles("tests").filter((file) => !excludedFromStandardVitest(file));
const selectedFiles = standardFiles.filter((file) =>
  category === "static" ? isStaticRulesTest(file) : !isStaticRulesTest(file),
);

if (selectedFiles.length === 0) throw new Error(`No ${category} test files found`);
console.log(`[test-suite] ${category}: executing ${selectedFiles.length} files`);

const vitestCli = path.resolve("node_modules", "vitest", "vitest.mjs");
const result = spawnSync(process.execPath, [vitestCli, "run", ...selectedFiles], {
  stdio: "inherit",
  shell: false,
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
