import { describe, test } from "vitest";

/** Wrap static source/assertion checks so Vitest registers a test suite. */
export function rulesTest(name: string, fn: () => void | Promise<void>) {
  test(name, async () => {
    await fn();
  });
}

/** Group related static guard assertions with clearer Vitest output. */
export function rulesDescribe(name: string, fn: () => void | Promise<void>) {
  describe(name, () => {
    test("guards", async () => {
      await fn();
    });
  });
}
