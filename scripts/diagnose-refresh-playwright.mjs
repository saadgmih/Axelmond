/**
 * Playwright headless vs headed: when does /api/auth/refresh return 403?
 */
import { chromium } from "@playwright/test";

const base = process.env.AXELMOND_BASE_URL || "https://axelmond.com";
const email = process.env.AXELMOND_PROF_EMAIL || process.env.AXELMOND_LIVE_PROF_EMAIL;
const password = process.env.AXELMOND_PROF_PASSWORD || process.env.AXELMOND_LIVE_PROF_PASSWORD;

if (!email || !password) {
  console.error("Missing credentials in env");
  process.exit(1);
}

async function runScenario(headless, label) {
  const refreshEvents = [];
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("response", async (res) => {
    if (res.url().includes("/api/auth/refresh")) {
      let body = "";
      try {
        body = await res.text();
      } catch {
        /* ignore */
      }
      let code = "";
      try {
        code = JSON.parse(body).code || JSON.parse(body).error || "";
      } catch {
        code = body.slice(0, 80);
      }
      refreshEvents.push({ status: res.status(), code, label: "unknown" });
    }
  });

  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  refreshEvents.forEach((e) => {
    if (e.status) e.label = "pre-login";
  });

  await page.getByRole("button", { name: "Espace Professeur / Admin" }).click();
  const loginToggle = page.getByRole("button", { name: /Déjà membre \? Se connecter/i });
  if (await loginToggle.isVisible({ timeout: 3000 }).catch(() => false)) await loginToggle.click();
  await page.getByRole("textbox", { name: /Adresse e-mail/i }).fill(email);
  await page.getByRole("textbox", { name: /Mot de passe/i }).fill(password);
  await page.getByRole("button", { name: /^Se connecter$/i }).first().click();
  await page.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(2000);
  refreshEvents.forEach((e) => {
    if (e.status && e.label === "unknown") e.label = "post-login";
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  refreshEvents.forEach((e) => {
    if (e.status && e.label === "unknown") e.label = "post-reload";
  });

  const cookies = await context.cookies();
  const hasRefresh = cookies.some((c) => c.name === "refresh_token");
  const hasCsrf = cookies.some((c) => c.name === "csrf_token");
  const loggedIn = await page
    .getByRole("button", { name: /Se déconnecter|Contrôleur de Modules Live/i })
    .first()
    .isVisible()
    .catch(() => false);

  console.log(`\n--- ${label} (headless=${headless}) ---`);
  console.log("Cookies after reload: refresh_token=", hasRefresh, "csrf_token=", hasCsrf);
  console.log("Still logged in after reload:", loggedIn);
  console.log("Refresh calls:", refreshEvents.filter((e) => e.status).map((e) => `[${e.label}] ${e.status} ${e.code}`).join(" | ") || "(none)");

  const refresh403 = refreshEvents.filter((e) => e.status === 403);
  const refresh401 = refreshEvents.filter((e) => e.status === 401);
  const refresh200 = refreshEvents.filter((e) => e.status === 200);
  console.log("Summary:", { refresh200: refresh200.length, refresh403: refresh403.length, refresh401: refresh401.length });

  await browser.close();
  return { loggedIn, refresh403: refresh403.length, refresh200: refresh200.length };
}

const headless = await runScenario(true, "headless");
const headed = await runScenario(false, "headed");

console.log("\n=== COMPARE ===");
console.log("headless:", headless);
console.log("headed:", headed);
