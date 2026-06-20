import { spawn } from "node:child_process";
import fs from "node:fs";
import fsPromises from "node:fs/promises";

const readyFile = process.env.CI_POSTGRES_READY_FILE;
const stopFile = process.env.CI_POSTGRES_STOP_FILE;

if (!readyFile || !stopFile) {
  throw new Error("CI PostgreSQL ready and stop files must be configured");
}

const preflightEnvironmentNames = [
  "NODE_ENV",
  "APP_URL",
  "DATABASE_URL",
  "MOBILE_CLIENT_SECRET",
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "PAYPAL_WEBHOOK_ID",
  "LIVEKIT_URL",
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "UPLOADTHING_TOKEN",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "PAYPAL_ENV",
];
const securityPreflightEnv = Object.fromEntries(
  preflightEnvironmentNames.map((name) => {
    const value = process.env[`CI_PREFLIGHT_${name}`];
    if (!value) throw new Error(`Missing CI preflight variable: CI_PREFLIGHT_${name}`);
    return [name, value];
  }),
);

const checks = [
  ["Apply Prisma migrations", "npx", ["prisma", "migrate", "deploy"]],
  ["Lint", "npm", ["run", "lint"]],
  ["Strict TypeScript", "npm", ["run", "lint:strict"]],
  ["ESLint", "npm", ["run", "lint:eslint"]],
  ["Format check", "npm", ["run", "format:check"]],
  ["Test", "npm", ["test"]],
  ["Migration guard", "npm", ["run", "ci:migrations"]],
  ["Security runtime tests", "npm", ["run", "test:security-runtime"]],
  ["Build", "npm", ["run", "build"]],
  ["Security preflight", "npx", ["tsx", "scripts/security-preflight.ts"], securityPreflightEnv],
  ["npm audit (high+)", "npm", ["audit", "--audit-level=high"]],
  ["Secret scan", "npm", ["run", "ci:secrets"]],
];

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function runCommand(label, command, args, extraEnv = {}) {
  console.log(`::group::${label}`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...extraEnv },
      shell: process.platform === "win32",
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      console.log("::endgroup::");
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} failed (${signal ? `signal ${signal}` : `exit ${code}`})`));
    });
  });
}

async function waitForPostgres(postgresProcess) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (fs.existsSync(readyFile)) return;
    if (postgresProcess.exitCode !== null || postgresProcess.signalCode !== null) {
      throw new Error("CI PostgreSQL exited before becoming ready");
    }
    await sleep(500);
  }
  throw new Error("CI PostgreSQL did not become ready within 120 seconds");
}

async function stopPostgres(postgresProcess) {
  await fsPromises.writeFile(stopFile, "stop\n", "utf8");
  if (postgresProcess.exitCode !== null || postgresProcess.signalCode !== null) {
    if (postgresProcess.exitCode !== 0) {
      throw new Error(
        `CI PostgreSQL exited unexpectedly (${postgresProcess.signalCode ? `signal ${postgresProcess.signalCode}` : `exit ${postgresProcess.exitCode}`})`,
      );
    }
    return;
  }

  const result = await Promise.race([
    new Promise((resolve) => postgresProcess.once("exit", (code, signal) => resolve({ code, signal }))),
    sleep(15_000).then(() => null),
  ]);
  if (!result) {
    postgresProcess.kill("SIGTERM");
    throw new Error("CI PostgreSQL did not stop within 15 seconds");
  }
  if (result.code !== 0) {
    throw new Error(
      `CI PostgreSQL failed to stop (${result.signal ? `signal ${result.signal}` : `exit ${result.code}`})`,
    );
  }
}

const postgresProcess = spawn(process.execPath, ["scripts/start-ci-postgres.mjs"], {
  env: process.env,
  stdio: "inherit",
});
postgresProcess.once("error", (error) => {
  console.error(`[ci-postgres] supervisor spawn failed: ${String(error)}`);
});

let failed = false;
try {
  await waitForPostgres(postgresProcess);
  for (const [label, command, args, extraEnv] of checks) {
    await runCommand(label, command, args, extraEnv);
  }
} catch (error) {
  failed = true;
  console.error(error instanceof Error ? error.stack : String(error));
} finally {
  await stopPostgres(postgresProcess);
}

if (failed) process.exitCode = 1;
