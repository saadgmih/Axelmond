import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: [
      "tests/security-runtime-*.test.ts",
      "tests/mobile-api-runtime.test.ts",
    ],
    environment: "node",
    pool: "threads",
    fileParallelism: true,
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
