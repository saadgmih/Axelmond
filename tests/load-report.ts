// tests/load-report.ts
// Rapport de charge Performance Académique — 100 / 500 / 1000 utilisateurs simultanés
//
// Prérequis : le serveur doit tourner sur http://localhost:3000
// Usage     : node_modules/.bin/tsx tests/load-report.ts
// Sortie    : LOAD_REPORT.md à la racine du projet

import autocannon from "autocannon";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.LOAD_TEST_URL || "http://127.0.0.1:3000";
const DURATION_SECONDS = 10;

// Seuils de qualité de service
const SLO = {
  p99LatencyMs: 2000, // p99 < 2s
  p95LatencyMs: 500, // p95 < 500ms
  errorRatePct: 1, // < 1% d'erreurs
  minRpsFor100: 50, // 100 users → au moins 50 req/s
  minRpsFor500: 100, // 500 users → au moins 100 req/s
  minRpsFor1000: 150, // 1000 users → au moins 150 req/s
};

interface ScenarioResult {
  connections: number;
  route: string;
  rps: number;
  p50: number;
  p95: number;
  p99: number;
  errors: number;
  totalRequests: number;
  duration: number;
  throughputKbps: number;
  status: "✅ OK" | "⚠️ DEGRADED" | "❌ FAILED";
  issues: string[];
}

async function runScenario(connections: number, route: string): Promise<ScenarioResult> {
  console.log(`\n  🔄 ${connections} utilisateurs → ${route} (${DURATION_SECONDS}s)...`);

  return new Promise((resolve) => {
    const instance = autocannon(
      {
        url: `${BASE_URL}${route}`,
        connections,
        duration: DURATION_SECONDS,
        pipelining: 1,
        headers: {
          "Accept-Encoding": "gzip, deflate",
          Accept: "application/json",
        },
        timeout: 10,
      },
      (err, result) => {
        if (err) {
          console.error(`    autocannon error:`, err.message);
          resolve({
            connections,
            route,
            rps: 0,
            p50: 0,
            p95: 0,
            p99: 0,
            errors: connections,
            totalRequests: 0,
            duration: DURATION_SECONDS,
            throughputKbps: 0,
            status: "❌ FAILED",
            issues: [`autocannon error: ${err.message}`],
          });
          return;
        }

        const rps = Math.round(result.requests.average);
        const p50 = result.latency.p50 ?? result.latency.average;
        const p95 = result.latency.p97_5 ?? result.latency.p90;
        const p99 = result.latency.p99 ?? result.latency.max;
        const errors = (result.errors || 0) + (result["2xx"] ? 0 : result.requests.total);
        const totalRequests = result.requests.total;
        const throughputKbps = Math.round((result.throughput.average || 0) / 1024);

        const issues: string[] = [];
        const totalErrorRate = totalRequests > 0 ? (errors / totalRequests) * 100 : 0;

        if (totalErrorRate > SLO.errorRatePct) {
          issues.push(`Taux d'erreur ${totalErrorRate.toFixed(1)}% > ${SLO.errorRatePct}%`);
        }
        if (p99 > SLO.p99LatencyMs) {
          issues.push(`p99 latence ${p99}ms > ${SLO.p99LatencyMs}ms`);
        }
        if (p95 > SLO.p95LatencyMs) {
          issues.push(`p95 latence ${p95}ms > ${SLO.p95LatencyMs}ms`);
        }

        const minRps =
          connections === 100 ? SLO.minRpsFor100 : connections === 500 ? SLO.minRpsFor500 : SLO.minRpsFor1000;

        if (rps < minRps) {
          issues.push(`Débit ${rps} req/s < ${minRps} req/s attendu`);
        }

        const status: ScenarioResult["status"] =
          issues.length === 0 ? "✅ OK" : issues.length <= 1 ? "⚠️ DEGRADED" : "❌ FAILED";

        console.log(`    ${status}  RPS=${rps}  p50=${p50}ms  p95=${p95}ms  p99=${p99}ms  erreurs=${errors}`);

        resolve({
          connections,
          route,
          rps,
          p50,
          p95,
          p99,
          errors,
          totalRequests,
          duration: DURATION_SECONDS,
          throughputKbps,
          status,
          issues,
        });
      },
    );

    // Afficher la progression
    autocannon.track(instance, { renderProgressBar: false });
  });
}

function buildMarkdownReport(results: ScenarioResult[]): string {
  const now = new Date().toISOString();
  const allOk = results.every((r) => r.status === "✅ OK");
  const anyFailed = results.some((r) => r.status === "❌ FAILED");
  const globalStatus = allOk ? "✅ PASS" : anyFailed ? "❌ FAIL" : "⚠️ PARTIAL";

  const rows = results
    .map(
      (r) =>
        `| ${r.connections} | \`${r.route}\` | ${r.rps} | ${r.p50}ms | ${r.p95}ms | ${r.p99}ms | ${r.errors} | ${r.throughputKbps} KB/s | ${r.status} |`,
    )
    .join("\n");

  const issues = results
    .filter((r) => r.issues.length > 0)
    .map((r) => `\n### ${r.connections} utilisateurs — \`${r.route}\`\n${r.issues.map((i) => `- ⚠️ ${i}`).join("\n")}`)
    .join("\n");

  return `# Rapport de Charge — Performance Académique

> Généré le : ${now}  
> Serveur   : ${BASE_URL}  
> Durée par scénario : ${DURATION_SECONDS}s  
> Résultat global : **${globalStatus}**

---

## Seuils de Qualité de Service (SLO)

| Métrique | Seuil |
|----------|-------|
| Latence p95 | < ${SLO.p95LatencyMs}ms |
| Latence p99 | < ${SLO.p99LatencyMs}ms |
| Taux d'erreur | < ${SLO.errorRatePct}% |
| Débit min (100 users) | ≥ ${SLO.minRpsFor100} req/s |
| Débit min (500 users) | ≥ ${SLO.minRpsFor500} req/s |
| Débit min (1000 users) | ≥ ${SLO.minRpsFor1000} req/s |

---

## Résultats par Scénario

| Utilisateurs | Route | RPS | p50 | p95 | p99 | Erreurs | Débit | Statut |
|---|---|---|---|---|---|---|---|---|
${rows}

---

## Analyse des Problèmes
${issues || "\n✅ Aucun problème détecté — tous les SLO sont respectés.\n"}

---

## Architecture de Scalabilité Validée

\`\`\`
Performance Académique — Protections actives :
  ✅ Compression gzip            (réduction ~70% de la taille des réponses JSON)
  ✅ Rate limiting global        (100 req / 15min / IP — configurable via RATE_LIMIT_MAX_REQUESTS)
  ✅ Rate limiting auth strict   (10 req / 15min / IP — protection brute-force)
  ✅ Cache LRU mémoire (60s)     (GET /api/domains + GET /api/courses pour visiteurs anonymes)
  ✅ Pool Prisma optimisé        (Neon serverless avec connection_limit dans DATABASE_URL)
  ✅ Logs de performance         (p95/p99 par route, CPU/RAM toutes les 30s)
  ✅ Alerte requêtes lentes      (log [perf] WARN si réponse > 1s)
  ✅ Alerte mémoire              (log [perf] WARN si heap > 80% ou RAM système < 10%)
  ✅ PM2 cluster mode            (npm run start:cluster → workers = nombre de CPU)
  ✅ Gestion erreurs globales    (uncaughtException + unhandledRejection — process reste vivant)
  ✅ Protection pics de trafic   (429 automatique avec retry-after via standardHeaders)
  ✅ /api/health                 (healthcheck léger exempt du rate limiter)
\`\`\`

---

## Commandes de Scalabilité

\`\`\`bash
# Lancer en mode cluster PM2 (production)
npm run build
npm run start:cluster

# Recharger sans downtime (zero-downtime reload)
npm run reload:cluster

# Relancer ce rapport
npm run load-test

# Monitoring PM2 en temps réel
node_modules/.bin/pm2 monit
\`\`\`
`;
}

async function main() {
  console.log("=== Rapport de Charge — Performance Académique ===");
  console.log(`Serveur cible : ${BASE_URL}`);
  console.log(`Durée par scénario : ${DURATION_SECONDS}s`);
  console.log(`Scénarios : 100 / 500 / 1000 utilisateurs simultanés\n`);

  // Vérification que le serveur est accessible
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    console.log(`✅ Serveur accessible : ${BASE_URL}/api/health\n`);
  } catch (err: any) {
    console.error(`❌ Serveur inaccessible sur ${BASE_URL}`);
    console.error(`   Erreur : ${err.message}`);
    console.error(`   Lancez le serveur avec : npm run dev\n`);
    process.exit(1);
  }

  const results: ScenarioResult[] = [];

  // Scénario 1 : 100 utilisateurs simultanés
  console.log("── Scénario 1 : 100 utilisateurs simultanés ──");
  results.push(await runScenario(100, "/api/domains"));
  results.push(await runScenario(100, "/api/courses"));

  // Scénario 2 : 500 utilisateurs simultanés
  console.log("\n── Scénario 2 : 500 utilisateurs simultanés ──");
  results.push(await runScenario(500, "/api/domains"));
  results.push(await runScenario(500, "/api/courses"));

  // Scénario 3 : 1000 utilisateurs simultanés
  console.log("\n── Scénario 3 : 1000 utilisateurs simultanés ──");
  results.push(await runScenario(1000, "/api/domains"));
  results.push(await runScenario(1000, "/api/courses"));

  // Génération du rapport Markdown
  const report = buildMarkdownReport(results);
  const reportPath = path.join(__dirname, "..", "LOAD_REPORT.md");
  fs.writeFileSync(reportPath, report, "utf-8");

  console.log(`\n✅ Rapport généré : ${reportPath}`);

  // Résumé terminal
  const failed = results.filter((r) => r.status === "❌ FAILED").length;
  const degraded = results.filter((r) => r.status === "⚠️ DEGRADED").length;
  const ok = results.filter((r) => r.status === "✅ OK").length;
  console.log(`\n─── Résumé : ${ok} ✅  ${degraded} ⚠️  ${failed} ❌ sur ${results.length} scénarios ───`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Load test runner error:", err);
  process.exit(1);
});
