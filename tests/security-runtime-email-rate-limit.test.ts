import assert from "node:assert/strict";import { randomUUID } from "node:crypto";import {
  allocateSecurityRuntimePort,
  isSecurityRuntimeDatabaseAvailable,
  startSecurityRuntimeServer,
  stopSecurityRuntimeServer,
  waitForSecurityRuntimeHealth,
} from "./helpers/security-runtime-harness.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("security-runtime-email-rate-limit", async () => {
const PATHS = {
  verifyEmail: "/api/auth/verify-email",
  resendVerification: "/api/auth/resend-verification-code",
  forgotPassword: "/api/auth/forgot-password",
  resetPassword: "/api/auth/reset-password",
} as const;

const runId = randomUUID().slice(0, 8);

function email(label: string) {
  return `security-runtime-email-${label}-${runId}@example.com`;
}

async function postEmailAuthRoute(
  baseUrl: string,
  path: string,
  body: Record<string, unknown>,
  options: { forwardedFor?: string } = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.forwardedFor) {
    headers["X-Forwarded-For"] = options.forwardedFor;
  }

  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function assertNotRateLimited(response: Response, context: string) {
  assert.notEqual(
    response.status,
    429,
    `${context}: unexpected rate limit (${response.status}) ${await response.text()}`,
  );
}

async function assertRateLimited(response: Response, context: string) {
  assert.equal(response.status, 429, `${context}: expected HTTP 429`);
  const payload = await response.json() as { code?: string };
  assert.equal(payload.code, "EMAIL_RATE_LIMIT_EXCEEDED", `${context}: expected EMAIL_RATE_LIMIT_EXCEEDED`);
}

async function hitRouteNTimes(
  baseUrl: string,
  path: string,
  body: Record<string, unknown>,
  count: number,
  options: { forwardedFor?: string } = {},
) {
  const responses: Response[] = [];
  for (let i = 0; i < count; i += 1) {
    responses.push(await postEmailAuthRoute(baseUrl, path, body, options));
  }
  return responses;
}

if (!isSecurityRuntimeDatabaseAvailable()) {
  console.log("Security runtime email rate limit tests skipped: DATABASE_URL missing");
  process.exit(0);
}

let handle: ReturnType<typeof startSecurityRuntimeServer> | undefined;

try {
  const runtimePort = await allocateSecurityRuntimePort();
  handle = startSecurityRuntimeServer(runtimePort);
  await waitForSecurityRuntimeHealth(handle.baseUrl, { process: handle.process });

  const baseUrl = handle.baseUrl;

  // 1. Même email, deux IP différentes → même bucket (resend, max 5)
  {
    const sharedEmail = email("shared-bucket");
    const body = { email: sharedEmail };

    const firstBatch = await hitRouteNTimes(baseUrl, PATHS.resendVerification, body, 3, {
      forwardedFor: "203.0.113.11",
    });
    for (const [index, response] of firstBatch.entries()) {
      await assertNotRateLimited(response, `shared bucket IP-A request ${index + 1}`);
    }

    const secondBatch = await hitRouteNTimes(baseUrl, PATHS.resendVerification, body, 2, {
      forwardedFor: "203.0.113.22",
    });
    for (const [index, response] of secondBatch.entries()) {
      await assertNotRateLimited(response, `shared bucket IP-B request ${index + 1}`);
    }

    const blocked = await postEmailAuthRoute(baseUrl, PATHS.resendVerification, body, {
      forwardedFor: "203.0.113.33",
    });
    await assertRateLimited(blocked, "shared bucket sixth request");
  }

  // 2. Deux emails différents, même IP → quotas indépendants (verify, max 10)
  {
    const emailA = email("independent-a");
    const emailB = email("independent-b");
    const verifyBodyA = { email: emailA, code: "000000" };
    const verifyBodyB = { email: emailB, code: "000000" };
    const sharedIp = "203.0.113.44";

    const responsesA = await hitRouteNTimes(baseUrl, PATHS.verifyEmail, verifyBodyA, 10, {
      forwardedFor: sharedIp,
    });
    for (const [index, response] of responsesA.entries()) {
      await assertNotRateLimited(response, `independent quota email-A request ${index + 1}`);
    }

    const responsesB = await hitRouteNTimes(baseUrl, PATHS.verifyEmail, verifyBodyB, 10, {
      forwardedFor: sharedIp,
    });
    for (const [index, response] of responsesB.entries()) {
      await assertNotRateLimited(response, `independent quota email-B request ${index + 1}`);
    }

    const blockedA = await postEmailAuthRoute(baseUrl, PATHS.verifyEmail, verifyBodyA, {
      forwardedFor: sharedIp,
    });
    await assertRateLimited(blockedA, "independent quota email-A eleventh request");

    const blockedB = await postEmailAuthRoute(baseUrl, PATHS.verifyEmail, verifyBodyB, {
      forwardedFor: sharedIp,
    });
    await assertRateLimited(blockedB, "independent quota email-B eleventh request");
  }

  // 3. verify-email → limite 10 atteinte → 429
  {
    const targetEmail = email("verify-limit");
    const body = { email: targetEmail, code: "000000" };
    const responses = await hitRouteNTimes(baseUrl, PATHS.verifyEmail, body, 11);

    for (const [index, response] of responses.slice(0, 10).entries()) {
      await assertNotRateLimited(response, `verify-email request ${index + 1}`);
    }
    await assertRateLimited(responses[10], "verify-email eleventh request");
  }

  // 4. resend-verification-code → limite 5 atteinte → 429
  {
    const targetEmail = email("resend-limit");
    const body = { email: targetEmail };
    const responses = await hitRouteNTimes(baseUrl, PATHS.resendVerification, body, 6);

    for (const [index, response] of responses.slice(0, 5).entries()) {
      await assertNotRateLimited(response, `resend-verification request ${index + 1}`);
    }
    await assertRateLimited(responses[5], "resend-verification sixth request");
  }

  // 5. forgot-password → limite 5 atteinte → 429
  {
    const targetEmail = email("forgot-limit");
    const body = { email: targetEmail };
    const responses = await hitRouteNTimes(baseUrl, PATHS.forgotPassword, body, 6);

    for (const [index, response] of responses.slice(0, 5).entries()) {
      await assertNotRateLimited(response, `forgot-password request ${index + 1}`);
    }
    await assertRateLimited(responses[5], "forgot-password sixth request");
  }

  // 6. reset-password → limite 10 atteinte → 429
  {
    const targetEmail = email("reset-limit");
    const body = { email: targetEmail, code: "000000", newPassword: "newpass123" };
    const responses = await hitRouteNTimes(baseUrl, PATHS.resetPassword, body, 11);

    for (const [index, response] of responses.slice(0, 10).entries()) {
      await assertNotRateLimited(response, `reset-password request ${index + 1}`);
    }
    await assertRateLimited(responses[10], "reset-password eleventh request");
  }

  // 7. Épuiser verify-email ne bloque pas forgot-password
  {
    const targetEmail = email("cross-verify-forgot");
    const verifyBody = { email: targetEmail, code: "000000" };
    const forgotBody = { email: targetEmail };

    const verifyResponses = await hitRouteNTimes(baseUrl, PATHS.verifyEmail, verifyBody, 10);
    for (const [index, response] of verifyResponses.entries()) {
      await assertNotRateLimited(response, `cross-bucket verify request ${index + 1}`);
    }

    const verifyBlocked = await postEmailAuthRoute(baseUrl, PATHS.verifyEmail, verifyBody);
    await assertRateLimited(verifyBlocked, "cross-bucket verify eleventh request");

    const forgotAllowed = await postEmailAuthRoute(baseUrl, PATHS.forgotPassword, forgotBody);
    await assertNotRateLimited(forgotAllowed, "cross-bucket forgot after verify exhaustion");
  }

  // 8. Épuiser forgot-password ne bloque pas resend-verification-code
  {
    const targetEmail = email("cross-forgot-resend");
    const forgotBody = { email: targetEmail };
    const resendBody = { email: targetEmail };

    const forgotResponses = await hitRouteNTimes(baseUrl, PATHS.forgotPassword, forgotBody, 5);
    for (const [index, response] of forgotResponses.entries()) {
      await assertNotRateLimited(response, `cross-bucket forgot request ${index + 1}`);
    }

    const forgotBlocked = await postEmailAuthRoute(baseUrl, PATHS.forgotPassword, forgotBody);
    await assertRateLimited(forgotBlocked, "cross-bucket forgot sixth request");

    const resendAllowed = await postEmailAuthRoute(baseUrl, PATHS.resendVerification, resendBody);
    await assertNotRateLimited(resendAllowed, "cross-bucket resend after forgot exhaustion");
  }

  console.log("Security runtime email rate limit tests passed");
} finally {
  if (handle) {
    await stopSecurityRuntimeServer(handle);
  }
}
});
