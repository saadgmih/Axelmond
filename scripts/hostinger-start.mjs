#!/usr/bin/env node
/**
 * Hostinger deploy handoff: wait until PORT is free before starting Node,
 * so overlapping deploys do not spawn duplicate listeners (503 Max Processes).
 */
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const serverEntry = path.join(root, "dist", "server.cjs");

const PORT = Number(process.env.PORT) || 3000;
const isHostinger = process.env.HOSTINGER_WEBAPP === "1";
const waitMs = Number(process.env.HOSTINGER_PORT_WAIT_MS) || 45_000;
const pollMs = Number(process.env.HOSTINGER_PORT_POLL_MS) || 500;

export function isPortAvailable(port, host = "0.0.0.0") {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    socket.setTimeout(1_000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", (err) => {
      socket.destroy();
      if (err && "code" in err && (err.code === "ECONNREFUSED" || err.code === "EHOSTUNREACH")) {
        resolve(true);
        return;
      }
      resolve(false);
    });
  });
}

export async function waitForExclusivePort(port, deadlineMs, intervalMs = pollMs) {
  const started = Date.now();
  while (Date.now() - started < deadlineMs) {
    if (await isPortAvailable(port)) {
      return { ok: true, waitedMs: Date.now() - started };
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return { ok: false, waitedMs: Date.now() - started };
}

async function main() {
  if (isHostinger) {
    const result = await waitForExclusivePort(PORT, waitMs);
    if (!result.ok) {
      console.error(
        `[hostinger-start] Port ${PORT} still busy after ${result.waitedMs}ms — exiting without starting a duplicate Node process.`,
      );
      process.exit(0);
    }
    if (result.waitedMs > 0) {
      console.log(`[hostinger-start] Port ${PORT} available after ${result.waitedMs}ms deploy handoff wait.`);
    }
  }

  const child = spawn(process.execPath, [serverEntry], {
    stdio: "inherit",
    env: process.env,
    cwd: root,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((err) => {
    console.error("[hostinger-start] Startup wrapper failed", err);
    process.exit(1);
  });
}
