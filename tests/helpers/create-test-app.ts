import type { Express } from "express";
import { createAxelmondApp } from "../../src/server/create-app.ts";

export function createTestApp(): Express {
  const previous = process.env.SECURITY_RUNTIME_TEST;
  process.env.SECURITY_RUNTIME_TEST = "1";
  try {
    const { app } = createAxelmondApp();
    return app;
  } finally {
    if (previous === undefined) delete process.env.SECURITY_RUNTIME_TEST;
    else process.env.SECURITY_RUNTIME_TEST = previous;
  }
}
