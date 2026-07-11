/**
 * Test live Playwright sur la production (1 prof + 1 étudiant).
 *
 * Identifiants UNIQUEMENT via variables d'environnement — ne jamais committer.
 *
 * Variables requises :
 *   AXELMOND_LIVE_PROF_EMAIL / AXELMOND_LIVE_PROF_PASSWORD
 *   AXELMOND_LIVE_STUDENT_EMAIL / AXELMOND_LIVE_STUDENT_PASSWORD
 *   (fallback : AXELMOND_PROF_* / AXELMOND_STUDENT_*)
 *
 * Variables optionnelles :
 *   AXELMOND_BASE_URL (défaut https://axelmond.com)
 *   AXELMOND_LIVE_TEST_COURSE_ID — ID du module de test dédié
 *   AXELMOND_LIVE_TEST_COURSE_TITLE — fragment du titre pour sélection
 *   AXELMOND_LIVE_EXPECT_REPLAY=true — vérifier la rediffusion si enregistrement actif
 *   AXELMOND_LIVE_RUN_INDEX — index du run (1-3) pour traces distinctes
 *
 * Usage :
 *   node scripts/run-prod-live-3x.mjs
 */
import { test, expect, chromium } from "@playwright/test";
import {
  requireLiveCreds,
  loginProd,
  expectLiveRoomJoined,
  participantCountLocator,
  redactSecrets,
} from "./helpers/prod-auth.ts";
import { FAKE_MEDIA_CHROME_ARGS, attachFakeMediaStreams } from "./helpers/prod-live-media-mock.ts";
import { ProdRunMetrics } from "./helpers/prod-run-metrics.ts";

test.setTimeout(540_000);

const runIndex = process.env.AXELMOND_LIVE_RUN_INDEX || "1";
const expectReplay = process.env.AXELMOND_LIVE_EXPECT_REPLAY === "true";
const runNonce = `${runIndex}-${Date.now().toString(36)}`;

const LIVE_SUBJECT = `[QA-LIVE-R${runNonce}] Session automatisée`;
const CHAT_STUDENT_MSG = `[QA-LIVE-R${runNonce}] Message étudiant — ping`;
const CHAT_PROF_REPLY = `[QA-LIVE-R${runNonce}] Réponse prof — pong`;

function emailMaskLocators(page: import("@playwright/test").Page) {
  return [
    page.getByRole("textbox", { name: /Adresse e-mail/i }),
    page.locator('input[type="email"]'),
  ];
}

async function selectTestCourse(profPage: import("@playwright/test").Page) {
  const courseId = process.env.AXELMOND_LIVE_TEST_COURSE_ID;
  const courseTitle = process.env.AXELMOND_LIVE_TEST_COURSE_TITLE;
  const select = profPage.getByRole("combobox", { name: "Module académique en direct" });

  if (courseId) {
    await select.selectOption({ value: courseId });
    return;
  }
  if (courseTitle) {
    const options = await select.locator("option").allTextContents();
    const idx = options.findIndex((t) => t.includes(courseTitle));
    if (idx < 0) {
      throw new Error(`Module de test introuvable (titre contenant « ${courseTitle} »)`);
    }
    const value = await select.locator("option").nth(idx).getAttribute("value");
    if (!value) throw new Error("Option module sans valeur");
    await select.selectOption({ value });
    return;
  }
  throw new Error(
    "Définir AXELMOND_LIVE_TEST_COURSE_ID ou AXELMOND_LIVE_TEST_COURSE_TITLE pour un module de test dédié.",
  );
}

async function endLiveIfStillActive(profPage: import("@playwright/test").Page) {
  try {
    await profPage.getByRole("button", { name: "Contrôleur de Modules Live" }).click({ timeout: 8000 });
    const stopBtn = profPage.getByRole("button", { name: "Éteindre le live" });
    if (await stopBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await stopBtn.scrollIntoViewIfNeeded();
      await stopBtn.click();
      await expect(profPage.getByText("Hors ligne", { exact: true })).toBeVisible({ timeout: 45_000 });
    }
  } catch {
    /* nettoyage best-effort */
  }
}

test("production live — prof + étudiant (faux média, chat, reconnexion, fin)", async () => {
  const profCreds = requireLiveCreds("professor");
  const studCreds = requireLiveCreds("student");
  const metrics = new ProdRunMetrics();

  const browser = await chromium.launch({
    headless: true,
    args: FAKE_MEDIA_CHROME_ARGS,
  });

  const traceDir = `test-results/prod-live-run-${runIndex}`;
  const profContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const studContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  await attachFakeMediaStreams(profContext);
  await attachFakeMediaStreams(studContext);

  await profContext.tracing.start({ screenshots: true, snapshots: true, sources: false, title: `prod-live-prof-run-${runIndex}` });
  await studContext.tracing.start({ screenshots: true, snapshots: true, sources: false, title: `prod-live-stud-run-${runIndex}` });

  const profPage = await profContext.newPage();
  const studPage = await studContext.newPage();
  metrics.attach(profPage, "prof");
  metrics.attach(studPage, "student");

  try {
    // ── Connexion séquentielle (rate limiting) ──
    metrics.step("1. Connexion professeur");
    await loginProd(profPage, "professor", profCreds.email, profCreds.password);
    await profPage.waitForTimeout(2000);

    metrics.step("2. Connexion étudiant");
    await profPage.waitForTimeout(3000);
    await loginProd(studPage, "student", studCreds.email, studCreds.password);

    // ── Lancement live par le prof ──
    metrics.step("3. Ouverture console live + sélection module de test");
    await profPage.getByRole("button", { name: "Contrôleur de Modules Live" }).click();
    await selectTestCourse(profPage);

    metrics.step("4. Saisie sujet + lancement session live");
    await profPage.getByRole("textbox", { name: "Sujet de révision actif" }).fill(LIVE_SUBJECT);
    await profPage.getByRole("button", { name: "Lancer la session live" }).click();

    const rateLimitLive = profPage.getByText(/Trop de requêtes|rate limit/i);
    if (await rateLimitLive.isVisible({ timeout: 8000 }).catch(() => false)) {
      throw new Error("Rate limiting actif — lancement live bloqué (ne pas contourner)");
    }

    await expectLiveRoomJoined(profPage);
    await expect(profPage.getByText("En direct", { exact: true })).toBeVisible({ timeout: 30_000 });

    // ── Détection + connexion étudiant ──
    metrics.step("5. Détection live côté étudiant");
    const joinBtn = studPage.getByRole("button", { name: "Rejoindre la salle de classe" });
    let joined = false;
    for (let attempt = 1; attempt <= 8; attempt++) {
      await studPage.reload();
      try {
        await expect(joinBtn).toBeVisible({ timeout: 10_000 });
        joined = true;
        break;
      } catch {
        if (attempt === 8) throw new Error("Live non détecté côté étudiant après 8 tentatives");
        await studPage.waitForTimeout(5000);
      }
    }
    expect(joined).toBe(true);

    metrics.step("6. Connexion étudiant à la salle");
    await joinBtn.click();
    await expectLiveRoomJoined(studPage);

    // ── Participants (2) ──
    metrics.step("7. Vérification liste participants (2)");
    await profPage.getByRole("button", { name: "Participants" }).click();
    await expect(profPage.locator("aside").getByText("Membres de la session")).toBeVisible({ timeout: 15_000 });
    await expect(participantCountLocator(profPage, 2)).toBeVisible({ timeout: 30_000 });

    // ── Micro / caméra ──
    metrics.step("8. Activation/désactivation micro et caméra (prof)");
    const micOn = profPage.getByRole("button", { name: "Activer le micro (M)" });
    if (await micOn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await micOn.click();
    }
    await expect(profPage.getByRole("button", { name: "Couper le micro (M)" })).toBeVisible({ timeout: 15_000 });

    const camOn = profPage.getByRole("button", { name: "Activer la caméra (V)" });
    if (await camOn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await camOn.click();
    }
    await expect(profPage.getByRole("button", { name: "Couper la caméra (V)" })).toBeVisible({ timeout: 15_000 });

    await profPage.getByRole("button", { name: "Couper le micro (M)" }).click();
    await expect(profPage.getByRole("button", { name: "Activer le micro (M)" })).toBeVisible({ timeout: 10_000 });
    await profPage.getByRole("button", { name: "Couper la caméra (V)" }).click();
    await expect(profPage.getByRole("button", { name: "Activer la caméra (V)" })).toBeVisible({ timeout: 10_000 });

    // ── Chat ──
    metrics.step("9. Envoi/réception message chat");
    await studPage.getByRole("button", { name: "Chat" }).click();
    await profPage.getByRole("button", { name: "Chat" }).click();
    const chatInput = 'input[placeholder="Tapez votre message..."]';
    await studPage.fill(chatInput, CHAT_STUDENT_MSG);
    await studPage.press(chatInput, "Enter");
    await expect(profPage.getByText(CHAT_STUDENT_MSG, { exact: true }).first()).toBeVisible({ timeout: 15_000 });

    await profPage.fill(chatInput, CHAT_PROF_REPLY);
    await profPage.press(chatInput, "Enter");
    await expect(studPage.getByText(CHAT_PROF_REPLY, { exact: true }).first()).toBeVisible({ timeout: 15_000 });

    // ── Déconnexion / reconnexion étudiant ──
    metrics.step("10. Déconnexion puis reconnexion étudiant");
    await studPage.getByRole("button", { name: "Quitter la salle live (L)" }).click();
    await profPage.getByRole("button", { name: "Participants" }).click();
    await expect(participantCountLocator(profPage, 1)).toBeVisible({ timeout: 30_000 });

    await studPage.reload();
    await expect(joinBtn).toBeVisible({ timeout: 20_000 });
    await joinBtn.click();
    await expectLiveRoomJoined(studPage);

    await profPage.getByRole("button", { name: "Participants" }).click();
    await expect(participantCountLocator(profPage, 2)).toBeVisible({ timeout: 30_000 });

    // ── Fin live par le prof ──
    metrics.step("11. Fin du live par le professeur");
    await profPage.evaluate(() => window.scrollTo(0, 0));
    const stopLive = profPage.getByRole("button", { name: "Éteindre le live" });
    await stopLive.scrollIntoViewIfNeeded();
    await expect(stopLive).toBeVisible({ timeout: 15_000 });
    await stopLive.click();
    await expect(profPage.getByText("Hors ligne", { exact: true })).toBeVisible({ timeout: 60_000 });

    // ── Live disparu côté étudiant ──
    metrics.step("12. Vérification disparition live côté étudiant");
    for (let attempt = 1; attempt <= 5; attempt++) {
      await studPage.reload();
      const visible = await joinBtn.isVisible({ timeout: 5000 }).catch(() => false);
      if (!visible) break;
      if (attempt === 5) {
        throw new Error("Le bouton « Rejoindre la salle de classe » est encore visible après fin du live");
      }
      await studPage.waitForTimeout(3000);
    }
    await expect(joinBtn).not.toBeVisible({ timeout: 10_000 });

    // ── Statut final session ──
    metrics.step("13. Vérification statut final session (Hors ligne)");
    await expect(profPage.getByText("Hors ligne", { exact: true })).toBeVisible();
    await expect(profPage.getByText("En direct", { exact: true })).not.toBeVisible();

    // ── Replay (conditionnel) ──
    if (expectReplay) {
      metrics.step("14. Vérification replay (enregistrement activé)");
      await profPage.getByRole("button", { name: /Gestion des Contenus/i }).click();
      await expect(
        profPage.getByText(/Rediffusion live|Rediffusions live en attente|Rediffusion —/i).first(),
      ).toBeVisible({ timeout: 120_000 });
    } else {
      metrics.step("14. Replay ignoré (AXELMOND_LIVE_EXPECT_REPLAY ≠ true)");
    }

    metrics.step("15. Nettoyage UI terminé (live arrêté)");
  } finally {
    await endLiveIfStillActive(profPage).catch(() => {});

    for (const [page, label] of [
      [profPage, "prof"],
      [studPage, "student"],
    ] as const) {
      try {
        await page.screenshot({
          path: `${traceDir}/final-${label}.png`,
          mask: emailMaskLocators(page),
        });
      } catch {
        /* ignore */
      }
    }

    await profContext.tracing.stop({ path: `${traceDir}/trace-prof.zip` });
    await studContext.tracing.stop({ path: `${traceDir}/trace-student.zip` });

    await profPage.close().catch(() => {});
    await studPage.close().catch(() => {});
    await profContext.close().catch(() => {});
    await studContext.close().catch(() => {});
    await browser.close().catch(() => {});

    const summary = metrics.summary();
    const reportPath = `${traceDir}/run-summary.json`;
    const fs = await import("node:fs");
    fs.mkdirSync(traceDir, { recursive: true });
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          runIndex,
          result: "pending",
          ...summary,
          expectReplay,
          liveSubject: LIVE_SUBJECT,
        },
        null,
        2,
      ),
    );

    console.log("\n=== RÉSUMÉ RUN", runIndex, "===");
    console.log("Durée:", summary.durationLabel);
    console.log("Étapes:", summary.steps.length);
    console.log("Erreurs console:", summary.consoleErrors.length);
    console.log("Erreurs page:", summary.pageErrors.length);
    console.log("HTTP 4xx:", summary.http4xx.length);
    console.log("HTTP 5xx:", summary.http5xx.length);
    if (summary.consoleErrors.length) {
      summary.consoleErrors.slice(0, 5).forEach((e) => console.log("  console:", redactSecrets(e)));
    }
    if (summary.http4xx.length || summary.http5xx.length) {
      [...summary.http4xx, ...summary.http5xx].slice(0, 8).forEach((h) =>
        console.log(`  HTTP ${h.status} ${h.method} ${h.url}`),
      );
    }
    console.log("Traces:", `${traceDir}/trace-prof.zip`, `${traceDir}/trace-student.zip`);
  }
});
