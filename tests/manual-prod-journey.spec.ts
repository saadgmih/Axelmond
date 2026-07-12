/**
 * Parcours manuels automatisés sur la production.
 * Identifiants UNIQUEMENT via variables d'environnement (ne jamais committer).
 *
 * Usage:
 *   AXELMOND_BASE_URL=https://axelmond.com \
 *   AXELMOND_STUDENT_EMAIL=... AXELMOND_STUDENT_PASSWORD=... \
 *   AXELMOND_PROF_EMAIL=... AXELMOND_PROF_PASSWORD=... \
 *   AXELMOND_ADMIN_EMAIL=... AXELMOND_ADMIN_PASSWORD=... \
 *   npx playwright test tests/manual-prod-journey.spec.ts --reporter=line
 */
import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.AXELMOND_BASE_URL || "https://axelmond.com";

const CREDS = {
  student: {
    email: process.env.AXELMOND_STUDENT_EMAIL || "",
    password: process.env.AXELMOND_STUDENT_PASSWORD || "",
  },
  professor: {
    email: process.env.AXELMOND_PROF_EMAIL || "",
    password: process.env.AXELMOND_PROF_PASSWORD || "",
  },
  admin: {
    email: process.env.AXELMOND_ADMIN_EMAIL || "",
    password: process.env.AXELMOND_ADMIN_PASSWORD || "",
  },
};

function requireCreds(role: keyof typeof CREDS) {
  const { email, password } = CREDS[role];
  if (!email || !password) {
    test.skip(true, `Variables AXELMOND_${role.toUpperCase()}_EMAIL/PASSWORD manquantes`);
  }
  return { email, password };
}

async function loginAs(page: Page, sector: "student" | "professor", email: string, password: string) {
  const consoleErrors: string[] = [];
  page.on("pageerror", (err) => consoleErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });

  if (sector === "student") {
    await page.getByRole("button", { name: "Espace Étudiant" }).click();
  } else {
    await page.getByRole("button", { name: "Espace Professeur / Admin" }).click();
  }

  const loginToggle = page.getByRole("button", { name: /Déjà membre \? Se connecter/i });
  if (await loginToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
    await loginToggle.click();
  }

  await page.getByRole("textbox", { name: /Adresse e-mail/i }).fill(email);
  await page.getByRole("textbox", { name: /Mot de passe/i }).fill(password);

  const rateLimit = page.getByRole("alert").filter({ hasText: /Trop de requêtes/i });
  await page.getByRole("button", { name: /^Se connecter$/i }).first().click();

  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});

  if (await rateLimit.isVisible({ timeout: 5000 }).catch(() => false)) {
    throw new Error("Connexion bloquée par rate limiting (429)");
  }

  const authError = page.getByRole("alert").filter({ hasText: /incorrect|non autorisé|invalide/i });
  if (await authError.isVisible({ timeout: 8000 }).catch(() => false)) {
    throw new Error(`Échec connexion UI: ${await authError.innerText()}`);
  }

  const loggedInMarker = page
    .getByRole("button", { name: /Se déconnecter/i })
    .or(page.locator("#nav-dashboard"))
    .or(page.getByRole("button", { name: /Mon Espace|Contrôleur de Modules Live/i }));
  await expect(loggedInMarker.first()).toBeVisible({ timeout: 30_000 });

  return consoleErrors;
}

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test.describe("Production axelmond.com — parcours réels", () => {
  test.setTimeout(120_000);

  test("Étudiant — connexion, tableau de bord, catalogue", async ({ page }) => {
    const { email, password } = requireCreds("student");
    const errors = await loginAs(page, "student", email, password);
    console.log("   ✅ Étudiant connecté — tableau de bord visible");

    await page.getByRole("button", { name: /Catalogue des Modules/i }).click();
    await expect(page.getByText(/Catalogue|Modules/i).first()).toBeVisible({ timeout: 15_000 });
    console.log("   ✅ Catalogue accessible");

    const courseCard = page.locator('[class*="cursor-pointer"]').filter({ hasText: /./ }).first();
    if (await courseCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await courseCard.click();
      await page.waitForTimeout(2000);
      console.log("   ✅ Ouverture d'un module tentée");
    }

    await page.getByRole("button", { name: /Profil|Mon Profil/i }).first().click({ timeout: 5000 }).catch(() => {});
    await page.getByRole("button", { name: /Se déconnecter/i }).click({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Espace Étudiant" })).toBeVisible({ timeout: 15_000 });
    console.log("   ✅ Déconnexion étudiant OK");

    if (errors.length) console.log(`   ⚠️ ${errors.length} erreurs console (étudiant)`);
  });

  test("Étudiant mobile (375px) — connexion et navigation", async ({ browser }) => {
    const { email, password } = requireCreds("student");
    await new Promise((r) => setTimeout(r, 35_000));
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await loginAs(page, "student", email, password);
    const menuToggle = page.getByRole("button", { name: /barre latérale|Menu|navigation/i }).first();
    if (await menuToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await menuToggle.click();
    }
    await expect(page.locator("#nav-dashboard").first()).toBeVisible({ timeout: 30_000 });
    console.log("   ✅ Étudiant mobile 375px — dashboard OK");
    await context.close();
  });

  test("Professeur — espace enseignant et contrôle live", async ({ page }) => {
    const { email, password } = requireCreds("professor");
    await new Promise((r) => setTimeout(r, 5_000));
    await loginAs(page, "professor", email, password);

    await expect(page.getByRole("button", { name: "Contrôleur de Modules Live" })).toBeVisible({ timeout: 30_000 });
    console.log("   ✅ Professeur connecté — espace enseignant");

    await page.getByRole("button", { name: "Contrôleur de Modules Live" }).click();
    await expect(page.getByText(/Module académique en direct|visioconférence/i).first()).toBeVisible({ timeout: 15_000 });
    console.log("   ✅ Console live accessible");

    await page.getByRole("button", { name: "Gestion des Contenus" }).click({ timeout: 5000 }).catch(() => {});
    await page.getByRole("button", { name: /Se déconnecter/i }).click();
    await expect(page.getByRole("button", { name: /Espace Professeur/i })).toBeVisible({ timeout: 15_000 });
    console.log("   ✅ Déconnexion professeur OK");
  });

  test("Administrateur — accès staff", async ({ page }) => {
    const { email, password } = requireCreds("admin");
    await new Promise((r) => setTimeout(r, 5_000));
    await loginAs(page, "professor", email, password);

    await expect(page.getByRole("button", { name: /Espace Professeur|Contrôleur de Modules Live/i }).first()).toBeVisible({
      timeout: 30_000,
    });
    console.log("   ✅ Admin connecté — espace staff");

    const adminEntry = page.getByRole("button", { name: /Solidarité|Codes|Administration/i }).first();
    if (await adminEntry.isVisible({ timeout: 5000 }).catch(() => false)) {
      await adminEntry.click();
      console.log("   ✅ Section admin/staff ouverte");
    }

    await page.getByRole("button", { name: /Se déconnecter/i }).click();
    console.log("   ✅ Déconnexion admin OK");
  });
});
