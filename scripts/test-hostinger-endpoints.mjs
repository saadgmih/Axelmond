#!/usr/bin/env node
/**
 * Hostinger endpoint smoke test.
 *
 * Verifies that both axelmond.com and www.axelmond.com respond correctly
 * after deployment. Run with:
 *   node scripts/test-hostinger-endpoints.mjs
 *
 * Optional env:
 *   SMOKE_BASE_URL  — override the base URL to test (default: https://axelmond.com)
 *   SMOKE_TIMEOUT   — request timeout in ms (default: 15000)
 */

import https from "node:https";
import http from "node:http";
import { URL } from "node:url";

const BASE_URL = process.env.SMOKE_BASE_URL || "https://axelmond.com";
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT) || 15_000;

/**
 * Simple HTTP/HTTPS GET — returns { status, redirectLocation, durationMs }
 * Does NOT follow redirects automatically so we can inspect the raw response.
 */
function get(rawUrl, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(rawUrl);
    const lib = parsed.protocol === "https:" ? https : http;
    const startedAt = Date.now();

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: "GET",
        headers: {
          "User-Agent": "axelmond-smoke-test/1.0",
          Host: parsed.hostname,
        },
        timeout: timeoutMs,
      },
      (res) => {
        res.resume(); // drain body
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            redirectLocation: res.headers.location || null,
            durationMs: Date.now() - startedAt,
          });
        });
      },
    );

    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    });
    req.on("error", reject);
    req.end();
  });
}

/**
 * Resolve base URL variants to test both apex and www.
 */
function buildTargets(baseUrl) {
  const parsed = new URL(baseUrl);
  const apex = parsed.hostname.replace(/^www\./, "");
  const www = `www.${apex}`;
  const proto = parsed.protocol;
  return [
    { label: `apex (${apex})`, url: `${proto}//${apex}/` },
    { label: `www  (${www})`, url: `${proto}//${www}/` },
  ];
}

async function runSmoke() {
  const targets = buildTargets(BASE_URL);
  let passed = 0;
  let failed = 0;

  console.log(`\n🔍  Hostinger endpoint smoke test`);
  console.log(`    Base URL : ${BASE_URL}`);
  console.log(`    Timeout  : ${TIMEOUT_MS}ms\n`);

  for (const { label, url } of targets) {
    process.stdout.write(`  ${label.padEnd(30)} → `);
    try {
      const result = await get(url);
      const { status, redirectLocation, durationMs } = result;

      // 200 is ideal. 301/302 is acceptable (www→apex or HTTPS redirect).
      // 4xx/5xx are failures.
      const ok = status >= 200 && status < 400;

      if (ok) {
        const redirect = redirectLocation ? ` (→ ${redirectLocation})` : "";
        console.log(`✅  HTTP ${status}${redirect}  [${durationMs}ms]`);
        passed++;
      } else {
        console.log(`❌  HTTP ${status}  [${durationMs}ms]`);
        failed++;
      }
    } catch (err) {
      console.log(`❌  ERROR: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n  Result: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSmoke().catch((err) => {
  console.error("[smoke-test] Unexpected error:", err);
  process.exit(1);
});
