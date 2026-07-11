/**
 * Post-deploy verification: anonymous boot + student session restore.
 * No secrets logged.
 */
import { chromium } from "@playwright/test";

const base = process.env.AXELMOND_BASE_URL || "https://axelmond.com";
const studEmail = process.env.AXELMOND_STUDENT_EMAIL || process.env.AXELMOND_LIVE_STUDENT_EMAIL;
const studPass = process.env.AXELMOND_STUDENT_PASSWORD || process.env.AXELMOND_LIVE_STUDENT_PASSWORD;

const results = {
  anonymousRefresh403: 0,
  anonymousRefreshOther: [],
  studentRefresh200: false,
  studentLoggedInAfterReload: false,
  studentLogoutOk: false,
};

// 1. Navigation privée simulée — contexte vierge
const browser = await chromium.launch({ headless: true });
const anon = await browser.newContext();
const anonPage = await anon.newPage();
anonPage.on("response", (res) => {
  if (!res.url().includes("/api/auth/refresh")) return;
  const status = res.status();
  if (status === 403) results.anonymousRefresh403++;
  else results.anonymousRefreshOther.push(status);
});
await anonPage.goto(base, { waitUntil: "networkidle", timeout: 60_000 }).catch(() => {});
await anonPage.waitForTimeout(3000);
await anon.close();

// 2. Étudiant — login, reload, refresh 200
if (studEmail && studPass) {
  const stud = await browser.newContext();
  const page = await stud.newPage();
  let reloadRefreshStatus = 0;
  let capturingReload = false;
  page.on("response", (res) => {
    if (capturingReload && res.url().includes("/api/auth/refresh")) {
      reloadRefreshStatus = res.status();
    }
  });

  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Espace Étudiant" }).click();
  const loginToggle = page.getByRole("button", { name: /Déjà membre \? Se connecter/i });
  if (await loginToggle.isVisible({ timeout: 3000 }).catch(() => false)) await loginToggle.click();
  await page.getByRole("textbox", { name: /Adresse e-mail/i }).fill(studEmail);
  await page.getByRole("textbox", { name: /Mot de passe/i }).fill(studPass);
  await page.getByRole("button", { name: /^Se connecter$/i }).first().click();
  await page.waitForLoadState("networkidle", { timeout: 25_000 }).catch(() => {});
  await page
    .locator("#nav-dashboard")
    .or(page.getByRole("button", { name: /Se déconnecter/i }))
    .first()
    .waitFor({ state: "visible", timeout: 30_000 })
    .catch(() => {});

  capturingReload = true;
  await page.reload({ waitUntil: "networkidle", timeout: 60_000 }).catch(() => {});
  capturingReload = false;
  await page.waitForTimeout(2000);

  results.studentRefresh200 = reloadRefreshStatus === 200;
  results.studentLoggedInAfterReload = await page
    .locator("#nav-dashboard")
    .or(page.getByRole("button", { name: /Se déconnecter/i }))
    .first()
    .isVisible({ timeout: 20_000 })
    .catch(() => false);

  await page.getByRole("button", { name: /Se déconnecter/i }).click({ timeout: 15_000 });
  results.studentLogoutOk = await page
    .getByRole("button", { name: "Espace Étudiant" })
    .isVisible({ timeout: 15_000 })
    .catch(() => false);

  await stud.close();
}

await browser.close();

console.log(JSON.stringify({ ...results, reloadRefreshStatus: results.studentRefresh200 ? 200 : "fail" }, null, 2));
const pass =
  results.anonymousRefresh403 === 0 &&
  results.anonymousRefreshOther.length === 0 &&
  results.studentRefresh200 &&
  results.studentLoggedInAfterReload &&
  results.studentLogoutOk;
process.exit(pass ? 0 : 1);
