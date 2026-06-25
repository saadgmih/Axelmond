import assert from "node:assert/strict";
import {
  getActiveHttpRequestCount,
  resetActiveHttpRequestsForTests,
  shutdownGuardMiddleware,
  waitForActiveHttpRequests,
} from "../src/server/shutdown-coordination.ts";
import { startupLifecycle } from "../src/server/startup-lifecycle.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("shutdown-coordination", async () => {
  resetActiveHttpRequestsForTests();

  const res = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader() {
      return this;
    },
    json() {
      return this;
    },
    once(_event: string, cb: () => void) {
      if (_event === "finish") setImmediate(cb);
    },
  };

  shutdownGuardMiddleware({} as any, res as any, () => undefined);
  assert.equal(getActiveHttpRequestCount(), 1);
  await waitForActiveHttpRequests(100);
  assert.equal(getActiveHttpRequestCount(), 0);

  startupLifecycle.beginShutdown("SIGTERM");
  let nextCalled = false;
  const blockedRes = {
    statusCode: 0,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader() {
      return this;
    },
    json() {
      return this;
    },
  };

  shutdownGuardMiddleware({} as any, blockedRes as any, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(blockedRes.statusCode, 503);
});
