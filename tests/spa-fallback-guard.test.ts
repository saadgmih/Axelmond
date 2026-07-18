import request from "supertest";
import { describe, expect, test } from "vitest";
import { createAxelmondApp } from "../src/server/create-app";
import { isKnownPlatformPath } from "../src/navigation/platformPaths";

/**
 * Attach a minimal SPA-like fallback identical in structure to the production
 * one defined in start-server.ts. This lets us test the guard logic without
 * booting the full production server or reading dist/index.html from disk.
 */
function attachTestSpaFallback(app: ReturnType<typeof createAxelmondApp>["app"]) {
  const FILE_EXTENSION_RE = /\.[a-zA-Z0-9]{2,8}$/;

  app.get("*", (req, res) => {
    // File extension guard — never return the SPA shell for resource URLs.
    if (FILE_EXTENSION_RE.test(req.path)) {
      res.status(404).type("text/plain").send("File not found");
      return;
    }

    res
      .status(isKnownPlatformPath(req.path) ? 200 : 404)
      .type("html")
      .send('<html><div id="root"></div></html>');
  });
}

describe("SPA fallback file extension guard", () => {
  // ─── PDF file extensions ─────────────────────────────────────────────
  test("returns 404 text/plain for a non-existent .pdf URL", async () => {
    const { app } = createAxelmondApp();
    attachTestSpaFallback(app);
    const res = await request(app).get("/uploads/missing-document.pdf");
    expect(res.status).toBe(404);
    expect(res.type).toMatch(/text\/plain/);
    expect(res.text).toBe("File not found");
    expect(res.text).not.toContain('<div id="root">');
  });

  test("returns 404 for a deeply nested .pdf path", async () => {
    const { app } = createAxelmondApp();
    attachTestSpaFallback(app);
    const res = await request(app).get("/student/course/examen_final.pdf");
    expect(res.status).toBe(404);
    expect(res.type).toMatch(/text\/plain/);
  });

  // ─── Other media extensions ──────────────────────────────────────────
  test.each([
    ["/videos/lecture.mp4"],
    ["/media/clip.webm"],
    ["/images/photo.jpg"],
    ["/assets/icon.png"],
    ["/assets/graphic.svg"],
    ["/data/config.json"],
  ])("returns 404 for URL with extension: %s", async (path) => {
    const { app } = createAxelmondApp();
    attachTestSpaFallback(app);
    const res = await request(app).get(path);
    expect(res.status).toBe(404);
    expect(res.text).not.toContain('<div id="root">');
  });

  // ─── SPA routes still work ───────────────────────────────────────────
  test("returns 200 HTML for a known SPA platform path /student/dashboard", async () => {
    const { app } = createAxelmondApp();
    attachTestSpaFallback(app);
    const res = await request(app).get("/student/dashboard");
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/html/);
    expect(res.text).toContain('<div id="root">');
  });

  test("returns 200 HTML for the root path /", async () => {
    const { app } = createAxelmondApp();
    attachTestSpaFallback(app);
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/html/);
  });

  test("returns 404 HTML (not text) for unknown SPA route without extension", async () => {
    const { app } = createAxelmondApp();
    attachTestSpaFallback(app);
    const res = await request(app).get("/student/nonexistent-view");
    expect(res.status).toBe(404);
    expect(res.type).toMatch(/html/);
    expect(res.text).toContain('<div id="root">');
  });

  // ─── API routes remain unaffected ────────────────────────────────────
  test("API unknown route returns JSON 404, not SPA HTML", async () => {
    const { app } = createAxelmondApp();
    attachTestSpaFallback(app);
    const res = await request(app).get("/api/student/lessons/download/exam.pdf");
    expect(res.status).toBe(404);
    expect(res.type).toMatch(/json/);
    expect(res.body).toMatchObject({ error: "Route API introuvable" });
    expect(res.text).not.toContain('<div id="root">');
  });

  // ─── Edge cases ──────────────────────────────────────────────────────
  test("URL with encoded filename extension returns 404", async () => {
    const { app } = createAxelmondApp();
    attachTestSpaFallback(app);
    const res = await request(app).get("/uploads/file%20name.pdf");
    expect(res.status).toBe(404);
    expect(res.text).not.toContain('<div id="root">');
  });

  test("URL with case-sensitive extension returns 404", async () => {
    const { app } = createAxelmondApp();
    attachTestSpaFallback(app);
    const res = await request(app).get("/uploads/Report.PDF");
    expect(res.status).toBe(404);
    expect(res.text).not.toContain('<div id="root">');
  });
});
