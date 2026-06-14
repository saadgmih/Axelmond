import assert from "node:assert/strict";
import {
  DEFAULT_SECURITY_RUNTIME_PORT,
  isSecurityRuntimeDatabaseAvailable,
  startSecurityRuntimeServer,
  stopSecurityRuntimeServer,
  waitForSecurityRuntimeHealth,
} from "./helpers/security-runtime-harness.ts";
import { skipSecurityRuntimeTests } from "./helpers/security-runtime-harness.ts";
import { runtimeTest } from "./helpers/runtimeTest.ts";

await runtimeTest("security-runtime-harness.smoke", async () => {
  if (skipSecurityRuntimeTests()) return;

  const handle = startSecurityRuntimeServer(DEFAULT_SECURITY_RUNTIME_PORT);

  try {
    const health = await waitForSecurityRuntimeHealth(handle.baseUrl, { process: handle.process });
    assert.equal(health.status, 200);

    const body = (await health.json()) as { status?: string };
    assert.equal(body.status, "UP");

    console.log("Security runtime harness smoke passed");
  } finally {
    await stopSecurityRuntimeServer(handle);
  }
});
