import assert from "node:assert/strict";
import {
  DEFAULT_SECURITY_RUNTIME_PORT,
  startSecurityRuntimeServer,
  stopSecurityRuntimeServer,
  waitForSecurityRuntimeHealth,
} from "./helpers/security-runtime-harness.ts";
import { skipSecurityRuntimeTests } from "./helpers/security-runtime-harness.ts";
import { cleanupChatTutorRuntimeFixtures, seedChatTutorRuntimeFixtures } from "./helpers/security-runtime-fixtures.ts";
import { SECURITY_RUNTIME_TEST_PASSWORD } from "./helpers/security-runtime-fixtures.ts";
import { MOBILE_CLIENT_HEADER, MOBILE_CLIENT_VALUE } from "../src/auth-mobile.ts";
import { prisma } from "../src/db.ts";
import { buildLiveKitRoomName } from "../src/livekit.ts";
import { runtimeTest } from "./helpers/runtimeTest.ts";

await runtimeTest("mobile-api-runtime", async () => {
  const RUNTIME_PORT = DEFAULT_SECURITY_RUNTIME_PORT + 7;

  function mobileHeaders(extra: Record<string, string> = {}) {
    return {
      "Content-Type": "application/json",
      [MOBILE_CLIENT_HEADER]: MOBILE_CLIENT_VALUE,
      ...extra,
    };
  }

  if (skipSecurityRuntimeTests()) return;

  process.env.LIVEKIT_URL ??= "wss://runtime-test.livekit.cloud";
  process.env.LIVEKIT_API_KEY ??= "runtime-test-key";
  process.env.LIVEKIT_API_SECRET ??= "runtime-test-secret";
  process.env.LIVEKIT_RATE_LIMIT_MAX ??= "99999";

  const runtime = startSecurityRuntimeServer(RUNTIME_PORT);
  const baseUrl = runtime.baseUrl;

  try {
    await waitForSecurityRuntimeHealth(baseUrl, { process: runtime.process });
    const fixture = await seedChatTutorRuntimeFixtures();
    const roomName = buildLiveKitRoomName(fixture.courseId);
    await prisma.course.update({
      where: { id: fixture.courseId },
      data: { isLiveNow: true, liveSubject: "Mobile runtime live" },
    });
    await prisma.liveSession.upsert({
      where: { roomName },
      update: {
        isActive: true,
        endTime: null,
        professorId: fixture.users.ownerProfessor.id,
        title: "Mobile runtime live",
      },
      create: {
        roomName,
        courseId: fixture.courseId,
        professorId: fixture.users.ownerProfessor.id,
        title: "Mobile runtime live",
      },
    });

    const routesRes = await fetch(`${baseUrl}/api/mobile/routes`, {
      headers: mobileHeaders(),
    });
    assert.equal(routesRes.status, 200);
    const routesPayload = await routesRes.json();
    assert.equal(routesPayload.clientValue, MOBILE_CLIENT_VALUE);
    assert.ok(routesPayload.routes?.auth?.login);
    console.log("✓ GET /api/mobile/routes");

    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: mobileHeaders(),
      body: JSON.stringify({
        email: fixture.users.enrolledStudent.email,
        password: SECURITY_RUNTIME_TEST_PASSWORD,
        role: "STUDENT",
      }),
    });
    const loginPayload = await loginRes.json();
    assert.equal(loginRes.status, 200, loginPayload?.error || "login failed");
    assert.ok(loginPayload.token, "missing access token");
    assert.ok(loginPayload.refreshToken, "mobile login must return refreshToken");
    assert.ok(loginPayload.csrfToken, "missing csrf token");
    console.log("✓ POST /api/auth/login (mobile refreshToken)");

    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: mobileHeaders({ Authorization: `Bearer ${loginPayload.token}` }),
    });
    const mePayload = await meRes.json();
    assert.equal(meRes.status, 200, mePayload?.error || "me failed");
    assert.equal(mePayload.email, fixture.users.enrolledStudent.email);
    console.log("✓ GET /api/auth/me (Bearer)");

    const profileRes = await fetch(`${baseUrl}/api/mobile/student-profile`, {
      headers: mobileHeaders({ Authorization: `Bearer ${loginPayload.token}` }),
    });
    const profilePayload = await profileRes.json();
    assert.equal(profileRes.status, 200, profilePayload?.error || "student profile failed");
    assert.equal(profilePayload.user?.id, fixture.users.enrolledStudent.id);
    assert.ok(profilePayload.objectivesSummary);
    console.log("✓ GET /api/mobile/student-profile");

    const coursesRes = await fetch(`${baseUrl}/api/courses`, { headers: mobileHeaders() });
    const coursesPayload = await coursesRes.json();
    assert.equal(coursesRes.status, 200);
    assert.ok(Array.isArray(coursesPayload));
    console.log(`✓ GET /api/courses (${coursesPayload.length})`);

    const courseRes = await fetch(`${baseUrl}/api/courses/${fixture.courseId}`, {
      headers: mobileHeaders(),
    });
    const coursePayload = await courseRes.json();
    assert.equal(courseRes.status, 200);
    assert.equal(coursePayload.id, fixture.courseId);
    console.log(`✓ GET /api/courses/${fixture.courseId}`);

    const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: mobileHeaders(),
      body: JSON.stringify({ refreshToken: loginPayload.refreshToken }),
    });
    const refreshPayload = await refreshRes.json();
    assert.equal(refreshRes.status, 200, refreshPayload?.error || "refresh failed");
    assert.ok(refreshPayload.token);
    assert.ok(refreshPayload.refreshToken);
    console.log("✓ POST /api/auth/refresh (mobile body)");

    const liveRes = await fetch(`${baseUrl}/api/livekit/token`, {
      method: "POST",
      headers: mobileHeaders({
        Authorization: `Bearer ${refreshPayload.token}`,
        "X-CSRF-Token": refreshPayload.csrfToken,
      }),
      body: JSON.stringify({ courseId: fixture.courseId }),
    });
    assert.notEqual(liveRes.status, 401, "live token must accept mobile Bearer auth");
    assert.notEqual(liveRes.status, 403, "live token must not fail CSRF for mobile Bearer");
    console.log(`✓ POST /api/livekit/token (${liveRes.status})`);

    const mobilePreflight = await fetch(`${baseUrl}/api/auth/login`, {
      method: "OPTIONS",
      headers: mobileHeaders({ Origin: "http://localhost:8081" }),
    });
    assert.equal(mobilePreflight.status, 204);
    assert.match(mobilePreflight.headers.get("access-control-allow-headers") || "", /X-Axelmond-Client/i);
    console.log("✓ OPTIONS /api/auth/login (mobile CORS preflight)");

    console.log("Mobile API runtime tests passed");
  } finally {
    await cleanupChatTutorRuntimeFixtures().catch(() => undefined);
    await stopSecurityRuntimeServer(runtime);
  }
});
