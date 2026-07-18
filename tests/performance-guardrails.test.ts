import fs from "node:fs";
import { describe, expect, test } from "vitest";

const read = (file: string) => fs.readFileSync(file, "utf8");

describe("performance guardrails", () => {
  test("emits a Vite manifest for dependency budgets", () => {
    expect(read("vite.config.ts")).toMatch(/manifest:\s*true/);
  });

  test("exposes the performance budget command", () => {
    expect(read("package.json")).toMatch(/"ci:performance":\s*"node scripts\/check-performance-budget\.mjs"/);
  });

  test("runs performance budgets in CI", () => {
    expect(`${read("package.json")}\n${read(".github/workflows/ci.yml")}`).toMatch(/ci:performance/);
  });

  test("budgets the initial JavaScript graph", () => {
    expect(read("scripts/check-performance-budget.mjs")).toMatch(/initialJsGzipBytes/);
  });

  test("budgets initial CSS", () => {
    expect(read("scripts/check-performance-budget.mjs")).toMatch(/initialCssGzipBytes/);
  });

  test("budgets the largest lazy chunks and worker", () => {
    const source = read("scripts/check-performance-budget.mjs");
    expect(source).toMatch(/largestJsChunkBytes/);
    expect(source).toMatch(/largestWorkerBytes/);
  });

  test("keeps the critical logo small and correctly sized", () => {
    const logo = fs.readFileSync("public/performance-logo-003a24a4-192.png");
    expect(logo.length).toBeLessThan(64 * 1024);
    expect(logo.readUInt32BE(16)).toBe(192);
    expect(logo.readUInt32BE(20)).toBe(192);
  });

  test("keeps the public founder portrait within its image budget", () => {
    const portrait = fs.readFileSync("public/director-oussama-full-720-8e453474.jpg");
    expect(portrait.length).toBeLessThan(80 * 1024);
  });

  test("does not ship KaTeX CSS in the global stylesheet", () => {
    expect(read("src/index.css")).not.toMatch(/katex\.min\.css/);
  });

  test("loads KaTeX styles with the renderer", () => {
    expect(read("src/components/LatexText.tsx")).toMatch(/katex\/dist\/katex\.min\.css/);
  });

  test("loads the math renderer only when math is rendered", () => {
    expect(read("src/components/LazyLatexText.tsx")).toMatch(/lazy\(\(\) => import\("\.\/LatexText"\)\)/);
  });

  test("loads the PDF viewer only for a selected document", () => {
    const source = read("src/views/student/StudentCourseView.tsx");
    expect(source).toMatch(/lazy\(\(\) => import\("\.\.\/\.\.\/components\/PdfLessonViewer"\)\)/);
    expect(source).not.toMatch(/^import PdfLessonViewer/m);
  });

  test("loads the premium video player only for selected media", () => {
    const source = read("src/views/student/StudentCourseView.tsx");
    expect(source).toMatch(/lazy\(\(\) => import\("\.\.\/\.\.\/components\/PremiumVideoPlayer"\)\)/);
    expect(source).not.toMatch(/^import PremiumVideoPlayer/m);
  });

  test("loads WebAuthn only after a passkey action", () => {
    for (const file of [
      "src/components/AuthScreen.tsx",
      "src/components/AuthMfaStep.tsx",
      "src/components/SecuritySettingsPanel.tsx",
    ]) {
      const source = read(file);
      expect(source).toMatch(/await import\("@simplewebauthn\/browser"\)/);
      expect(source).not.toMatch(/^import .*@simplewebauthn\/browser/m);
    }
  });

  test("loads the messaging socket only for an authenticated session", () => {
    const source = read("src/hooks/useMessagingSocket.ts");
    expect(source).toMatch(/await import\("socket\.io-client"\)/);
    expect(source).not.toMatch(/^import \{ io/m);
  });

  test("does not request the catalog on the public authentication screen", () => {
    expect(read("src/app/hooks/usePlatformCatalogData.ts")).toMatch(/!isAuthReady \|\| !currentUser/);
  });

  test("coalesces concurrent identical GET requests", () => {
    const source = read("src/api.ts");
    expect(source).toMatch(/inFlightGetRequests/);
    expect(source).toMatch(/method !== "GET"/);
  });

  test("keeps session refresh single-flight", () => {
    expect(read("src/api.ts")).toMatch(/if \(!refreshPromise\)/);
  });

  test("caches the global site setting in process", () => {
    const source = read("src/site-settings.ts");
    expect(source).toMatch(/SITE_SETTINGS_CACHE_TTL_MS/);
    expect(source).toMatch(/cachedSiteSettingsExpiresAt/);
  });

  test("avoids a notification count waterfall", () => {
    const source = read("src/hooks/useNotifications.ts");
    const routeSource = read("src/routes/messaging-routes.ts");
    expect(source).toMatch(/getNotificationsOverview/);
    expect(source).not.toMatch(/await refreshUnreadCount/);
    expect(routeSource).toMatch(/\/api\/notifications\/overview/);
    expect(routeSource).toMatch(/Promise\.all/);
  });

  test("uses cache-first only for versioned static assets", () => {
    const source = read("public/sw.js");
    expect(source).toMatch(/performance-academique-static-v8/);
    expect(source).toMatch(/isVersionedStaticAsset/);
  });

  test("keeps hashed root assets immutable", () => {
    expect(read("src/server/static-cache-policy.ts")).toMatch(/\[a-f0-9\]\{8\}/);
  });

  test("revalidates HTML instead of disabling storage", () => {
    const source = read("src/server/start-server.ts");
    expect(source).toMatch(/no-cache, must-revalidate, no-transform/);
    expect(source).not.toMatch(/no-store, no-transform/);
  });

  test("uses a singleton Prisma client and a bounded Hostinger pool", () => {
    const source = read("src/db.ts");
    expect(source).toMatch(/globalForPrisma\.prisma/);
    expect(source).toMatch(/isHostinger \? 2 : 5/);
  });

  test("lazy-loads catalog images", () => {
    expect(read("src/views/student/StudentCatalogView.tsx")).toMatch(/loading="lazy"/);
  });
});
