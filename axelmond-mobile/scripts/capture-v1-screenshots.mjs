/**
 * Capture Phase v1 screenshots via Expo Web + local API.
 * Usage: node scripts/capture-v1-screenshots.mjs [expoUrl] [apiBaseUrl]
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../docs/screenshots");
const expoUrl = process.argv[2] || "http://localhost:8081";
const student = {
  email: "security-runtime-chat-tutor+enrolled@test.axelmond.local",
  password: "Password123!",
};
const teacher = {
  email: "security-runtime-chat-tutor+owner@test.axelmond.local",
  password: "Password123!",
};

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function setReactInput(page, index, value) {
  await page.evaluate(({ index, value }) => {
    const input = document.querySelectorAll("input")[index];
    if (!input) throw new Error(`Missing input #${index}`);
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
    if (!descriptor?.set) throw new Error("Missing input setter");
    descriptor.set.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, { index, value });
}

async function clickText(page, text) {
  return page.evaluate((text) => {
    const el = [...document.querySelectorAll("*")].find((node) => node.textContent?.trim() === text);
    el?.click();
    return !!el;
  }, text);
}

async function clickTab(page, label) {
  return page.evaluate((label) => {
    const el = [...document.querySelectorAll('[role="tab"]')].find((node) => node.textContent?.includes(label));
    el?.click();
    return !!el;
  }, label);
}

async function screenshot(page, name) {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`✓ ${name}`);
}

async function login(page, creds, sector) {
  if (sector === "teacher") {
    await clickText(page, "Enseignant");
    await wait(400);
  } else {
    await clickText(page, "Étudiant");
    await wait(400);
  }
  await setReactInput(page, 0, creds.email);
  await setReactInput(page, 1, creds.password);
  await clickText(page, "Se connecter");
  await wait(5000);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await puppeteer.launch({ headless: true, defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2 } });
  const page = await browser.newPage();

  await page.goto(expoUrl, { waitUntil: "networkidle0", timeout: 120000 });
  await wait(3000);
  await screenshot(page, "01-login.png");

  await login(page, student, "student");
  await page.waitForFunction(() => document.title === "Accueil", { timeout: 30000 });
  await wait(1500);
  await screenshot(page, "03-student-dashboard.png");

  await clickTab(page, "Cours");
  await page.waitForFunction(() => document.title === "Cours", { timeout: 30000 });
  await wait(1500);
  await screenshot(page, "04-student-catalog.png");

  await clickText(page, "Voir le cours →");
  await page.waitForFunction(() => document.title.includes("Détails"), { timeout: 30000 });
  await wait(1500);
  await screenshot(page, "05-course-detail.png");

  await page.evaluate(() => {
    const back = [...document.querySelectorAll("*")].find((node) => node.getAttribute("aria-label")?.includes("back"));
    back?.click();
  });
  await wait(2500);
  await clickTab(page, "Profil");
  await page.waitForFunction(() => document.body.innerText.includes("Se déconnecter"), { timeout: 30000 });
  await wait(1500);
  await screenshot(page, "06-student-profile.png");

  await clickText(page, "Se déconnecter");
  await wait(3000);

  await page.goto(expoUrl, { waitUntil: "networkidle0", timeout: 120000 });
  await wait(2500);
  await clickText(page, "Pas de compte ? Créer un compte");
  await wait(2000);
  await screenshot(page, "02-register.png");

  await page.evaluate(() => localStorage.clear());
  await page.goto(expoUrl, { waitUntil: "networkidle0", timeout: 120000 });
  await wait(3000);
  await page.waitForFunction(() => document.querySelectorAll("input").length >= 2, { timeout: 30000 });

  await login(page, teacher, "teacher");
  await page.waitForFunction(() => document.title === "Accueil", { timeout: 30000 });
  await wait(1500);
  await screenshot(page, "07-teacher-dashboard.png");

  await clickTab(page, "Modules");
  await page.waitForFunction(() => document.title === "Modules", { timeout: 30000 });
  await wait(1500);
  await screenshot(page, "07b-teacher-modules.png");

  await clickTab(page, "Profil");
  await page.waitForFunction(() => document.body.innerText.includes("Se déconnecter"), { timeout: 30000 });
  await wait(1500);
  await screenshot(page, "08-teacher-profile.png");

  await browser.close();
  console.log(`\nScreenshots saved to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
