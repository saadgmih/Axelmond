import request from "supertest";
import { describe, expect, test } from "vitest";
import { createAxelmondApp } from "../src/server/create-app";
import { validateContentSecurityPolicy } from "../scripts/security-probe.mjs";

describe("unknown API route", () => {
  test("returns a JSON 404 and never the SPA document", async () => {
    const { app } = createAxelmondApp();
    const response = await request(app).get("/api/definitely-unknown");
    expect(response.status).toBe(404);
    expect(response.type).toMatch(/json/);
    expect(response.body).toEqual({ error: "Route API introuvable", code: "API_ROUTE_NOT_FOUND" });
    expect(response.text).not.toContain('<div id="root">');
  });

  test("emits the complete nonce-based CSP in production mode", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousAppUrl = process.env.APP_URL;
    process.env.NODE_ENV = "production";
    process.env.APP_URL = "https://example.test";
    try {
      const { app } = createAxelmondApp();
      const response = await request(app).get("/api/definitely-unknown");
      expect(validateContentSecurityPolicy(response.headers["content-security-policy"])).toMatchObject({ ok: true });
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      if (previousAppUrl === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = previousAppUrl;
    }
  });
});
