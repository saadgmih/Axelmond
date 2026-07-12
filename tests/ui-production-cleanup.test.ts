import assert from "node:assert/strict";
import fs from "node:fs";
import { readAppSources } from "./helpers/app-sources.ts";
import { readCurriculumViewSources } from "./helpers/live-classroom-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("ui-production-cleanup", () => {
  const appSource = readAppSources();
  const curriculumSource = readCurriculumViewSources();
  const topbarSource = fs.readFileSync("src/components/Topbar.tsx", "utf8");
  const tutorSource = fs.readFileSync("src/components/AITutorChat.tsx", "utf8");
  const paymentSource = fs.readFileSync("src/components/PaymentModal.tsx", "utf8");
  const cssSource = fs.readFileSync("src/index.css", "utf8");
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");

  assert.doesNotMatch(topbarSource, /setTheme|theme:\s*"light"|Passer en mode clair|Passer en mode sombre|Sun|Moon/);
  assert.doesNotMatch(
    appSource + tutorSource + paymentSource,
    /UniCode|unicode|Sandbox|Test SMTP|e-mail de test|👋|🖥️|🔴|⚪|Pr\. Martin Dubois|Alexandre Dubois|Marie Curie|Alan Turing|Grace Hopper/,
  );
  assert.match(appSource, /document\.documentElement\.classList\.add\("dark"\)/);
  assert.match(appSource, /Politique de confidentialité/);
  assert.match(appSource, /Conditions d'utilisation/);
  assert.match(appSource, /Politique des cookies/);
  assert.match(appSource, /Mentions légales/);
  assert.match(appSource, /Plateforme académique de formation, progression et réussite/);
  assert.match(appSource, /avatarImage/);
  assert.match(schema, /avatarUrl\s+String\?/);
  assert.match(curriculumSource, /Titre du module/);
  assert.match(curriculumSource, /creditsLabel/);
  assert.match(curriculumSource, /formatMad|formatCredits|morocco-locale/);
  assert.match(appSource, /managedCourses/);
  assert.match(cssSource, /Neutral hover suppression/);
  assert.match(cssSource, /\[class\*="hover:bg-slate-"\]/);
  assert.match(cssSource, /\[class\*="hover:bg-zinc-"\]/);
  assert.match(cssSource, /rgba\(5,\s*194,\s*165,\s*0\.12\)/);
  assert.doesNotMatch(cssSource, /\.dark \.hover\\:bg-slate-50:hover,[\s\S]*?background-color:\s*#1e293b\s*!important/);
});
