import { test } from "vitest";

/** Wrap static source/assertion checks so Vitest registers a test suite. */
export function rulesTest(name: string, fn: () => void | Promise<void>) {
  test(name, async () => {
    await fn();
  });
}
