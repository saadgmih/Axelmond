/**
 * Quick production/local smoke test for critical API routes.
 * Usage: node scripts/smoke-test.mjs [baseUrl]
 */
const BASE = (process.argv[2] || process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

async function check(label, path, options = {}, expectStatus) {
  try {
    const res = await fetch(`${BASE}${path}`, options);
    const text = await res.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text.slice(0, 120);
    }
    const expected = expectStatus ?? (options.method ? null : 200);
    const ok = expected ? res.status === expected : res.ok;
    console.log(`${ok ? "OK" : "FAIL"} ${label} -> ${res.status}`, typeof body === "object" ? JSON.stringify(body).slice(0, 160) : body);
    return ok;
  } catch (err) {
    console.log(`FAIL ${label} -> ${err.message}`);
    return false;
  }
}

console.log(`Smoke test: ${BASE}\n`);

let passed = 0;
let total = 0;

for (const [label, path, opts, expectStatus] of [
  ["health", "/api/health"],
  ["domains", "/api/domains"],
  ["courses", "/api/courses"],
  [
    "login-invalid",
    "/api/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid@example.com", password: "wrong-pass-123", role: "STUDENT" }),
    },
    401,
  ],
]) {
  total += 1;
  if (await check(label, path, opts, expectStatus)) passed += 1;
}

console.log(`\n${passed}/${total} checks passed`);
process.exit(passed === total ? 0 : 1);
