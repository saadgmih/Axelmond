import { spawn, execFile, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const isolatedRuntimeDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();
if (isolatedRuntimeDatabaseUrl) {
  process.env.DATABASE_URL = isolatedRuntimeDatabaseUrl;
} else {
  delete process.env.DATABASE_URL;
}

const execFileAsync = promisify(execFile);

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const DEFAULT_SECURITY_RUNTIME_PORT = 31999;

export interface SecurityRuntimeServerHandle {
  process: ChildProcess;
  baseUrl: string;
  port: number;
}

export interface SecurityRuntimeSession {
  accessToken: string;
  csrfToken: string;
  cookieHeader: string;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isSecurityRuntimeDatabaseAvailable() {
  return Boolean(process.env.TEST_DATABASE_URL?.trim() && process.env.DATABASE_URL === process.env.TEST_DATABASE_URL);
}

export const isSecurityRuntimeDatabaseConfigured = isSecurityRuntimeDatabaseAvailable;

/** Return true when runtime integration tests should no-op (missing DATABASE_URL). */
export function skipSecurityRuntimeTests(reason = "Security runtime tests skipped: DATABASE_URL missing"): boolean {
  if (isSecurityRuntimeDatabaseAvailable()) return false;
  console.log(reason);
  return true;
}

export async function allocateSecurityRuntimePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close((err) => {
        if (err) reject(err);
        else resolve(port);
      });
    });
  });
}

export function buildSecurityRuntimeServerEnv(port = DEFAULT_SECURITY_RUNTIME_PORT): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PORT: String(port),
    SECURITY_RUNTIME_TEST: "1",
    RUN_STARTUP_SEED: "false",
    NODE_ENV: "test",
    DATABASE_URL: process.env.TEST_DATABASE_URL,
    TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
    OPENAI_API_KEY: "",
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS || "999999",
    CHAT_TUTOR_RATE_LIMIT_MAX: process.env.CHAT_TUTOR_RATE_LIMIT_MAX || "9999",
    UPLOAD_RATE_LIMIT_MAX: process.env.UPLOAD_RATE_LIMIT_MAX || "9999",
    AUTH_TOKEN_SECRET: process.env.AUTH_TOKEN_SECRET || "security-runtime-test-secret",
  };
}

export function startSecurityRuntimeServer(port = DEFAULT_SECURITY_RUNTIME_PORT): SecurityRuntimeServerHandle {
  const env = buildSecurityRuntimeServerEnv(port);
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn("npx", ["tsx", "server.ts"], {
    cwd: projectRoot,
    env,
    stdio: "ignore",
    shell: true,
    windowsHide: true,
  });

  return { process: child, baseUrl, port };
}

export async function waitForSecurityRuntimeHealth(
  baseUrl: string,
  options: { timeoutMs?: number; intervalMs?: number; process?: ChildProcess } = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const intervalMs = options.intervalMs ?? 500;
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    if (options.process && options.process.exitCode !== null) {
      throw new Error(`Security runtime server exited early with code ${options.process.exitCode}`);
    }

    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        const body = (await response
          .clone()
          .json()
          .catch(() => null)) as { status?: string } | null;
        if (body?.status === "UP") {
          return response;
        }
        lastError = new Error(`Health is not ready yet (${body?.status || "unknown"})`);
      } else {
        lastError = new Error(`Health returned HTTP ${response.status}`);
      }
    } catch (err) {
      lastError = err;
    }
    await delay(intervalMs);
  }

  throw new Error(`Timed out waiting for ${baseUrl}/api/health: ${String(lastError)}`);
}

async function killProcessTree(pid: number): Promise<void> {
  if (process.platform === "win32") {
    try {
      await execFileAsync("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true });
    } catch {
      // Process may already be gone.
    }
    return;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Process may already be gone.
    }
  }
}

export async function stopSecurityRuntimeServer(handle: SecurityRuntimeServerHandle): Promise<void> {
  const { process: child } = handle;
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  if (child.pid) {
    await killProcessTree(child.pid);
  } else {
    child.kill();
  }

  await new Promise<void>((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }

    const forceKillTimer = setTimeout(async () => {
      if (child.pid) {
        await killProcessTree(child.pid);
      }
      resolve();
    }, 5_000);

    child.once("exit", () => {
      clearTimeout(forceKillTimer);
      resolve();
    });
  });
}

function extractSetCookieHeaders(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const raw = response.headers.get("set-cookie");
  return raw ? [raw] : [];
}

function parseCookieHeader(setCookies: string[]): string {
  return setCookies
    .map((entry) => entry.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

export async function loginViaHttp(
  baseUrl: string,
  input: { email: string; password: string; role: "STUDENT" | "PROFESSOR" | "RESEARCHER" | "ADMIN" },
): Promise<SecurityRuntimeSession> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.token || !payload?.csrfToken) {
    throw new Error(payload?.error || `Login failed with HTTP ${response.status}`);
  }

  return {
    accessToken: payload.token,
    csrfToken: payload.csrfToken,
    cookieHeader: parseCookieHeader(extractSetCookieHeaders(response)),
  };
}

export async function authedFetch(
  baseUrl: string,
  session: SecurityRuntimeSession,
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.accessToken}`,
    "X-CSRF-Token": session.csrfToken,
  };

  if (session.cookieHeader) {
    headers.Cookie = session.cookieHeader;
  }

  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  return fetch(`${baseUrl}${path}`, init);
}
