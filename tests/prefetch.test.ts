import assert from "node:assert/strict";
import { prefetchOnce, prefetchStudentView } from "../src/utils/prefetch.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("prefetch", () => {
  let calls = 0;
  const loader = () => {
    calls += 1;
    return Promise.resolve("ok");
  };

  void prefetchOnce("test-key", loader);
  void prefetchOnce("test-key", loader);
  assert.equal(calls, 1);

  assert.doesNotThrow(() => {
    prefetchStudentView("dashboard");
    prefetchStudentView("dashboard");
    prefetchStudentView("unknown-view");
  });
});
