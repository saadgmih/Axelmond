/** Arrête un live orphelin sur le module de test (best-effort, sans logger d'identifiants). */
const base = process.env.AXELMOND_BASE_URL || "https://axelmond.com";
const courseId = Number(process.env.AXELMOND_LIVE_TEST_COURSE_ID || "0");

async function login(email, password) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role: "PROFESSOR" }),
  });
  if (!res.ok) return null;
  const body = await res.json();
  const cookies = (res.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
  return { token: body.token, csrf: body.csrfToken, cookies };
}

const email = process.env.AXELMOND_LIVE_PROF_EMAIL || process.env.AXELMOND_PROF_EMAIL;
const password = process.env.AXELMOND_LIVE_PROF_PASSWORD || process.env.AXELMOND_PROF_PASSWORD;
if (!email || !password || !courseId) {
  console.log("skip: credentials ou AXELMOND_LIVE_TEST_COURSE_ID manquants");
  process.exit(0);
}

const session = await login(email, password);
if (!session) {
  console.log("skip: login impossible (rate limit ou identifiants)");
  process.exit(0);
}

const res = await fetch(`${base}/api/courses/${courseId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Cookie: session.cookies,
    Authorization: `Bearer ${session.token}`,
    "X-CSRF-Token": session.csrf,
  },
  body: JSON.stringify({ isLiveNow: false }),
});

console.log(res.ok ? `live stopped on course #${courseId}` : `stop failed: ${res.status}`);
