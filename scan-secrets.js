import fs from "node:fs";
import path from "node:path";

const SCAN_ROOTS = ["src", "scripts", "prisma", "server.ts", "vite.config.ts", "ecosystem.config.cjs"];
const IGNORED_DIRS = new Set(["node_modules", "dist", ".git", ".data", "coverage", "archive", "axelmond-mobile"]);
const IGNORED_FILES = new Set([".env", ".env.example", "scan-secrets.js", "package-lock.json", "smoke-test.mjs"]);

const ALLOWLIST_SUBSTRINGS = [
  "axelmond-dev-secret",
  "axelmond-email-verification-dev-secret",
  "MY_",
  "CHANGEME",
  "CHANGE_ME",
  "YOUR_",
  "EXAMPLE_",
  "process.env",
  "env.",
];

const CRITICAL_PATTERNS = {
  Stripe_Live_Secret: /sk_live_[0-9a-zA-Z]{24,}/,
  Stripe_Test_Secret: /sk_test_[0-9a-zA-Z]{24,}/,
  UploadThing_Token: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
  Postgres_Remote: /postgresql:\/\/[^@\s\n]+@(?!localhost|127\.0\.0\.1)[^/\s\n]+/i,
};

const SOURCE_GENERIC_PATTERN = /(?:api[-_]?key|secret|password|passwd)\s*[:=]\s*['"`]([^'"`]{12,})['"`]/i;

/** @type {Array<{ rule: string; file: string; snippet: string }>} */
const findings = [];

function isAllowlisted(snippet) {
  return ALLOWLIST_SUBSTRINGS.some((part) => snippet.includes(part));
}

function recordFinding(rule, filePath, snippet) {
  if (isAllowlisted(snippet)) return;
  findings.push({ rule, file: filePath, snippet });
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  for (const [name, regex] of Object.entries(CRITICAL_PATTERNS)) {
    const match = content.match(regex);
    if (match?.[0]) {
      recordFinding(name, filePath, match[0]);
    }
  }

  if (!filePath.includes(`${path.sep}tests${path.sep}`)) {
    for (const match of content.matchAll(new RegExp(SOURCE_GENERIC_PATTERN.source, "gi"))) {
      recordFinding("Generic_Secret", filePath, match[0]);
    }
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      walkDir(fullPath);
      continue;
    }
    if (IGNORED_FILES.has(entry.name)) continue;
    if (!/\.(js|ts|tsx|mjs|cjs|json|html|md|css|yml|yaml|sh|sql|prisma)$/i.test(entry.name)) continue;
    scanFile(fullPath);
  }
}

console.log("Starting secret scanning...");

for (const root of SCAN_ROOTS) {
  const fullRoot = path.resolve(process.cwd(), root);
  if (!fs.existsSync(fullRoot)) continue;
  if (fs.statSync(fullRoot).isDirectory()) {
    walkDir(fullRoot);
  } else {
    scanFile(fullRoot);
  }
}

if (findings.length === 0) {
  console.log("Secret scanning complete — no issues found.");
  process.exit(0);
}

console.error(`Secret scanning failed — ${findings.length} potential issue(s):`);
for (const finding of findings) {
  console.error(`  [${finding.rule}] ${finding.file}: ${finding.snippet}`);
}
process.exit(1);
