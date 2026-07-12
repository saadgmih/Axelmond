/**
 * Full student-sector walkthrough for the Performance Académique trailer.
 * Scene markers are written only after each page content is visible.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.join(__dirname, "raw");
const MARKERS_PATH = path.join(RAW_DIR, "markers.json");
const BASE_URL = process.env.TRAILER_BASE_URL || "https://axelmond.com";
const EMAIL = process.env.TRAILER_EMAIL;
const PASSWORD = process.env.TRAILER_PASSWORD;

const VIEWPORT = { width: 1920, height: 1080 };

let startedAt = 0;
const markers = [];

function mark(id) {
  const t = (Date.now() - startedAt) / 1000;
  markers.push({ id, t: Number(t.toFixed(2)) });
  console.log(`[marker] ${id} @ ${t.toFixed(1)}s`);
}

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

async function waitForLoadingDone(page) {
  const loaders = [
    "text=Chargement des données académiques",
    "text=Chargement de la messagerie",
    "text=Chargement de Solidarité",
    "text=Chargement de la classe live",
  ];
  for (const selector of loaders) {
    await page.locator(selector).waitFor({ state: "hidden", timeout: 45000 }).catch(() => null);
  }
  await sleep(500);
}

async function gotoStudent(page, route) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
  await waitForLoadingDone(page);
}

async function dwellScene(page, dwellMs, scrollDelta = 280) {
  if (scrollDelta) await smoothScroll(page, scrollDelta);
  await sleep(Math.max(2200, dwellMs));
}

async function captureScene(page, id, { route, selector, dwell = 5000, scroll = 280 } = {}) {
  if (route) await gotoStudent(page, route);
  if (selector) await page.waitForSelector(selector, { timeout: 45000 });
  await sleep(600);
  mark(id);
  await dwellScene(page, dwell, scroll);
}

async function exploreCatalog(page) {
  const domainCard = page.locator(".catalog-domain-card button").first();
  if (await domainCard.isVisible({ timeout: 8000 }).catch(() => false)) {
    await domainCard.click();
    await sleep(2200);
  }
  const disciplineCard = page.locator("button").filter({ hasText: /modules disponibles/i }).first();
  if (await disciplineCard.isVisible({ timeout: 8000 }).catch(() => false)) {
    await disciplineCard.click();
    await page.waitForSelector("text=Chargement des modules", { state: "hidden", timeout: 20000 }).catch(() => null);
    await sleep(2400);
  }
  await smoothScroll(page, 360);
  await sleep(1800);
}

async function ensureCourseAccess(page) {
  const onCourse = await page.locator("text=Plan d'apprentissage").isVisible({ timeout: 3000 }).catch(() => false);
  if (onCourse) return true;

  const continueBtn = page.locator("button").filter({ hasText: /Continuer le cours/i }).first();
  if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await continueBtn.click();
    await sleep(3000);
    return page.locator("text=Plan d'apprentissage").isVisible({ timeout: 10000 }).catch(() => false);
  }

  const enrolled = await enrollFreeCourseViaSession(page, 2);
  if (!enrolled) return false;

  await gotoStudent(page, "/student/dashboard");
  const btn = page.locator("button").filter({ hasText: /Continuer le cours/i }).first();
  if (await btn.isVisible({ timeout: 8000 }).catch(() => false)) {
    await btn.click();
    await sleep(3200);
  }
  return page.locator("text=Plan d'apprentissage").isVisible({ timeout: 10000 }).catch(() => false);
}

async function enrollFreeCourseViaSession(page, courseId = 2) {
  const result = await page.evaluate(async (id) => {
    const readCsrf = () => {
      const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
      return match ? decodeURIComponent(match[1]) : null;
    };
    const refresh = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(readCsrf() ? { "X-CSRF-Token": readCsrf() } : {}),
      },
      body: "{}",
    });
    if (!refresh.ok) return { ok: false };
    const session = await refresh.json();
    const csrf = session.csrfToken || readCsrf();
    const enroll = await fetch(`/api/courses/${id}/free-enroll`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      },
      body: "{}",
    });
    return { ok: enroll.ok };
  }, courseId);
  return Boolean(result.ok);
}

async function selectModuleByType(page, typePattern) {
  const moduleButton = page
    .locator("button")
    .filter({ hasText: new RegExp(typePattern, "i") })
    .filter({ hasText: /Module Vidéo|Document Manuel|Évaluation interactive|Illustration/i })
    .first();
  if (await moduleButton.isVisible({ timeout: 10000 }).catch(() => false)) {
    await moduleButton.click();
    await sleep(3000);
    return true;
  }
  return false;
}

async function runWalkthrough(page) {
  startedAt = Date.now();

  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await sleep(1400);
  const switchToLogin = page.getByRole("button", { name: /Déjà membre/i });
  if (await switchToLogin.isVisible({ timeout: 5000 }).catch(() => false)) await switchToLogin.click();
  await page.waitForSelector("#auth-email-login", { timeout: 20000 });
  await sleep(500);
  mark("login");
  await page.fill("#auth-email-login", EMAIL);
  await page.fill("#auth-password", PASSWORD);
  await sleep(400);
  await page.locator('form button[type="submit"]').click();
  await Promise.race([
    page.waitForURL(/\/student\//, { timeout: 90000, waitUntil: "commit" }),
    page.waitForSelector("text=Bonjour", { timeout: 90000 }),
    page.waitForSelector("text=Connexion réussie", { timeout: 90000 }),
  ]);
  if (!page.url().includes("/student/")) {
    await gotoStudent(page, "/student/dashboard");
  }
  await waitForLoadingDone(page);
  await page.waitForSelector("text=Bonjour", { timeout: 45000 });
  mark("dashboard");
  await dwellScene(page, 5200, 240);

  await captureScene(page, "profile", {
    route: "/student/profile",
    selector: "text=Profil Étudiant",
    dwell: 4800,
  });

  await captureScene(page, "account-security", {
    route: "/student/account-security",
    selector: "text=Sécurité du compte",
    dwell: 4800,
  });

  await gotoStudent(page, "/student/catalog");
  await page.waitForSelector(".catalog-domain-card", { timeout: 45000 });
  mark("catalog");
  await exploreCatalog(page);

  await gotoStudent(page, "/student/course");
  const inCourse = await ensureCourseAccess(page);
  if (inCourse) {
    await page.waitForSelector("text=Plan d'apprentissage", { timeout: 15000 });
    mark("course");
    await dwellScene(page, 5000, 220);
  } else {
    mark("course");
    await dwellScene(page, 2800, 0);
  }

  if (inCourse) {
    if (await selectModuleByType(page, "Module Vidéo|Vidéo")) {
      const playBtn = page.locator("button").filter({ hasText: /Lire|Lecture|Play/i }).first();
      if (await playBtn.isVisible({ timeout: 4000 }).catch(() => false)) await playBtn.click();
      await sleep(1200);
      mark("video");
      await dwellScene(page, 5200, 0);
    } else {
      mark("video");
      await dwellScene(page, 2800, 0);
    }

    await page.locator("text=Plan d'apprentissage").click({ timeout: 5000 }).catch(() => null);
    await sleep(800);
    if (await selectModuleByType(page, "Document Manuel|PDF")) {
      mark("pdf");
      await dwellScene(page, 5000, 260);
    } else {
      mark("pdf");
      await dwellScene(page, 2800, 0);
    }
  } else {
    mark("video");
    await dwellScene(page, 2200, 0);
    mark("pdf");
    await dwellScene(page, 2200, 0);
  }

  await captureScene(page, "study-plan", {
    route: "/student/study-plan",
    selector: "text=Plan d'étude",
    dwell: 5000,
  });

  await captureScene(page, "messages", {
    route: "/student/messages",
    selector: "text=Messagerie",
    dwell: 5000,
  });

  await captureScene(page, "notifications", {
    route: "/student/notifications",
    selector: "text=Notifications",
    dwell: 4800,
    scroll: 200,
  });

  await captureScene(page, "charity", {
    route: "/student/charity",
    selector: "text=Solidarité et bienfaisance",
    dwell: 5000,
  });

  await captureScene(page, "live", {
    route: "/student/live",
    selector: "text=/session live|classe live|visioconférence/i",
    dwell: 4800,
    scroll: 0,
  });

  mark("end");
  await sleep(600);
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error("Set TRAILER_EMAIL and TRAILER_PASSWORD environment variables.");
    process.exit(1);
  }

  fs.mkdirSync(RAW_DIR, { recursive: true });
  for (const file of fs.readdirSync(RAW_DIR)) {
    if (file.endsWith(".webm") || file.endsWith(".mp4")) fs.unlinkSync(path.join(RAW_DIR, file));
  }

  console.log(`Recording full student tour at ${BASE_URL} …`);
  const browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage", "--no-sandbox"] });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: RAW_DIR, size: VIEWPORT },
    locale: "fr-FR",
    colorScheme: "dark",
  });

  const page = await context.newPage();
  page.setDefaultTimeout(50000);

  try {
    await runWalkthrough(page);
  } catch (err) {
    console.error("Walkthrough error:", err?.message || err);
    throw err;
  } finally {
    const video = page.video();
    await context.close();
    await browser.close();

    if (!video) {
      console.error("No video recorded.");
      process.exit(1);
    }

    const srcPath = await video.path();
    const destPath = path.join(RAW_DIR, "walkthrough.webm");
    fs.renameSync(srcPath, destPath);
    fs.writeFileSync(MARKERS_PATH, JSON.stringify(markers, null, 2), "utf8");
    console.log(`Saved raw footage: ${destPath}`);
    console.log(`Saved ${markers.length} scene markers: ${MARKERS_PATH}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
