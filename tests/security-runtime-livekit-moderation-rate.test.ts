import assert from "node:assert/strict";import {
  allocateSecurityRuntimePort,
  authedFetch,
  isSecurityRuntimeDatabaseAvailable,
  loginViaHttp,
  startSecurityRuntimeServer,
  stopSecurityRuntimeServer,
  waitForSecurityRuntimeHealth,
  type SecurityRuntimeServerHandle,
  type SecurityRuntimeSession,
} from "./helpers/security-runtime-harness.ts";import {
  cleanupLiveKitRuntimeFixtures,
  seedLiveKitRuntimeFixtures,
  type LiveKitRuntimeFixture,
} from "./helpers/security-runtime-livekit-fixtures.ts";import { SECURITY_RUNTIME_TEST_PASSWORD } from "./helpers/security-runtime-fixtures.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("security-runtime-livekit-moderation-rate", async () => {
const MODERATION_PATH = "/api/livekit/moderation";
const TOKEN_PATH = "/api/livekit/token";
const MODERATION_TARGET_IDENTITY = "axelmond-user-runtime-moderation-rate-target";

const previousModerationLimit = process.env.LIVEKIT_MODERATION_RATE_LIMIT_MAX;
const previousTokenLimit = process.env.LIVEKIT_RATE_LIMIT_MAX;
const previousLiveKitUrl = process.env.LIVEKIT_URL;
const previousLiveKitKey = process.env.LIVEKIT_API_KEY;
const previousLiveKitSecret = process.env.LIVEKIT_API_SECRET;

function ensureLiveKitModerationRateEnv() {
  process.env.LIVEKIT_MODERATION_RATE_LIMIT_MAX = "2";
  process.env.LIVEKIT_RATE_LIMIT_MAX = "99999";
  process.env.LIVEKIT_URL ??= "wss://runtime-test.livekit.cloud";
  process.env.LIVEKIT_API_KEY ??= "runtime-test-key";
  process.env.LIVEKIT_API_SECRET ??= "runtime-test-secret";
}

function moderationBody(fixture: LiveKitRuntimeFixture) {
  return {
    courseId: fixture.courseId,
    action: "GRANT_SPEECH",
    targetIdentity: MODERATION_TARGET_IDENTITY,
  };
}

async function postModeration(
  baseUrl: string,
  session: SecurityRuntimeSession,
  fixture: LiveKitRuntimeFixture,
  options: { forwardedFor?: string } = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.accessToken}`,
    "X-CSRF-Token": session.csrfToken,
    "Content-Type": "application/json",
  };

  if (session.cookieHeader) {
    headers.Cookie = session.cookieHeader;
  }

  if (options.forwardedFor) {
    headers["X-Forwarded-For"] = options.forwardedFor;
  }

  return fetch(`${baseUrl}${MODERATION_PATH}`, {
    method: "POST",
    headers,
    body: JSON.stringify(moderationBody(fixture)),
  });
}

async function assertNotRateLimited(response: Response, context: string) {
  assert.notEqual(
    response.status,
    429,
    `${context}: unexpected rate limit (${response.status}) ${await response.text()}`,
  );
}

async function assertModerationRateLimited(response: Response, context: string) {
  assert.equal(response.status, 429, `${context}: expected HTTP 429`);
  const payload = await response.json() as { code?: string };
  assert.equal(
    payload.code,
    "LIVEKIT_MODERATION_RATE_LIMIT_EXCEEDED",
    `${context}: expected LIVEKIT_MODERATION_RATE_LIMIT_EXCEEDED`,
  );
}

async function withFreshRuntimeServer<T>(
  run: (handle: SecurityRuntimeServerHandle) => Promise<T>,
): Promise<T> {
  const port = await allocateSecurityRuntimePort();
  const handle = startSecurityRuntimeServer(port);
  await waitForSecurityRuntimeHealth(handle.baseUrl, { process: handle.process });
  try {
    return await run(handle);
  } finally {
    await stopSecurityRuntimeServer(handle);
  }
}

if (!isSecurityRuntimeDatabaseAvailable()) {
  console.log("Security runtime LiveKit moderation rate tests skipped: DATABASE_URL missing");
  process.exit(0);
}

ensureLiveKitModerationRateEnv();

let fixture: LiveKitRuntimeFixture;
let ownerSession: SecurityRuntimeSession;
let adminSession: SecurityRuntimeSession;

try {
  fixture = await seedLiveKitRuntimeFixtures();

  await withFreshRuntimeServer(async (bootstrapHandle) => {
    ownerSession = await loginViaHttp(bootstrapHandle.baseUrl, {
      email: fixture.users.ownerProfessor.email,
      password: SECURITY_RUNTIME_TEST_PASSWORD,
      role: "PROFESSOR",
    });
    adminSession = await loginViaHttp(bootstrapHandle.baseUrl, {
      email: fixture.users.admin.email,
      password: SECURITY_RUNTIME_TEST_PASSWORD,
      role: "ADMIN",
    });
  });

  // 1. Même professeur : 2 requêtes OK, 3e → 429
  await withFreshRuntimeServer(async (handle) => {
    const first = await postModeration(handle.baseUrl, ownerSession, fixture);
    const second = await postModeration(handle.baseUrl, ownerSession, fixture);
    await assertNotRateLimited(first, "owner moderation request 1");
    await assertNotRateLimited(second, "owner moderation request 2");

    const blocked = await postModeration(handle.baseUrl, ownerSession, fixture);
    await assertModerationRateLimited(blocked, "owner moderation request 3");
  });

  // 2. Deux professeurs différents, même IP : quotas indépendants
  await withFreshRuntimeServer(async (handle) => {
    const sharedIp = "203.0.113.55";

    await assertNotRateLimited(
      await postModeration(handle.baseUrl, ownerSession, fixture, { forwardedFor: sharedIp }),
      "independent quota owner request 1",
    );
    await assertNotRateLimited(
      await postModeration(handle.baseUrl, ownerSession, fixture, { forwardedFor: sharedIp }),
      "independent quota owner request 2",
    );
    await assertModerationRateLimited(
      await postModeration(handle.baseUrl, ownerSession, fixture, { forwardedFor: sharedIp }),
      "independent quota owner request 3",
    );

    await assertNotRateLimited(
      await postModeration(handle.baseUrl, adminSession, fixture, { forwardedFor: sharedIp }),
      "independent quota admin after owner saturation",
    );
  });

  // 3. Même professeur, deux IP : même bucket utilisateur
  await withFreshRuntimeServer(async (handle) => {
    const ipA = "203.0.113.61";
    const ipB = "203.0.113.62";

    await assertNotRateLimited(
      await postModeration(handle.baseUrl, ownerSession, fixture, { forwardedFor: ipA }),
      "shared user bucket IP-A request 1",
    );
    await assertNotRateLimited(
      await postModeration(handle.baseUrl, ownerSession, fixture, { forwardedFor: ipB }),
      "shared user bucket IP-B request 2",
    );

    const blockedFromIpB = await postModeration(handle.baseUrl, ownerSession, fixture, {
      forwardedFor: ipB,
    });
    await assertModerationRateLimited(blockedFromIpB, "shared user bucket third request on IP-B");
  });

  // 4. Saturation moderation n'empêche pas le token LiveKit
  await withFreshRuntimeServer(async (handle) => {
    await assertNotRateLimited(
      await postModeration(handle.baseUrl, ownerSession, fixture),
      "token isolation moderation request 1",
    );
    await assertNotRateLimited(
      await postModeration(handle.baseUrl, ownerSession, fixture),
      "token isolation moderation request 2",
    );
    await assertModerationRateLimited(
      await postModeration(handle.baseUrl, ownerSession, fixture),
      "token isolation moderation request 3",
    );

    const tokenResponse = await authedFetch(
      handle.baseUrl,
      ownerSession,
      "POST",
      TOKEN_PATH,
      { courseId: fixture.courseId },
    );
    assert.equal(tokenResponse.status, 200, "token must remain available after moderation saturation");
    const payload = await tokenResponse.json() as { token?: string; roomName?: string };
    assert.equal(typeof payload.token, "string");
    assert.ok(payload.token!.length > 0);
    assert.equal(payload.roomName, fixture.roomName);
  });

  console.log("Security runtime LiveKit moderation rate tests passed");
} finally {
  if (previousModerationLimit === undefined) {
    delete process.env.LIVEKIT_MODERATION_RATE_LIMIT_MAX;
  } else {
    process.env.LIVEKIT_MODERATION_RATE_LIMIT_MAX = previousModerationLimit;
  }
  if (previousTokenLimit === undefined) {
    delete process.env.LIVEKIT_RATE_LIMIT_MAX;
  } else {
    process.env.LIVEKIT_RATE_LIMIT_MAX = previousTokenLimit;
  }
  if (previousLiveKitUrl === undefined) {
    delete process.env.LIVEKIT_URL;
  } else {
    process.env.LIVEKIT_URL = previousLiveKitUrl;
  }
  if (previousLiveKitKey === undefined) {
    delete process.env.LIVEKIT_API_KEY;
  } else {
    process.env.LIVEKIT_API_KEY = previousLiveKitKey;
  }
  if (previousLiveKitSecret === undefined) {
    delete process.env.LIVEKIT_API_SECRET;
  } else {
    process.env.LIVEKIT_API_SECRET = previousLiveKitSecret;
  }
  await cleanupLiveKitRuntimeFixtures();
}
});
