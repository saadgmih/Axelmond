/**
 * Orchestrates local backend + API validation for Phase v1.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const unicodeRoot = path.resolve(__dirname, "../..");
const PORT = process.env.VALIDATION_PORT || "31999";
const BASE_URL = `http://127.0.0.1:${PORT}`;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await delay(1000);
  }
  throw new Error("Backend local indisponible");
}

function run(command, args, cwd, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: "inherit",
      shell: true,
    });
    child.on("exit", (code) => (code === 0 ? resolve(undefined) : reject(new Error(`${command} failed (${code})`))));
  });
}

const server = spawn("npx", ["tsx", "server.ts"], {
  cwd: unicodeRoot,
  env: {
    ...process.env,
    PORT,
    RUN_STARTUP_SEED: "false",
    SECURITY_RUNTIME_TEST: "1",
    RATE_LIMIT_MAX_REQUESTS: "999999",
  },
  stdio: "ignore",
  shell: true,
});

try {
  console.log(`Starting local backend on ${BASE_URL}...`);
  await waitForHealth();
  console.log("Backend ready.\n");

  console.log("Seeding runtime fixtures...");
  await run("npx", ["tsx", "tests/seed-mobile-v1-fixtures.ts"], unicodeRoot);

  await run("node", ["scripts/validate-final-v1.mjs", BASE_URL], path.resolve(__dirname, ".."));
} finally {
  if (server.pid) {
    spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { shell: true, stdio: "ignore" });
  }
}
