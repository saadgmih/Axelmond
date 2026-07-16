#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function collectTestFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTestFiles(absolute);
    return /\.test\.tsx?$/.test(entry.name) ? [absolute.replaceAll("\\", "/")] : [];
  });
}

const files = collectTestFiles("tests");
const securityRuntime = files.filter((file) => path.basename(file).startsWith("security-runtime-"));
const mobileRuntime = files.filter((file) => path.basename(file) === "mobile-api-runtime.test.ts");
const standard = files.filter((file) => !securityRuntime.includes(file) && !mobileRuntime.includes(file));
const staticFiles = standard.filter((file) =>
  /from\s+["'][^"']*helpers\/rulesTest(?:\.ts)?["']/.test(fs.readFileSync(file, "utf8")),
);
const unitRuntime = standard.filter((file) => !staticFiles.includes(file));
const coverageSummaryPath = path.join("coverage", "coverage-summary.json");
let coverage = "not measured in this workspace";
if (fs.existsSync(coverageSummaryPath)) {
  const summary = JSON.parse(fs.readFileSync(coverageSummaryPath, "utf8")).total;
  coverage = ["lines", "statements", "functions", "branches"]
    .map((metric) => `${metric}=${summary[metric]?.pct ?? "n/a"}%`)
    .join(", ");
}

console.log("[test-summary] Suite inventory");
console.log(`[test-summary] discovered=${files.length}`);
console.log(
  `[test-summary] standard=${standard.length} (static=${staticFiles.length}, unit/runtime=${unitRuntime.length})`,
);
console.log(`[test-summary] excluded from standard Vitest=${securityRuntime.length + mobileRuntime.length}`);
console.log(`[test-summary] separate security runtime=${securityRuntime.length}`);
console.log(`[test-summary] separate mobile runtime=${mobileRuntime.length}`);
console.log(`[test-summary] coverage=${coverage}`);
