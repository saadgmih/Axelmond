/**
 * Diagnose POST /api/auth/refresh 403 on production.
 * No credentials logged. Uses env vars only.
 */
const base = process.env.AXELMOND_BASE_URL || "https://axelmond.com";

async function login(role) {
  const email =
    role === "PROFESSOR"
      ? process.env.AXELMOND_PROF_EMAIL || process.env.AXELMOND_LIVE_PROF_EMAIL
      : process.env.AXELMOND_STUDENT_EMAIL || process.env.AXELMOND_LIVE_STUDENT_EMAIL;
  const password =
    role === "PROFESSOR"
      ? process.env.AXELMOND_PROF_PASSWORD || process.env.AXELMOND_LIVE_PROF_PASSWORD
      : process.env.AXELMOND_STUDENT_PASSWORD || process.env.AXELMOND_LIVE_STUDENT_PASSWORD;
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role }),
  });
  const body = await res.json().catch(() => ({}));
  const cookies = (res.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
  const csrfCookie = (res.headers.getSetCookie?.() || [])
    .find((c) => c.startsWith("csrf_token="))
    ?.split(";")[0]
    ?.split("=")[1];
  return { status: res.status, cookies, csrfFromBody: body.csrfToken, csrfFromCookie: csrfCookie, hasToken: !!body.token };
}

async function refresh(cookies, csrfHeader) {
  const headers = { "Content-Type": "application/json", Cookie: cookies };
  if (csrfHeader) headers["X-CSRF-Token"] = csrfHeader;
  const res = await fetch(`${base}/api/auth/refresh`, {
    method: "POST",
    headers,
    body: "{}",
  });
  const text = await res.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { status: res.status, code: json.code, error: json.error };
}

console.log("=== API refresh diagnosis (no secrets printed) ===\n");

const session = await login("PROFESSOR");
console.log("1. Login:", session.status, "token:", session.hasToken, "csrf body:", !!session.csrfFromBody, "csrf cookie:", !!session.csrfFromCookie);

const noHeader = await refresh(session.cookies, null);
console.log("2. Refresh WITHOUT X-CSRF-Token:", noHeader.status, noHeader.code || noHeader.error);

const badHeader = await refresh(session.cookies, "invalid-csrf-token");
console.log("3. Refresh with WRONG CSRF:", badHeader.status, badHeader.code || badHeader.error);

const goodHeader = await refresh(session.cookies, session.csrfFromBody || session.csrfFromCookie);
console.log("4. Refresh with VALID CSRF (from login):", goodHeader.status, goodHeader.code || goodHeader.error || "OK");

const noCookies = await refresh("", session.csrfFromBody);
console.log("5. Refresh without cookies:", noCookies.status, noCookies.error);

console.log("\nConclusion codes:");
console.log("  403 + CSRF_TOKEN_INVALID => missing/mismatched X-CSRF-Token vs csrf_token cookie");
console.log("  401 => missing/invalid refresh_token cookie");
