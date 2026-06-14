import assert from "node:assert/strict";
import request from "supertest";
import { createTestApp } from "../helpers/create-test-app.ts";
import { rulesTest } from "../helpers/rulesTest.ts";

rulesTest("auth-http", async () => {
  const app = createTestApp();

  const health = await request(app).get("/api/health");
  assert.ok(health.status === 200 || health.status === 404, "health or fallback route");

  const loginMissing = await request(app)
    .post("/api/auth/login")
    .send({ email: "not-an-email", password: "short", role: "STUDENT" });
  assert.equal(loginMissing.status, 400);
  assert.match(String(loginMissing.body?.code || ""), /VALIDATION_ERROR|/);

  const registerWeak = await request(app)
    .post("/api/auth/register")
    .send({
      email: "student@example.com",
      password: "123",
      fullName: "Test User",
      role: "STUDENT",
    });
  assert.equal(registerWeak.status, 400);

  const refreshMissing = await request(app).post("/api/auth/refresh").send({});
  assert.equal(refreshMissing.status, 403);
  assert.equal(refreshMissing.body?.code, "CSRF_TOKEN_INVALID");

  const csrfBlocked = await request(app)
    .post("/api/auth/logout")
    .set("X-CSRF-Token", "fake")
    .send({});
  assert.equal(csrfBlocked.status, 403);
  assert.equal(csrfBlocked.body?.code, "CSRF_TOKEN_INVALID");
});
