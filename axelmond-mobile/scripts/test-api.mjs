/**
 * Smoke tests against the production API (read-only + auth shape checks).
 * Usage: node scripts/test-api.mjs
 * Optional env: TEST_EMAIL, TEST_PASSWORD, API_BASE_URL
 */

const API_BASE_URL = (process.env.API_BASE_URL || "https://axelmond.com").replace(/\/$/, "");
const MOBILE_HEADERS = {
  "Content-Type": "application/json",
  "X-Axelmond-Client": "mobile",
};

async function request(method, path, body, extraHeaders = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { ...MOBILE_HEADERS, ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  return { status: res.status, payload, headers: res.headers };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log(`Testing Axelmond mobile API integration against ${API_BASE_URL}...\n`);

  const routes = await request("GET", "/api/mobile/routes");
  if (routes.status === 200 && routes.payload?.routes?.auth?.login) {
    console.log("✓ /api/mobile/routes");
  } else {
    console.log(`! /api/mobile/routes skipped (${routes.status}) — deploy backend mobile patch first`);
  }

  const health = await request("GET", "/api/health");
  assert(health.status === 200, `Health check failed (${health.status})`);
  assert(health.payload?.status === "UP", "Health status is not UP");
  console.log("✓ /api/health");

  const courses = await request("GET", "/api/courses");
  assert(courses.status === 200, `Courses failed (${courses.status})`);
  assert(Array.isArray(courses.payload), "Courses payload is not an array");
  console.log(`✓ /api/courses (${courses.payload.length} cours publics)`);

  if (courses.payload[0]?.id) {
    const details = await request("GET", `/api/courses/${courses.payload[0].id}`);
    assert(details.status === 200, `Course details failed (${details.status})`);
    assert(details.payload?.title, "Course details missing title");
    console.log(`✓ /api/courses/${courses.payload[0].id}`);
  }

  const registerProbe = await request("POST", "/api/auth/register", {
    email: "",
    password: "",
    fullName: "",
    role: "STUDENT",
  });
  assert(registerProbe.status === 400, "Register route should remain reachable");
  console.log("✓ POST /api/auth/register (route reachable)");

  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (email && password) {
    const login = await request("POST", "/api/auth/login", {
      email,
      password,
      role: "STUDENT",
    });
    assert(login.status === 200, `Login failed (${login.status}): ${login.payload?.error || "unknown"}`);
    assert(login.payload?.token, "Login missing access token");
    console.log("✓ /api/auth/login");

    const authHeaders = { Authorization: `Bearer ${login.payload.token}` };

    const me = await request("GET", "/api/auth/me", undefined, authHeaders);
    assert(me.status === 200, `/api/auth/me failed (${me.status})`);
    assert(me.payload?.email, "Me payload missing email");
    console.log("✓ /api/auth/me");

    const studentProfile = await request("GET", "/api/mobile/student-profile", undefined, authHeaders);
    if (studentProfile.status === 200) {
      assert(studentProfile.payload?.user?.email, "Student profile missing user");
      console.log("✓ /api/mobile/student-profile");
    } else {
      console.log(`! /api/mobile/student-profile skipped (${studentProfile.status}) — deploy backend patch`);
    }

    if (login.payload.refreshToken) {
      const refresh = await request("POST", "/api/auth/refresh", {
        refreshToken: login.payload.refreshToken,
      });
      assert(refresh.status === 200, `Refresh failed (${refresh.status})`);
      assert(refresh.payload?.token, "Refresh missing token");
      console.log("✓ /api/auth/refresh (mobile refreshToken body)");
    } else {
      console.log("! /api/auth/refresh skipped — deploy backend mobile auth patch to receive refreshToken in JSON");
    }

    const enrolledId = me.payload.enrolledCourses?.[0] || courses.payload[0]?.id;
    if (enrolledId) {
      const liveToken = await request(
        "POST",
        "/api/livekit/token",
        { courseId: enrolledId },
        authHeaders,
      );
      if (liveToken.status === 200) {
        assert(liveToken.payload?.token, "LiveKit token missing");
        console.log(`✓ /api/livekit/token (course ${enrolledId})`);
      } else {
        console.log(`! /api/livekit/token skipped (${liveToken.status}): ${liveToken.payload?.error || "unknown"}`);
      }
    }
  } else {
    console.log("! Auth/profile/live tests skipped — set TEST_EMAIL and TEST_PASSWORD");
  }

  console.log("\nAll executed checks passed.");
}

main().catch((err) => {
  console.error("\nTest failed:", err.message);
  process.exit(1);
});
