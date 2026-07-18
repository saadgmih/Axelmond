#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const DIST_DIR = path.resolve("dist");
const MANIFEST_PATH = path.join(DIST_DIR, ".vite", "manifest.json");
const CRITICAL_LOGO_PATH = path.resolve("public", "performance-logo-003a24a4-192.png");
const CRITICAL_PORTRAIT_PATH = path.resolve("public", "director-oussama-full-720-8e453474.jpg");

const budgets = {
  initialJsGzipBytes: 150 * 1024,
  initialCssGzipBytes: 40 * 1024,
  visitorJsGzipBytes: 170 * 1024,
  entryChunkGzipBytes: 100 * 1024,
  initialAssetRequests: 4,
  visitorAssetRequests: 10,
  largestJsChunkBytes: 525 * 1024,
  largestWorkerBytes: 1_300 * 1024,
  criticalImageBytes: 64 * 1024,
  criticalPortraitBytes: 80 * 1024,
};

function readFileSize(relativeFile) {
  return fs.statSync(path.join(DIST_DIR, relativeFile)).size;
}

function gzipSize(relativeFile) {
  return zlib.gzipSync(fs.readFileSync(path.join(DIST_DIR, relativeFile)), { level: 9 }).length;
}

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error(
    `[performance-budget] Missing ${path.relative(process.cwd(), MANIFEST_PATH)}. Run npm run build first.`,
  );
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
const manifestEntries = Object.entries(manifest);
const entryRecord = manifestEntries.find(([, value]) => value.isEntry);
if (!entryRecord) {
  console.error("[performance-budget] Vite manifest does not contain an entry chunk.");
  process.exit(1);
}

const [entryKey, entry] = entryRecord;
const initialKeys = new Set();
function collectStaticImports(key) {
  if (initialKeys.has(key) || !manifest[key]) return;
  initialKeys.add(key);
  for (const importedKey of manifest[key].imports || []) collectStaticImports(importedKey);
}
collectStaticImports(entryKey);

const initialRecords = [...initialKeys].map((key) => ({ key, ...manifest[key] }));
const initialJsFiles = [...new Set(initialRecords.map((record) => record.file).filter((file) => file.endsWith(".js")))];
const initialCssFiles = [
  ...new Set(initialRecords.flatMap((record) => record.css || []).filter((file) => file.endsWith(".css"))),
];
const initialJsGzipBytes = initialJsFiles.reduce((total, file) => total + gzipSize(file), 0);
const initialCssGzipBytes = initialCssFiles.reduce((total, file) => total + gzipSize(file), 0);
const entryChunkGzipBytes = gzipSize(entry.file);
const initialAssetRequests = initialJsFiles.length + initialCssFiles.length;

const visitorKeys = new Set(initialKeys);
function collectVisitorImports(key) {
  if (visitorKeys.has(key) || !manifest[key]) return;
  visitorKeys.add(key);
  for (const importedKey of manifest[key].imports || []) collectVisitorImports(importedKey);
}
collectVisitorImports("src/components/AuthScreen.tsx");
const visitorRecords = [...visitorKeys].map((key) => ({ key, ...manifest[key] }));
const visitorJsFiles = [...new Set(visitorRecords.map((record) => record.file).filter((file) => file.endsWith(".js")))];
const visitorCssFiles = [
  ...new Set(visitorRecords.flatMap((record) => record.css || []).filter((file) => file.endsWith(".css"))),
];
const visitorJsGzipBytes = visitorJsFiles.reduce((total, file) => total + gzipSize(file), 0);
const visitorAssetRequests = visitorJsFiles.length + visitorCssFiles.length;

const jsChunks = manifestEntries
  .map(([key, value]) => ({ key, ...value }))
  .filter((record) => record.file?.endsWith(".js"))
  .map((record) => ({ ...record, bytes: readFileSize(record.file) }));
const workerFiles = fs
  .readdirSync(path.join(DIST_DIR, "assets"))
  .filter((file) => file.endsWith(".mjs"))
  .map((file) => ({ file: `assets/${file}`, bytes: readFileSize(`assets/${file}`) }));
const largestJsChunk = jsChunks.sort((a, b) => b.bytes - a.bytes)[0];
const largestWorker = workerFiles.sort((a, b) => b.bytes - a.bytes)[0] || { file: "none", bytes: 0 };
const criticalImageBytes = fs.statSync(CRITICAL_LOGO_PATH).size;
const criticalPortraitBytes = fs.statSync(CRITICAL_PORTRAIT_PATH).size;
const initialSourceNames = visitorRecords.map((record) => `${record.key} ${record.name || ""}`).join("\n");
const forbiddenInitialFeatures = ["livekit", "PdfLessonViewer", "paypal", "socket.io", "simplewebauthn", "LatexText"];
const leakedInitialFeatures = forbiddenInitialFeatures.filter((feature) =>
  initialSourceNames.toLowerCase().includes(feature.toLowerCase()),
);

const checks = [
  {
    label: "initial JavaScript (gzip)",
    actual: formatKiB(initialJsGzipBytes),
    limit: formatKiB(budgets.initialJsGzipBytes),
    ok: initialJsGzipBytes <= budgets.initialJsGzipBytes,
  },
  {
    label: "initial CSS (gzip)",
    actual: formatKiB(initialCssGzipBytes),
    limit: formatKiB(budgets.initialCssGzipBytes),
    ok: initialCssGzipBytes <= budgets.initialCssGzipBytes,
  },
  {
    label: "visitor route JavaScript (gzip)",
    actual: formatKiB(visitorJsGzipBytes),
    limit: formatKiB(budgets.visitorJsGzipBytes),
    ok: visitorJsGzipBytes <= budgets.visitorJsGzipBytes,
  },
  {
    label: "entry chunk (gzip)",
    actual: formatKiB(entryChunkGzipBytes),
    limit: formatKiB(budgets.entryChunkGzipBytes),
    ok: entryChunkGzipBytes <= budgets.entryChunkGzipBytes,
  },
  {
    label: "initial asset requests",
    actual: String(initialAssetRequests),
    limit: String(budgets.initialAssetRequests),
    ok: initialAssetRequests <= budgets.initialAssetRequests,
  },
  {
    label: "visitor route asset requests",
    actual: String(visitorAssetRequests),
    limit: String(budgets.visitorAssetRequests),
    ok: visitorAssetRequests <= budgets.visitorAssetRequests,
  },
  {
    label: `largest JS chunk (${largestJsChunk.file})`,
    actual: formatKiB(largestJsChunk.bytes),
    limit: formatKiB(budgets.largestJsChunkBytes),
    ok: largestJsChunk.bytes <= budgets.largestJsChunkBytes,
  },
  {
    label: `largest worker (${largestWorker.file})`,
    actual: formatKiB(largestWorker.bytes),
    limit: formatKiB(budgets.largestWorkerBytes),
    ok: largestWorker.bytes <= budgets.largestWorkerBytes,
  },
  {
    label: "critical logo",
    actual: formatKiB(criticalImageBytes),
    limit: formatKiB(budgets.criticalImageBytes),
    ok: criticalImageBytes <= budgets.criticalImageBytes,
  },
  {
    label: "critical founder portrait",
    actual: formatKiB(criticalPortraitBytes),
    limit: formatKiB(budgets.criticalPortraitBytes),
    ok: criticalPortraitBytes <= budgets.criticalPortraitBytes,
  },
  {
    label: "heavy features in initial dependency graph",
    actual: leakedInitialFeatures.length ? leakedInitialFeatures.join(", ") : "none",
    limit: "none",
    ok: leakedInitialFeatures.length === 0,
  },
];

for (const check of checks) {
  console.log(
    `[performance-budget] ${check.ok ? "PASS" : "FAIL"} ${check.label}: ${check.actual} (limit ${check.limit})`,
  );
}

const report = {
  generatedAt: new Date().toISOString(),
  budgets,
  measurements: {
    initialJsFiles,
    initialCssFiles,
    visitorJsFiles,
    initialJsGzipBytes,
    initialCssGzipBytes,
    visitorJsGzipBytes,
    entryChunkGzipBytes,
    initialAssetRequests,
    visitorAssetRequests,
    largestJsChunk: { file: largestJsChunk.file, bytes: largestJsChunk.bytes },
    largestWorker,
    criticalImageBytes,
    criticalPortraitBytes,
    leakedInitialFeatures,
  },
  passed: checks.every((check) => check.ok),
};
fs.writeFileSync(path.join(DIST_DIR, "performance-budget.json"), `${JSON.stringify(report, null, 2)}\n`);

if (!report.passed) process.exit(1);
