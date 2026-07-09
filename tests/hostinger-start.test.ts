import assert from "node:assert/strict";
import net from "node:net";
import { isPortAvailable, waitForExclusivePort } from "../scripts/hostinger-start.mjs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("hostinger-start", () => {
  assert.equal(typeof isPortAvailable, "function");
  assert.equal(typeof waitForExclusivePort, "function");
});

rulesTest("hostinger-start-port-wait", async () => {
  const blocker = net.createServer();
  await new Promise<void>((resolve, reject) => {
    blocker.once("error", reject);
    blocker.listen(0, "127.0.0.1", () => resolve());
  });
  const port = (blocker.address() as net.AddressInfo).port;

  try {
    assert.equal(await isPortAvailable(port, "127.0.0.1"), false);
    const waitResult = await waitForExclusivePort(port, 200, 50);
    assert.equal(waitResult.ok, false);
    assert.ok(waitResult.waitedMs >= 150);
  } finally {
    await new Promise<void>((resolve, reject) => blocker.close((err) => (err ? reject(err) : resolve())));
  }

  assert.equal(await isPortAvailable(port, "127.0.0.1"), true);
});
