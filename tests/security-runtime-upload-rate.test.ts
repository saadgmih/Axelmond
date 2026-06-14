import assert from "node:assert/strict";
import {
  allocateSecurityRuntimePort,
  startSecurityRuntimeServer,
  stopSecurityRuntimeServer,
  waitForSecurityRuntimeHealth,
} from "./helpers/security-runtime-harness.ts";
import { skipSecurityRuntimeTests } from "./helpers/security-runtime-harness.ts";
import { runtimeTest } from "./helpers/runtimeTest.ts";

await runtimeTest("security-runtime-upload-rate", async () => {
  const UPLOAD_PATH = "/api/uploadthing";

  if (skipSecurityRuntimeTests()) return;

  const previousUploadLimit = process.env.UPLOAD_RATE_LIMIT_MAX;
  process.env.UPLOAD_RATE_LIMIT_MAX = "2";

  let handle: ReturnType<typeof startSecurityRuntimeServer> | undefined;

  try {
    const runtimePort = await allocateSecurityRuntimePort();
    handle = startSecurityRuntimeServer(runtimePort);
    await waitForSecurityRuntimeHealth(handle.baseUrl, { process: handle.process });

    const responses = [];
    for (let i = 0; i < 3; i += 1) {
      responses.push(
        await fetch(`${handle.baseUrl}${UPLOAD_PATH}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }),
      );
    }

    const statuses = responses.map((response) => response.status);
    assert.ok(
      statuses.slice(0, 2).every((status) => status !== 429),
      `Expected first requests not rate-limited, got ${statuses.join(",")}`,
    );
    assert.equal(statuses[2], 429, "Third UploadThing request should hit uploadRateLimiter");

    const payload = (await responses[2].json()) as { code?: string };
    assert.equal(payload.code, "UPLOAD_RATE_LIMIT_EXCEEDED");

    console.log("Security runtime upload rate tests passed");
  } finally {
    if (handle) {
      await stopSecurityRuntimeServer(handle);
    }
    if (previousUploadLimit === undefined) {
      delete process.env.UPLOAD_RATE_LIMIT_MAX;
    } else {
      process.env.UPLOAD_RATE_LIMIT_MAX = previousUploadLimit;
    }
  }
});
