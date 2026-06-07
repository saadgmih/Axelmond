import assert from "node:assert/strict";
import fs from "node:fs";

const appSource = fs.readFileSync("src/App.tsx", "utf8");
const curriculumSource = fs.readFileSync("src/views/teacher/TeacherCurriculumView.tsx", "utf8");
const topbarSource = fs.readFileSync("src/components/Topbar.tsx", "utf8");
const tutorSource = fs.readFileSync("src/components/AITutorChat.tsx", "utf8");
const paymentSource = fs.readFileSync("src/components/PaymentModal.tsx", "utf8");
const schema = fs.readFileSync("prisma/schema.prisma", "utf8");

assert.doesNotMatch(topbarSource, /setTheme|theme:\s*"light"|Passer en mode clair|Passer en mode sombre|Sun|Moon/);
assert.doesNotMatch(appSource + tutorSource + paymentSource, /UniCode|unicode|Sandbox|Test SMTP|e-mail de test|👋|🖥️|🔴|⚪|Pr\. Martin Dubois|Alexandre Dubois|Marie Curie|Alan Turing|Grace Hopper/);
assert.match(appSource, /document\.documentElement\.classList\.add\("dark"\)/);
assert.match(appSource, /Politique de confidentialité/);
assert.match(appSource, /Conditions d'utilisation/);
assert.match(appSource, /Politique des cookies/);
assert.match(appSource, /Mentions légales/);
assert.match(appSource, /Plateforme Académique de Recherche, Formation et Innovation/);
assert.match(appSource, /avatarImage/);
assert.match(schema, /avatarUrl\s+String\?/);
assert.match(curriculumSource, /Titre du module/);
assert.match(curriculumSource, /Crédits ECTS/);
assert.match(appSource, /managedCourses/);

console.log("UI production cleanup rules passed");
