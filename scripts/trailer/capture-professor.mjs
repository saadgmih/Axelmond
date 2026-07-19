import { spawn, execSync } from "node:child_process";
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.join(__dirname, "raw");
const BASE_URL = "http://localhost:3000";
const EMAIL = process.env.TRAILER_LOGIN_EMAIL?.trim() || "prof@gmail.com";
const PASSWORD = process.env.TRAILER_LOGIN_PASSWORD?.trim();
const VIEWPORT = { width: 1920, height: 1080 };

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function smoothScroll(page, deltaY, steps = 20) {
  const step = deltaY / steps;
  for (let i = 0; i < steps; i += 1) {
    await page.mouse.wheel(0, step);
    await sleep(24);
  }
}

/**
 * Kill the dev server process tree on Windows.
 * devServer.kill() only kills the shell wrapper — the actual node process
 * stays alive and holds port 3000. This helper uses taskkill /T to kill
 * the entire process tree.
 */
function killServerTree(devServer) {
  try {
    devServer.kill("SIGTERM");
  } catch {}
  if (process.platform === "win32" && devServer.pid) {
    try {
      execSync(`taskkill /f /t /pid ${devServer.pid}`, { stdio: "ignore" });
    } catch {}
  }
}

async function main() {
  if (!PASSWORD) {
    throw new Error("TRAILER_LOGIN_PASSWORD doit être définie pour enregistrer la session professeur.");
  }

  console.log("Démarrage du serveur de dev local...");
  const devServer = spawn("npx", ["tsx", "server.ts"], {
    cwd: path.resolve(__dirname, "../.."),
    stdio: "pipe",
    shell: true,
  });

  let serverStarted = false;
  devServer.stdout.on("data", (data) => {
    const output = data.toString();
    console.log(`[server] ${output.trim()}`);
    if (output.includes("running on port") || output.includes("http://localhost:")) {
      serverStarted = true;
    }
  });

  devServer.stderr.on("data", (data) => {
    console.error(`[server-err] ${data.toString().trim()}`);
  });

  // Attendre au plus 20 secondes que le serveur démarre
  for (let i = 0; i < 40; i++) {
    if (serverStarted) break;
    await sleep(500);
  }
  await sleep(1500); // Marge de sécurité supplémentaire

  console.log("Lancement de Playwright pour l'enregistrement du professeur...");
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage", "--no-sandbox"] });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: RAW_DIR, size: VIEWPORT },
    locale: "fr-FR",
    colorScheme: "dark",
  });

  const page = await context.newPage();
  page.setDefaultTimeout(40000);

  try {
    // --- LOGIN ---
    console.log("Navigation vers la page de login...");
    // Navigate to root — /login does NOT exist in the SPA router and shows 404
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await sleep(1200);

    // Switch from Register to Login tab if needed
    const switchToLogin = page.getByRole("button", { name: /Déjà membre/i });
    if (await switchToLogin.isVisible().catch(() => false)) await switchToLogin.click();
    await page.waitForSelector("#auth-email-login", { timeout: 20000 });
    await sleep(500);

    // Switch to ESPACE PROFESSEUR / ADMIN sector
    const teacherTab = page.locator("button").filter({ hasText: /ESPACE PROFESSEUR/i }).first();
    if (await teacherTab.isVisible().catch(() => false)) {
      console.log("Selecting ESPACE PROFESSEUR / ADMIN sector...");
      await teacherTab.click();
      await sleep(800);
    }

    console.log("Connexion en tant que professeur...");
    await page.fill("#auth-email-login", EMAIL);
    await page.fill("#auth-password", PASSWORD);
    await sleep(400);
    await page.locator('form button[type="submit"]').click();

    // SPA redirect — no full page load, use Promise.race with waitUntil: "commit"
    await Promise.race([
      page.waitForURL(/\/teacher\//, { timeout: 30000, waitUntil: "commit" }),
      page.waitForSelector("text=Espace Enseignant", { timeout: 30000 }),
      page.waitForSelector("text=Bonjour", { timeout: 30000 }),
    ]).catch(() => null);
    await sleep(1500);

    // --- DASHBOARD ---
    console.log("Enregistrement du Dashboard Professeur...");
    await page.waitForSelector("text=Espace Enseignant", { timeout: 20000 }).catch(() => null);
    await sleep(3000);
    await smoothScroll(page, 150);
    await sleep(1500);

    // --- CURRICULUM ---
    console.log("Navigation vers la gestion des contenus...");
    // The sidebar link label is "Gestion des Contenus" (not "Curriculum")
    const contentLink = page.locator("text=Gestion des Contenus").first();
    if (await contentLink.isVisible().catch(() => false)) {
      await contentLink.click();
    } else {
      // Fallback: direct navigation
      await page.goto(`${BASE_URL}/teacher/curriculum`, { waitUntil: "domcontentloaded" });
    }

    // The page heading is "Gestion du programme pédagogique" and badge is "Studio pédagogique"
    await Promise.race([
      page.waitForSelector("text=programme pédagogique", { timeout: 20000 }),
      page.waitForSelector("text=Studio pédagogique", { timeout: 20000 }),
    ]).catch(() => null);
    await sleep(2500);

    console.log("Enregistrement de la gestion du Curriculum...");
    await smoothScroll(page, 450, 30);
    await sleep(3500);

    console.log("Walkthrough professeur terminé !");
  } catch (err) {
    console.error("Erreur durant la capture:", err.message || err);
  } finally {
    const video = page.video();
    await context.close();
    await browser.close();

    console.log("Arrêt du serveur local...");
    killServerTree(devServer);

    if (video) {
      const srcPath = await video.path();
      const destPath = path.join(RAW_DIR, "professor.webm");
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      fs.renameSync(srcPath, destPath);
      console.log(`Vidéo professeur enregistrée sous : ${destPath}`);
    } else {
      console.error("Aucune vidéo n'a été enregistrée !");
    }
  }
}

main().catch((err) => {
  console.error("Erreur fatale:", err);
  process.exit(1);
});
