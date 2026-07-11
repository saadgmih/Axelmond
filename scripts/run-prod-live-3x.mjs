#!/usr/bin/env node
/**
 * Exécute le test live production 3 fois consécutivement et génère un rapport.
 * Les identifiants doivent être fournis via l'environnement (jamais en argument CLI).
 */
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const REPORT_PATH = path.join(ROOT, "docs", "PROD-LIVE-TEST-REPORT.md");
const PAUSE_BETWEEN_RUNS_MS = Number(process.env.AXELMOND_LIVE_RUN_PAUSE_MS || 180_000);

function requiredEnv(names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    console.error("Variables d'environnement manquantes:", missing.join(", "));
    console.error("Définissez AXELMOND_LIVE_* ou AXELMOND_PROF_* / AXELMOND_STUDENT_*.");
    process.exit(1);
  }
}

function resolveLiveEnv() {
  const profEmail = process.env.AXELMOND_LIVE_PROF_EMAIL || process.env.AXELMOND_PROF_EMAIL;
  const profPassword = process.env.AXELMOND_LIVE_PROF_PASSWORD || process.env.AXELMOND_PROF_PASSWORD;
  const studEmail = process.env.AXELMOND_LIVE_STUDENT_EMAIL || process.env.AXELMOND_STUDENT_EMAIL;
  const studPassword = process.env.AXELMOND_LIVE_STUDENT_PASSWORD || process.env.AXELMOND_STUDENT_PASSWORD;
  if (!profEmail || !profPassword || !studEmail || !studPassword) {
    requiredEnv([
      "AXELMOND_LIVE_PROF_EMAIL",
      "AXELMOND_LIVE_PROF_PASSWORD",
      "AXELMOND_LIVE_STUDENT_EMAIL",
      "AXELMOND_LIVE_STUDENT_PASSWORD",
    ]);
  }
  process.env.AXELMOND_LIVE_PROF_EMAIL = profEmail;
  process.env.AXELMOND_LIVE_PROF_PASSWORD = profPassword;
  process.env.AXELMOND_LIVE_STUDENT_EMAIL = studEmail;
  process.env.AXELMOND_LIVE_STUDENT_PASSWORD = studPassword;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function runPlaywright(runIndex) {
  return new Promise((resolve) => {
    const started = Date.now();
    const env = { ...process.env, AXELMOND_LIVE_RUN_INDEX: String(runIndex) };
    const child = spawn(
      "npx",
      ["playwright", "test", "tests/manual-prod-live.spec.ts", "--reporter=line"],
      { cwd: ROOT, env, shell: true, stdio: ["ignore", "pipe", "pipe"] },
    );

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      const t = d.toString();
      stdout += t;
      process.stdout.write(t);
    });
    child.stderr.on("data", (d) => {
      const t = d.toString();
      stderr += t;
      process.stderr.write(t);
    });

    child.on("close", (code) => {
      const durationMs = Date.now() - started;
      const summaryPath = path.join(ROOT, `test-results/prod-live-run-${runIndex}`, "run-summary.json");
      let summary = null;
      if (fs.existsSync(summaryPath)) {
        try {
          summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
          summary.result = code === 0 ? "PASS" : "FAIL";
          fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
        } catch {
          /* ignore */
        }
      }
      resolve({ runIndex, code, durationMs, stdout, stderr, summary });
    });
  });
}

function redact(text) {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/(password|passwd|token|secret)(\s*[:=]\s*)\S+/gi, "$1$2[REDACTED]");
}

function buildReport(runs) {
  const lines = [
    "# Rapport — Test live production Playwright (3 runs)",
    "",
    `Généré le : ${new Date().toISOString()}`,
    `URL : ${process.env.AXELMOND_BASE_URL || "https://axelmond.com"}`,
    "",
    "## Contraintes respectées",
    "",
    "- Comptes dédiés via variables `AXELMOND_LIVE_*` (aucun identifiant dans le code)",
    "- Module de test via `AXELMOND_LIVE_TEST_COURSE_ID` ou `AXELMOND_LIVE_TEST_COURSE_TITLE`",
    "- Faux média caméra/micro (Chrome flags + mock getUserMedia)",
    "- Pas de désactivation rate limiting / ACL / sécurité",
    "- Nettoyage UI : fin du live en fin de test (+ hook best-effort)",
    "- Emails masqués dans logs et captures",
    "",
    "## Résultats par run",
    "",
  ];

  let allPass = true;
  for (const run of runs) {
    const pass = run.code === 0;
    if (!pass) allPass = false;
    const s = run.summary;
    lines.push(`### Run ${run.runIndex} — ${pass ? "PASS" : "FAIL"}`);
    lines.push("");
    lines.push(`- **Durée** : ${(run.durationMs / 1000).toFixed(1)}s`);
    lines.push(`- **Code sortie** : ${run.code}`);
    if (s?.steps?.length) {
      lines.push("- **Étapes vérifiées** :");
      for (const step of s.steps) lines.push(`  - ${step}`);
    }
    lines.push(`- **Erreurs console** : ${s?.consoleErrors?.length ?? "n/a"}`);
    if (s?.consoleErrors?.length) {
      for (const e of s.consoleErrors.slice(0, 10)) lines.push(`  - \`${redact(e).slice(0, 200)}\``);
    }
    lines.push(`- **Erreurs page** : ${s?.pageErrors?.length ?? "n/a"}`);
    lines.push(`- **Réponses HTTP 4xx** : ${s?.http4xx?.length ?? "n/a"}`);
    if (s?.http4xx?.length) {
      for (const h of s.http4xx.slice(0, 10)) lines.push(`  - ${h.status} ${h.method} ${h.url}`);
    }
    lines.push(`- **Réponses HTTP 5xx** : ${s?.http5xx?.length ?? "n/a"}`);
    if (s?.http5xx?.length) {
      for (const h of s.http5xx.slice(0, 10)) lines.push(`  - ${h.status} ${h.method} ${h.url}`);
    }
    lines.push(`- **Traces** : \`test-results/prod-live-run-${run.runIndex}/trace-prof.zip\`, \`trace-student.zip\``);
    lines.push(`- **Captures** : \`test-results/prod-live-run-${run.runIndex}/final-*.png\``);
    lines.push("");
  }

  lines.push("## Verdict global");
  lines.push("");
  lines.push(allPass ? "**3/3 PASS** — critères automatisés satisfaits." : "**ÉCHEC** — au moins un run a échoué.");
  lines.push("");
  lines.push("## Test manuel réel (à exécuter par un humain)");
  lines.push("");
  lines.push("Voir `docs/PROD-LIVE-REAL-MANUAL.md` pour la checklist prof PC + étudiant mobile.");
  lines.push("");

  return { content: lines.join("\n"), allPass };
}

function stopOrphanLive() {
  try {
    execSync("node scripts/stop-prod-live.mjs", { cwd: ROOT, stdio: "inherit", env: process.env });
  } catch {
    /* best-effort */
  }
}

async function main() {
  resolveLiveEnv();

  if (!process.env.AXELMOND_LIVE_TEST_COURSE_ID && !process.env.AXELMOND_LIVE_TEST_COURSE_TITLE) {
    console.error("Définir AXELMOND_LIVE_TEST_COURSE_ID ou AXELMOND_LIVE_TEST_COURSE_TITLE.");
    process.exit(1);
  }

  const runs = [];
  stopOrphanLive();
  for (let i = 1; i <= 3; i++) {
    console.log(`\n========== RUN ${i}/3 ==========\n`);
    stopOrphanLive();
    const result = await runPlaywright(i);
    runs.push(result);
    if (i < 3) {
      console.log(`\nPause ${PAUSE_BETWEEN_RUNS_MS / 1000}s avant run suivant (rate limiting)...\n`);
      await sleep(PAUSE_BETWEEN_RUNS_MS);
    }
  }

  const { content, allPass } = buildReport(runs);
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, content);
  stopOrphanLive();
  console.log(`\nRapport écrit : ${REPORT_PATH}`);
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(redact(err.message));
  process.exit(1);
});
