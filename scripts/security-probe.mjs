#!/usr/bin/env node
/**
 * Probe production security headers and mobile guard.
 * Usage: node scripts/security-probe.mjs [baseUrl]
 */
import { pathToFileURL } from "node:url";

export const REQUIRED_CSP_DIRECTIVES = [
  "default-src",
  "script-src",
  "style-src",
  "font-src",
  "img-src",
  "connect-src",
  "media-src",
  "frame-src",
  "worker-src",
  "manifest-src",
  "object-src",
  "base-uri",
  "form-action",
  "frame-ancestors",
];

export function validateContentSecurityPolicy(value) {
  const directiveEntries = String(value || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [name, ...sources] = entry.split(/\s+/);
      return [name.toLowerCase(), sources];
    });
  const directives = new Map(directiveEntries);
  const missing = REQUIRED_CSP_DIRECTIVES.filter((directive) => !directives.has(directive));
  const scriptSources = directives.get("script-src") || [];
  const styleSources = directives.get("style-src") || [];
  const hasScriptNonce = scriptSources.some((source) => source.startsWith("'nonce-"));
  const hasStyleNonce = styleSources.some((source) => source.startsWith("'nonce-"));
  const unsafeInline = scriptSources.includes("'unsafe-inline'") || styleSources.includes("'unsafe-inline'");
  const onlyUpgradeInsecureRequests = directives.size === 1 && directives.has("upgrade-insecure-requests");
  return {
    ok: missing.length === 0 && hasScriptNonce && hasStyleNonce && !unsafeInline && !onlyUpgradeInsecureRequests,
    missing,
    hasScriptNonce,
    hasStyleNonce,
    unsafeInline,
    onlyUpgradeInsecureRequests,
  };
}

export async function runSecurityProbe(options = {}) {
  const baseUrl = (options.baseUrl || "https://axelmond.com").replace(/\/+$/, "");
  const fetchImpl = options.fetchImpl || fetch;
  const log = options.log || console.log;

  async function probe(path, init = {}) {
    const url = `${baseUrl}${path}`;
    const started = Date.now();
    const response = await fetchImpl(url, { ...init, redirect: "manual" });
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
    const requiredHeaders = ["strict-transport-security", "cross-origin-opener-policy", "cross-origin-resource-policy"];
    for (const header of requiredHeaders) {
      checks.push({
        id: `header-${header}`,
        ok: Boolean(headerProbe.headers.get(header)),
        detail: headerProbe.headers.get(header) || "missing",
      });
    }

    const csp = headerProbe.headers.get("content-security-policy") || "";
    const cspValidation = validateContentSecurityPolicy(csp);
    checks.push({
      id: "header-content-security-policy-complete",
      ok: cspValidation.ok,
      detail: cspValidation.ok
        ? "complete CSP with script/style nonces"
        : `missing=${cspValidation.missing.join(",") || "none"}; onlyUpgrade=${cspValidation.onlyUpgradeInsecureRequests}; unsafeInline=${cspValidation.unsafeInline}`,
    });

    const catalog = await probe("/api/courses");
    checks.push({
      id: "catalog-responsive",
      ok: catalog.status === 200 && catalog.elapsed < 20000,
      detail: `HTTP ${catalog.status} (${catalog.elapsed}ms)`,
    });
  } catch (error) {
    console.error(`[security-probe] Request failed: ${String(error)}`);
    return { ok: false, checks, error };
  }

  let passed = 0;
  for (const check of checks) {
    const status = check.ok ? "PASS" : "FAIL";
    if (check.ok) passed += 1;
    log(`[security-probe] ${status} ${check.id}: ${check.detail}`);
  }

  const score = Math.round((passed / checks.length) * 100);
  log(`[security-probe] Production security score: ${score}/100 (${passed}/${checks.length})`);
  return { ok: passed === checks.length, checks, score };
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  const result = await runSecurityProbe({ baseUrl: process.argv[2] });
  process.exit(result.ok ? 0 : 1);
}
