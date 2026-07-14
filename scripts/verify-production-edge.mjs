#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_BASE_URL = "https://axelmond.com";
const DEFAULT_ROUNDS = 5;
const DEFAULT_DELAY_MS = 15_000;
const DEFAULT_TIMEOUT_MS = 20_000;
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0 Safari/537.36";

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_BASE_URL)
    .trim()
    .replace(/\/+$/, "");
}

function readBoundedInteger(value, fallback, { min, max, name }) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return parsed;
}

function compactSnippet(body) {
  return body.replace(/\s+/g, " ").trim().slice(0, 140);
}

function assertSuccessfulResponse(label, response, body) {
  if (response.ok) return;
  const hcdnRequestId = response.headers.get("x-hcdn-request-id");
  const provider = hcdnRequestId ? ` Hostinger hCDN request=${hcdnRequestId}` : "";
  const snippet = compactSnippet(body);
  throw new Error(`${label}: HTTP ${response.status}${provider}${snippet ? ` — ${snippet}` : ""}`);
}

function validateHome(response, body) {
  assertSuccessfulResponse("frontend", response, body);
  if (!body.includes("<title>Performance Académique") || !body.includes('id="root"')) {
    throw new Error("frontend: unexpected or stale HTML document");
  }
}

function validateHealth(response, body) {
  assertSuccessfulResponse("health", response, body);
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error("health: HTTP 200 with a non-JSON body");
  }
  if (payload?.status !== "UP") {
    throw new Error("health: HTTP 200 without status=UP");
  }
}

function validateCatalog(response, body) {
  assertSuccessfulResponse("catalog", response, body);
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error("catalog: HTTP 200 with a non-JSON body");
  }
  if (!Array.isArray(payload)) {
    throw new Error("catalog: expected a JSON array");
  }
}

const ENDPOINTS = [
  { path: "/", accept: "text/html", validate: validateHome },
  { path: "/api/health", accept: "application/json", validate: validateHealth },
  { path: "/api/courses", accept: "application/json", validate: validateCatalog },
];

export async function probeProductionRound({ baseUrl, fetchImpl = fetch, timeoutMs, round }) {
  const startedAt = Date.now();
  const results = await Promise.allSettled(
    ENDPOINTS.map(async (endpoint) => {
      const response = await fetchImpl(`${baseUrl}${endpoint.path}`, {
        headers: {
          Accept: endpoint.accept,
          "Cache-Control": "no-cache",
          "User-Agent": BROWSER_USER_AGENT,
        },
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
      });
      const body = await response.text();
      endpoint.validate(response, body);
      return `${endpoint.path}=${response.status}`;
    }),
  );

  const failures = results
    .filter((result) => result.status === "rejected")
    .map((result) => (result.reason instanceof Error ? result.reason.message : String(result.reason)));
  if (failures.length > 0) {
    throw new Error(`Production edge probe round ${round} failed: ${failures.join(" | ")}`);
  }

  return {
    durationMs: Date.now() - startedAt,
    responses: results.map((result) => result.value),
  };
}

export async function verifyProductionEdge({
  baseUrl = DEFAULT_BASE_URL,
  rounds = DEFAULT_ROUNDS,
  delayMs = DEFAULT_DELAY_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = fetch,
  log = (message) => console.log(message),
} = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const checkedRounds = readBoundedInteger(rounds, DEFAULT_ROUNDS, {
    min: 1,
    max: 20,
    name: "rounds",
  });
  const checkedDelayMs = readBoundedInteger(delayMs, DEFAULT_DELAY_MS, {
    min: 0,
    max: 60_000,
    name: "delayMs",
  });
  const checkedTimeoutMs = readBoundedInteger(timeoutMs, DEFAULT_TIMEOUT_MS, {
    min: 1_000,
    max: 60_000,
    name: "timeoutMs",
  });

  for (let round = 1; round <= checkedRounds; round += 1) {
    const result = await probeProductionRound({
      baseUrl: normalizedBaseUrl,
      fetchImpl,
      timeoutMs: checkedTimeoutMs,
      round,
    });
    log(
      `[production-edge] round ${round}/${checkedRounds} passed in ${result.durationMs}ms (${result.responses.join(", ")})`,
    );
    if (round < checkedRounds && checkedDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, checkedDelayMs));
    }
  }

  log(`[production-edge] ${checkedRounds} stable parallel rounds passed for ${normalizedBaseUrl}`);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  verifyProductionEdge({
    baseUrl: process.env.PRODUCTION_PROBE_BASE_URL || DEFAULT_BASE_URL,
    rounds: process.env.PRODUCTION_PROBE_ROUNDS || DEFAULT_ROUNDS,
    delayMs: process.env.PRODUCTION_PROBE_DELAY_MS || DEFAULT_DELAY_MS,
    timeoutMs: process.env.PRODUCTION_PROBE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS,
  }).catch((error) => {
    console.error(`[production-edge] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
