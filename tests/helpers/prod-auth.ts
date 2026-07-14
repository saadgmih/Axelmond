import { expect, type Page } from "@playwright/test";

const BASE_URL = process.env.AXELMOND_BASE_URL || "https://axelmond.com";

export type ProdRole = "student" | "professor";

export function getLiveCreds(role: "professor" | "student") {
  const email =
    role === "professor"
      ? process.env.AXELMOND_LIVE_PROF_EMAIL || process.env.AXELMOND_PROF_EMAIL || ""
      : process.env.AXELMOND_LIVE_STUDENT_EMAIL || process.env.AXELMOND_STUDENT_EMAIL || "";
  const password =
    role === "professor"
      ? process.env.AXELMOND_LIVE_PROF_PASSWORD || process.env.AXELMOND_PROF_PASSWORD || ""
      : process.env.AXELMOND_LIVE_STUDENT_PASSWORD || process.env.AXELMOND_STUDENT_PASSWORD || "";
  return { email, password };
}

export function requireLiveCreds(role: "professor" | "student") {
  const creds = getLiveCreds(role);
  if (!creds.email || !creds.password) {
    throw new Error(`Identifiants live manquants pour le rôle ${role} (variables AXELMOND_LIVE_*).`);
  }
  return creds;
}

/** Masque toute adresse e-mail dans les textes de log / rapport. */
export function redactSecrets(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/(password|passwd|token|secret|authorization)(\s*[:=]\s*)(\S+)/gi, "$1$2[REDACTED]");
}

export async function loginProd(page: Page, sector: ProdRole, email: string, password: string) {
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

  const emailField = page.getByRole("textbox", { name: /Adresse e-mail/i });
  const passwordField = page.getByRole("textbox", { name: /Mot de passe/i });
  await emailField.fill(email);
  await passwordField.fill(password);

  await page
    .getByRole("button", { name: /^Se connecter$/i })
    .first()
    .click();
  await page.waitForLoadState("networkidle", { timeout: 25_000 }).catch(() => {});

  const rateLimit = page.getByRole("alert").filter({ hasText: /Trop de requêtes/i });
  if (await rateLimit.isVisible({ timeout: 5000 }).catch(() => false)) {
    throw new Error("Connexion bloquée par rate limiting (429)");
  }

  const authError = page.getByRole("alert").filter({ hasText: /incorrect|non autorisé|invalide/i });
  if (await authError.isVisible({ timeout: 8000 }).catch(() => false)) {
    throw new Error("Échec connexion UI");
  }

  const loggedIn = page
    .getByRole("button", { name: /Se déconnecter/i })
    .or(page.locator("#nav-dashboard"))
    .or(page.getByRole("button", { name: /Mon Espace|Contrôleur de Modules Live/i }));
  await expect(loggedIn.first()).toBeVisible({ timeout: 35_000 });
}

export async function expectLiveRoomJoined(page: Page) {
  await expect(page.getByRole("button", { name: "Participants" })).toBeVisible({ timeout: 90_000 });
}

export function participantCountLocator(page: Page, count: number) {
  return page
    .locator("aside")
    .locator("span.font-mono", { hasText: String(count) })
    .first();
}
