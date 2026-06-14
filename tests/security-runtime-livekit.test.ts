import assert from "node:assert/strict";
import {
  authedFetch,
  DEFAULT_SECURITY_RUNTIME_PORT,
  isSecurityRuntimeDatabaseAvailable,
  loginViaHttp,
  startSecurityRuntimeServer,
  stopSecurityRuntimeServer,
  waitForSecurityRuntimeHealth,
  type SecurityRuntimeSession,
} from "./helpers/security-runtime-harness.ts";
import {
  cleanupLiveKitRuntimeFixtures,
  seedLiveKitRuntimeFixtures,
  type LiveKitRuntimeFixture,
} from "./helpers/security-runtime-livekit-fixtures.ts";
import { SECURITY_RUNTIME_TEST_PASSWORD } from "./helpers/security-runtime-fixtures.ts";

const TOKEN_PATH = "/api/livekit/token";
const MODERATION_PATH = "/api/livekit/moderation";
const RUNTIME_PORT = DEFAULT_SECURITY_RUNTIME_PORT;
const MODERATION_TARGET_IDENTITY = "axelmond-user-runtime-target";

const scenarioResults: Array<{ id: string; status: number; note?: string }> = [];

function recordScenario(id: string, response: Response, note?: string) {
  scenarioResults.push({ id, status: response.status, note });
}

function assertLiveKitLayerReached(status: number, scenarioId: string) {
  assert.notEqual(status, 401, `${scenarioId}: ne doit pas échouer à l'authentification`);
  assert.notEqual(status, 403, `${scenarioId}: ne doit pas échouer à l'ACL`);
  assert.ok(
    status === 200 || status === 502 || status === 503,
    `${scenarioId}: statut inattendu avant/après couche LiveKit (${status})`,
  );
}

function tokenBody(fixture: LiveKitRuntimeFixture, overrides: Record<string, unknown> = {}) {
  return {
    courseId: fixture.courseId,
    ...overrides,
  };
}

function moderationBody(fixture: LiveKitRuntimeFixture, overrides: Record<string, unknown> = {}) {
  return {
    courseId: fixture.courseId,
    action: "GRANT_SPEECH",
    targetIdentity: MODERATION_TARGET_IDENTITY,
    ...overrides,
  };
}

async function postLiveKit(
  baseUrl: string,
  path: string,
  body: unknown,
  session?: SecurityRuntimeSession,
  options: { includeCsrf?: boolean; forgedCsrf?: boolean } = {},
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (session) {
    headers.Authorization = `Bearer ${session.accessToken}`;
    if (session.cookieHeader) {
      headers.Cookie = session.cookieHeader;
    }
    if (options.includeCsrf !== false) {
      headers["X-CSRF-Token"] = session.csrfToken;
    }
  } else if (options.forgedCsrf) {
    const forgedCsrf = "security-runtime-forged-csrf";
    headers.Cookie = `csrf_token=${forgedCsrf}`;
    headers["X-CSRF-Token"] = forgedCsrf;
  }

  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function ensureLiveKitRuntimeEnv() {
  process.env.LIVEKIT_URL ??= "wss://runtime-test.livekit.cloud";
  process.env.LIVEKIT_API_KEY ??= "runtime-test-key";
  process.env.LIVEKIT_API_SECRET ??= "runtime-test-secret";
  process.env.LIVEKIT_RATE_LIMIT_MAX ??= "99999";
}

if (!isSecurityRuntimeDatabaseAvailable()) {
  console.log("Security runtime LiveKit tests skipped: DATABASE_URL missing");
  process.exit(0);
}

ensureLiveKitRuntimeEnv();

let fixture: LiveKitRuntimeFixture;
let handle: ReturnType<typeof startSecurityRuntimeServer> | undefined;

try {
  fixture = await seedLiveKitRuntimeFixtures();
  handle = startSecurityRuntimeServer(RUNTIME_PORT);
  await waitForSecurityRuntimeHealth(handle.baseUrl, { process: handle.process });

  const ownerSession = await loginViaHttp(handle.baseUrl, {
    email: fixture.users.ownerProfessor.email,
    password: SECURITY_RUNTIME_TEST_PASSWORD,
    role: "PROFESSOR",
  });
  const enrolledSession = await loginViaHttp(handle.baseUrl, {
    email: fixture.users.enrolledStudent.email,
    password: SECURITY_RUNTIME_TEST_PASSWORD,
    role: "STUDENT",
  });
  const unenrolledSession = await loginViaHttp(handle.baseUrl, {
    email: fixture.users.unenrolledStudent.email,
    password: SECURITY_RUNTIME_TEST_PASSWORD,
    role: "STUDENT",
  });
  const foreignSession = await loginViaHttp(handle.baseUrl, {
    email: fixture.users.foreignProfessor.email,
    password: SECURITY_RUNTIME_TEST_PASSWORD,
    role: "PROFESSOR",
  });
  const adminSession = await loginViaHttp(handle.baseUrl, {
    email: fixture.users.admin.email,
    password: SECURITY_RUNTIME_TEST_PASSWORD,
    role: "ADMIN",
  });

  // T1. Sans auth → 401
  {
    const response = await postLiveKit(
      handle.baseUrl,
      TOKEN_PATH,
      tokenBody(fixture),
      undefined,
      { forgedCsrf: true },
    );
    recordScenario("T1", response);
    assert.equal(response.status, 401);
  }

  // T2. Étudiant inscrit → 200
  {
    const response = await authedFetch(
      handle.baseUrl,
      enrolledSession,
      "POST",
      TOKEN_PATH,
      tokenBody(fixture),
    );
    recordScenario("T2", response);
    assert.equal(response.status, 200);
    const payload = await response.json() as { token?: string; roomName?: string; url?: string };
    assert.equal(typeof payload.token, "string");
    assert.ok(payload.token!.length > 0);
    assert.equal(payload.roomName, fixture.roomName);
    assert.equal(typeof payload.url, "string");
  }

  // T3. Étudiant non inscrit → 403
  {
    const response = await authedFetch(
      handle.baseUrl,
      unenrolledSession,
      "POST",
      TOKEN_PATH,
      tokenBody(fixture),
    );
    recordScenario("T3", response);
    assert.equal(response.status, 403);
    const payload = await response.json() as { error?: string };
    assert.match(payload.error || "", /Inscription requise/i);
  }

  // T4. Prof propriétaire → 200
  {
    const response = await authedFetch(
      handle.baseUrl,
      ownerSession,
      "POST",
      TOKEN_PATH,
      tokenBody(fixture),
    );
    recordScenario("T4", response);
    assert.equal(response.status, 200);
    const payload = await response.json() as { token?: string; roomName?: string };
    assert.equal(typeof payload.token, "string");
    assert.equal(payload.roomName, fixture.roomName);
  }

  // T5. Prof non propriétaire → 403
  {
    const response = await authedFetch(
      handle.baseUrl,
      foreignSession,
      "POST",
      TOKEN_PATH,
      tokenBody(fixture),
    );
    recordScenario("T5", response);
    assert.equal(response.status, 403);
    const payload = await response.json() as { error?: string };
    assert.match(payload.error || "", /Accès refusé/i);
  }

  // T6. courseId inexistant → 404
  {
    const response = await authedFetch(
      handle.baseUrl,
      enrolledSession,
      "POST",
      TOKEN_PATH,
      tokenBody(fixture, { courseId: fixture.missingCourseId }),
    );
    recordScenario("T6", response);
    assert.equal(response.status, 404);
    const payload = await response.json() as { error?: string };
    assert.match(payload.error || "", /Module introuvable/i);
  }

  // T7. Admin → 200
  {
    const response = await authedFetch(
      handle.baseUrl,
      adminSession,
      "POST",
      TOKEN_PATH,
      tokenBody(fixture),
    );
    recordScenario("T7", response);
    assert.equal(response.status, 200);
    const payload = await response.json() as { token?: string; roomName?: string };
    assert.equal(typeof payload.token, "string");
    assert.equal(payload.roomName, fixture.roomName);
  }

  // M1. Sans auth → 401
  {
    const response = await postLiveKit(
      handle.baseUrl,
      MODERATION_PATH,
      moderationBody(fixture),
      undefined,
      { forgedCsrf: true },
    );
    recordScenario("M1", response);
    assert.equal(response.status, 401);
  }

  // M2. Étudiant inscrit → 403
  {
    const response = await authedFetch(
      handle.baseUrl,
      enrolledSession,
      "POST",
      MODERATION_PATH,
      moderationBody(fixture),
    );
    recordScenario("M2", response);
    assert.equal(response.status, 403);
    const payload = await response.json() as { error?: string };
    assert.match(payload.error || "", /Accès refusé pour ce rôle/i);
  }

  // M3. Étudiant non inscrit → 403
  {
    const response = await authedFetch(
      handle.baseUrl,
      unenrolledSession,
      "POST",
      MODERATION_PATH,
      moderationBody(fixture),
    );
    recordScenario("M3", response);
    assert.equal(response.status, 403);
    const payload = await response.json() as { error?: string };
    assert.match(payload.error || "", /Accès refusé pour ce rôle/i);
  }

  // M4. Prof propriétaire → couche LiveKit atteinte
  {
    const response = await authedFetch(
      handle.baseUrl,
      ownerSession,
      "POST",
      MODERATION_PATH,
      moderationBody(fixture),
    );
    recordScenario("M4", response, "assertLiveKitLayerReached");
    assertLiveKitLayerReached(response.status, "M4");
  }

  // M5. Prof non propriétaire → 403
  {
    const response = await authedFetch(
      handle.baseUrl,
      foreignSession,
      "POST",
      MODERATION_PATH,
      moderationBody(fixture),
    );
    recordScenario("M5", response);
    assert.equal(response.status, 403);
    const payload = await response.json() as { error?: string };
    assert.match(payload.error || "", /Accès refusé/i);
  }

  // M6. courseId inexistant → 404
  {
    const response = await authedFetch(
      handle.baseUrl,
      ownerSession,
      "POST",
      MODERATION_PATH,
      moderationBody(fixture, { courseId: fixture.missingCourseId }),
    );
    recordScenario("M6", response);
    assert.equal(response.status, 404);
    const payload = await response.json() as { error?: string };
    assert.match(payload.error || "", /Module introuvable/i);
  }

  console.log("Security runtime LiveKit ACL tests passed");
  for (const result of scenarioResults) {
    console.log(`[${result.id}] HTTP ${result.status}${result.note ? ` (${result.note})` : ""}`);
  }
} finally {
  if (handle) {
    await stopSecurityRuntimeServer(handle);
  }
  await cleanupLiveKitRuntimeFixtures();
}
