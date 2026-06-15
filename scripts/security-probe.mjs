#!/usr/bin/env node
/**
 * Probe production security headers and mobile guard.
 * Usage: node scripts/security-probe.mjs [baseUrl]
 */
const baseUrl = (process.argv[2] || "https://axelmond.com").replace(/\/+$/, "");

async function probe(path, init = {}) {
  const url = `${baseUrl}${path}`;
  const started = Date.now();
  const response = await fetch(url, { ...init, redirect: "manual" });
  const elapsed = Date.now() - started;
  const body = await response.text();
  return { url, status: response.status, elapsed, headers: response.headers, body: body.slice(0, 300) };
}

const checks = [];

try {
  const health = await probe("/api/health");
  checks.push({
    id: "health-up",
    ok: health.status === 200 && health.body.includes('"status":"UP"'),
    detail: `HTTP ${health.status} (${health.elapsed}ms)`,
  });

  const mobileSpoof = await probe("/api/mobile/routes", {
    headers: { "X-Axelmond-Client": "mobile" },
  });
  checks.push({
    id: "mobile-spoof-blocked",
    ok: mobileSpoof.status === 403 && mobileSpoof.body.includes("MOBILE_CLIENT_REJECTED"),
    detail: `HTTP ${mobileSpoof.status}`,
  });

  const headerProbe = health.status === 200 ? health : await probe("/");
  const requiredHeaders = [
    "strict-transport-security",
    "cross-origin-opener-policy",
    "cross-origin-resource-policy",
  ];
  for (const header of requiredHeaders) {
    checks.push({
      id: `header-${header}`,
      ok: Boolean(headerProbe.headers.get(header)),
      detail: headerProbe.headers.get(header) || "missing",
    });
  }

  const catalog = await probe("/api/courses");
  checks.push({
    id: "catalog-responsive",
    ok: catalog.status === 200 && catalog.elapsed < 20000,
    detail: `HTTP ${catalog.status} (${catalog.elapsed}ms)`,
  });
} catch (error) {
  console.error(`[security-probe] Request failed: ${String(error)}`);
  process.exit(1);
}

let passed = 0;
for (const check of checks) {
  const status = check.ok ? "PASS" : "FAIL";
  if (check.ok) passed += 1;
  console.log(`[security-probe] ${status} ${check.id}: ${check.detail}`);
}

const score = Math.round((passed / checks.length) * 100);
console.log(`[security-probe] Production security score: ${score}/100 (${passed}/${checks.length})`);
process.exit(passed === checks.length ? 0 : 1);
