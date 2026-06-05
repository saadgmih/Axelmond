import fs from "fs";
import path from "path";

const SECRET_PATTERNS = {
  PostgreSQL_URL: /postgresql:\/\/([^@\n]+)@([^/\n\s]+)/i,
  Stripe_Secret_Key: /sk_live_[0-9a-zA-Z]{24}/,
  Stripe_Test_Secret_Key: /sk_test_[0-9a-zA-Z]{24}/,
  UploadThing_Token: /eyJ[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+/i,
  Generic_Secret: /(api[-_]?key|secret|password|passwd|pass|token)\s*[:=]\s*['"`][a-zA-Z0-9_\-+*/=!@#$%^&*()]{8,}['"`]/i,
};

const IGNORED_DIRS = ["node_modules", "dist", ".git", ".data", "coverage"];
const IGNORED_FILES = [".env", ".env.example", "scan-secrets.js", "package-lock.json"];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    for (const [name, regex] of Object.entries(SECRET_PATTERNS)) {
      const match = content.match(regex);
      if (match) {
        // If it's a generic secret, avoid matching env file references like process.env.API_KEY
        if (name === "Generic_Secret" && (match[0].includes("process.env") || match[0].includes("env."))) {
          continue;
        }
        console.warn(`[WARNING] Potential ${name} found in ${filePath}: "${match[0]}"`);
      }
    }
  } catch (err) {
    // Ignore read errors
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (IGNORED_DIRS.includes(file)) continue;
      walkDir(fullPath);
    } else {
      if (IGNORED_FILES.includes(file)) continue;
      if (/\.(js|ts|tsx|json|html|md|css|yml|yaml|sh)$/i.test(file)) {
        scanFile(fullPath);
      }
    }
  }
}

console.log("Starting secret scanning...");
walkDir(process.cwd());
console.log("Secret scanning complete.");
