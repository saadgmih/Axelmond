import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  allocateSecurityRuntimePort,
  isSecurityRuntimeDatabaseAvailable,
  loginViaHttp,
  startSecurityRuntimeServer,
  stopSecurityRuntimeServer,
  waitForSecurityRuntimeHealth,
  type SecurityRuntimeServerHandle,
  type SecurityRuntimeSession,
} from "./helpers/security-runtime-harness.ts";
import {
  cleanupAdminRuntimeFixtures,
  seedAdminRuntimeFixtures,
  type AdminRuntimeFixture,
} from "./helpers/security-runtime-admin-fixtures.ts";
import { SECURITY_RUNTIME_TEST_PASSWORD } from "./helpers/security-runtime-fixtures.ts";

const DIAGNOSTIC_PATH = "/api/test-email";
const READ_PATH = "/api/admin/email-delivery-summary";
const MUTATION_PATH = "/api/admin/professor-invites";

const previousDiagnosticLimit = process.env.ADMIN_DIAGNOSTIC_RATE_LIMIT_MAX;
const previousReadLimit = process.env.ADMIN_READ_RATE_LIMIT_MAX;
const previousMutationLimit = process.env.ADMIN_MUTATION_RATE_LIMIT_MAX;

function ensureAdminRateLimitEnv() {
  process.env.ADMIN_DIAGNOSTIC_RATE_LIMIT_MAX = "2";
  process.env.ADMIN_READ_RATE_LIMIT_MAX = "2";
  process.env.ADMIN_MUTATION_RATE_LIMIT_MAX = "2";
}

function restoreAdminRateLimitEnv() {
  if (previousDiagnosticLimit === undefined) {
    delete process.env.ADMIN_DIAGNOSTIC_RATE_LIMIT_MAX;
  } else {
    process.env.ADMIN_DIAGNOSTIC_RATE_LIMIT_MAX = previousDiagnosticLimit;
  }
  if (previousReadLimit === undefined) {
    delete process.env.ADMIN_READ_RATE_LIMIT_MAX;
  } else {
    process.env.ADMIN_READ_RATE_LIMIT_MAX = previousReadLimit;
  }
  if (previousMutationLimit === undefined) {
    delete process.env.ADMIN_MUTATION_RATE_LIMIT_MAX;
  } else {
    process.env.ADMIN_MUTATION_RATE_LIMIT_MAX = previousMutationLimit;
  }
}

async function adminFetch(
  baseUrl: string,
  session: SecurityRuntimeSession,
  method: string,
  path: string,
  options: { body?: unknown; forwardedFor?: string } = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.accessToken}`,
    "X-CSRF-Token": session.csrfToken,
  };

  if (session.cookieHeader) {
    headers.Cookie = session.cookieHeader;
  }

  if (options.forwardedFor) {
    headers["X-Forwarded-For"] = options.forwardedFor;
  }

  const init: RequestInit = { method, headers };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }

  return fetch(`${baseUrl}${path}`, init);
}

async function assertNotRateLimited(response: Response, context: string) {
  assert.notEqual(
    response.status,
    429,
    `${context}: unexpected rate limit (${response.status}) ${await response.text()}`,
  );
}

async function assertRateLimited(response: Response, context: string, expectedCode: string) {
  assert.equal(response.status, 429, `${context}: expected HTTP 429`);
  const payload = await response.json() as { code?: string };
  assert.equal(payload.code, expectedCode, `${context}: expected ${expectedCode}`);
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

function diagnosticBody() {
  return { to: `admin-diagnostic-${randomUUID().slice(0, 8)}@example.com` };
}

if (!isSecurityRuntimeDatabaseAvailable()) {
  console.log("Security runtime admin rate limit tests skipped: DATABASE_URL missing");
  process.exit(0);
}

ensureAdminRateLimitEnv();

let fixture: AdminRuntimeFixture;
let adminASession: SecurityRuntimeSession;
let adminBSession: SecurityRuntimeSession;

try {
  fixture = await seedAdminRuntimeFixtures();

  await withFreshRuntimeServer(async (bootstrapHandle) => {
    adminASession = await loginViaHttp(bootstrapHandle.baseUrl, {
      email: fixture.users.adminA.email,
      password: SECURITY_RUNTIME_TEST_PASSWORD,
      role: "ADMIN",
    });
    adminBSession = await loginViaHttp(bootstrapHandle.baseUrl, {
      email: fixture.users.adminB.email,
      password: SECURITY_RUNTIME_TEST_PASSWORD,
      role: "ADMIN",
    });
  });

  // A1 — Diagnostic e-mail : 2 OK, 3e → 429 ADMIN_DIAGNOSTIC_RATE_LIMIT_EXCEEDED
  await withFreshRuntimeServer(async (handle) => {
    await assertNotRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "POST", DIAGNOSTIC_PATH, { body: diagnosticBody() }),
      "A1 diagnostic request 1",
    );
    await assertNotRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "POST", DIAGNOSTIC_PATH, { body: diagnosticBody() }),
      "A1 diagnostic request 2",
    );
    await assertRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "POST", DIAGNOSTIC_PATH, { body: diagnosticBody() }),
      "A1 diagnostic request 3",
      "ADMIN_DIAGNOSTIC_RATE_LIMIT_EXCEEDED",
    );
  });

  // A2 — Bucket par utilisateur : saturation admin A, admin B autorisé (même IP)
  await withFreshRuntimeServer(async (handle) => {
    const sharedIp = "203.0.113.71";

    await assertNotRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "POST", DIAGNOSTIC_PATH, {
        body: diagnosticBody(),
        forwardedFor: sharedIp,
      }),
      "A2 admin A diagnostic request 1",
    );
    await assertNotRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "POST", DIAGNOSTIC_PATH, {
        body: diagnosticBody(),
        forwardedFor: sharedIp,
      }),
      "A2 admin A diagnostic request 2",
    );
    await assertRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "POST", DIAGNOSTIC_PATH, {
        body: diagnosticBody(),
        forwardedFor: sharedIp,
      }),
      "A2 admin A diagnostic request 3",
      "ADMIN_DIAGNOSTIC_RATE_LIMIT_EXCEEDED",
    );

    await assertNotRateLimited(
      await adminFetch(handle.baseUrl, adminBSession, "POST", DIAGNOSTIC_PATH, {
        body: diagnosticBody(),
        forwardedFor: sharedIp,
      }),
      "A2 admin B after admin A saturation",
    );
  });

  // A3 — Même admin, deux IP : quota partagé
  await withFreshRuntimeServer(async (handle) => {
    const ipA = "203.0.113.81";
    const ipB = "203.0.113.82";

    await assertNotRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "POST", DIAGNOSTIC_PATH, {
        body: diagnosticBody(),
        forwardedFor: ipA,
      }),
      "A3 shared bucket IP-A request 1",
    );
    await assertNotRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "POST", DIAGNOSTIC_PATH, {
        body: diagnosticBody(),
        forwardedFor: ipB,
      }),
      "A3 shared bucket IP-B request 2",
    );
    await assertRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "POST", DIAGNOSTIC_PATH, {
        body: diagnosticBody(),
        forwardedFor: ipB,
      }),
      "A3 shared bucket third request on IP-B",
      "ADMIN_DIAGNOSTIC_RATE_LIMIT_EXCEEDED",
    );
  });

  // A4 — Read limiter : GET admin, 3e → 429 ADMIN_READ_RATE_LIMIT_EXCEEDED
  await withFreshRuntimeServer(async (handle) => {
    await assertNotRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "GET", READ_PATH),
      "A4 read request 1",
    );
    await assertNotRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "GET", READ_PATH),
      "A4 read request 2",
    );
    await assertRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "GET", READ_PATH),
      "A4 read request 3",
      "ADMIN_READ_RATE_LIMIT_EXCEEDED",
    );
  });

  // A5 — Mutation limiter : POST admin, 3e → 429 ADMIN_MUTATION_RATE_LIMIT_EXCEEDED
  await withFreshRuntimeServer(async (handle) => {
    await assertNotRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "POST", MUTATION_PATH, { body: {} }),
      "A5 mutation request 1",
    );
    await assertNotRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "POST", MUTATION_PATH, { body: {} }),
      "A5 mutation request 2",
    );
    await assertRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "POST", MUTATION_PATH, { body: {} }),
      "A5 mutation request 3",
      "ADMIN_MUTATION_RATE_LIMIT_EXCEEDED",
    );
  });

  // A6 — Isolation READ / mutation : saturation read, mutation autorisée
  await withFreshRuntimeServer(async (handle) => {
    await assertNotRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "GET", READ_PATH),
      "A6 read saturation request 1",
    );
    await assertNotRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "GET", READ_PATH),
      "A6 read saturation request 2",
    );
    await assertRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "GET", READ_PATH),
      "A6 read saturation request 3",
      "ADMIN_READ_RATE_LIMIT_EXCEEDED",
    );

    await assertNotRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "POST", MUTATION_PATH, { body: {} }),
      "A6 mutation after read saturation",
    );
  });

  // A7 — Isolation diagnostic / read : saturation diagnostic, GET admin autorisé
  await withFreshRuntimeServer(async (handle) => {
    await assertNotRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "POST", DIAGNOSTIC_PATH, { body: diagnosticBody() }),
      "A7 diagnostic saturation request 1",
    );
    await assertNotRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "POST", DIAGNOSTIC_PATH, { body: diagnosticBody() }),
      "A7 diagnostic saturation request 2",
    );
    await assertRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "POST", DIAGNOSTIC_PATH, { body: diagnosticBody() }),
      "A7 diagnostic saturation request 3",
      "ADMIN_DIAGNOSTIC_RATE_LIMIT_EXCEEDED",
    );

    await assertNotRateLimited(
      await adminFetch(handle.baseUrl, adminASession, "GET", READ_PATH),
      "A7 read after diagnostic saturation",
    );
  });

  console.log("Security runtime admin rate limit tests passed");
} finally {
  restoreAdminRateLimitEnv();
  await cleanupAdminRuntimeFixtures();
}
