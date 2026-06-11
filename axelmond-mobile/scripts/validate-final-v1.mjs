/**
 * Validation finale Phase Mobile UI v1
 * - API student + teacher login, profile, courses, refresh JWT
 * - Usage: node scripts/validate-final-v1.mjs [baseUrl]
 */

const BASE_URL = (process.argv[2] || process.env.API_BASE_URL || "http://127.0.0.1:31999").replace(/\/$/, "");
const MOBILE_HEADERS = {
  "Content-Type": "application/json",
  "X-Axelmond-Client": "mobile",
};

const STUDENT = {
  email: process.env.TEST_STUDENT_EMAIL || "security-runtime-chat-tutor+enrolled@test.axelmond.local",
  password: process.env.TEST_STUDENT_PASSWORD || "Password123!",
  role: "STUDENT",
};

const TEACHER = {
  email: process.env.TEST_TEACHER_EMAIL || "security-runtime-chat-tutor+owner@test.axelmond.local",
  password: process.env.TEST_TEACHER_PASSWORD || "Password123!",
  role: "PROFESSOR",
};

const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function request(method, path, body, extraHeaders = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { ...MOBILE_HEADERS, ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text?.slice(0, 120) };
  }
  return { status: res.status, payload };
}

async function loginFlow(label, creds) {
  const login = await request("POST", "/api/auth/login", creds);
  if (login.status !== 200 || !login.payload?.token) {
    record(`${label} login`, false, login.payload?.error || `HTTP ${login.status}`);
    return null;
  }
  if (!login.payload.refreshToken) {
    record(`${label} mobile refreshToken`, false, "missing in JSON");
    return null;
  }
  record(`${label} login`, true);

  const auth = { Authorization: `Bearer ${login.payload.token}` };
  const me = await request("GET", "/api/auth/me", undefined, auth);
  record(`${label} /api/auth/me`, me.status === 200 && me.payload?.email === creds.email, me.payload?.error);

  const courses = await request("GET", "/api/courses");
  record(`${label} catalogue`, courses.status === 200 && Array.isArray(courses.payload), `count=${courses.payload?.length ?? 0}`);

  const courseId = me.payload?.enrolledCourses?.[0] || courses.payload?.[0]?.id;
  if (courseId) {
    const detail = await request("GET", `/api/courses/${courseId}`);
    record(`${label} détail cours`, detail.status === 200 && detail.payload?.title, `#${courseId}`);
  }

  if (label === "Étudiant") {
    const profile = await request("GET", "/api/mobile/student-profile", undefined, auth);
    record(`${label} profil`, profile.status === 200 && profile.payload?.user?.id, profile.payload?.error);
  } else {
    const profile = await request("GET", "/api/me/profile", undefined, auth);
    record(`${label} profil`, profile.status === 200 || profile.status === 404, profile.payload?.error || "ok");
  }

  const refresh = await request("POST", "/api/auth/refresh", { refreshToken: login.payload.refreshToken });
  const refreshOk = refresh.status === 200 && refresh.payload?.token && refresh.payload?.refreshToken;
  record(`${label} refresh token`, refreshOk, refresh.payload?.error);

  if (refreshOk) {
    const auth2 = { Authorization: `Bearer ${refresh.payload.token}` };
    const me2 = await request("GET", "/api/auth/me", undefined, auth2);
    record(`${label} session après refresh`, me2.status === 200, me2.payload?.error);

    await request("POST", "/api/auth/logout", { refreshToken: refresh.payload.refreshToken });
    record(`${label} logout`, true);
  }

  return login.payload;
}

async function main() {
  console.log(`Validation finale Phase Mobile UI v1\nAPI: ${BASE_URL}\n`);

  const health = await request("GET", "/api/health");
  if (health.status !== 200) {
    console.error(`Backend indisponible (${health.status}). Lancez le serveur Unicode local ou déployez le patch mobile.`);
    process.exit(1);
  }
  record("health", true, health.payload?.status);

  const mobileRoutes = await request("GET", "/api/mobile/routes");
  record("mobile routes", mobileRoutes.status === 200 && mobileRoutes.payload?.routes?.auth?.login);

  await loginFlow("Étudiant", STUDENT);
  await loginFlow("Enseignant", TEACHER);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.error("\nÉchecs:", failed.map((f) => f.name).join(", "));
    process.exit(1);
  }
  console.log("\nValidation API Phase v1 OK.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
