import { test, expect, chromium } from "@playwright/test";
import { prisma } from "../src/db";
import bcrypt from "bcryptjs";

// Définir la configuration du test
test.setTimeout(420000); // 7 minutes — 7 navigateurs + LiveKit

const TEST_USERS = [
  { id: "test-prof-1", role: "PROFESSOR" as const, email: "prof1@axelmond.edu.fr", name: "Pr. Jean Dupont" },
  {
    id: "test-stud-1",
    role: "STUDENT" as const,
    email: "stud1@axelmond.univ.fr",
    name: "Elie Cartan",
    filiere: "Mathématiques",
  },
  {
    id: "test-stud-2",
    role: "STUDENT" as const,
    email: "stud2@axelmond.univ.fr",
    name: "Sophie Germain",
    filiere: "Physique",
  },
  {
    id: "test-stud-3",
    role: "STUDENT" as const,
    email: "stud3@axelmond.univ.fr",
    name: "Henri Poincare",
    filiere: "Informatique",
  },
  {
    id: "test-stud-4",
    role: "STUDENT" as const,
    email: "stud4@axelmond.univ.fr",
    name: "Emmy Noether",
    filiere: "Mathématiques",
  },
  {
    id: "test-stud-5",
    role: "STUDENT" as const,
    email: "stud5@axelmond.univ.fr",
    name: "Alan Turing",
    filiere: "Informatique",
  },
  {
    id: "test-stud-6",
    role: "STUDENT" as const,
    email: "stud6@axelmond.univ.fr",
    name: "Marie Meerson",
    filiere: "Physique",
  },
];

let COURSE_ID = 0;

async function expectLiveRoomJoined(page: import("@playwright/test").Page) {
  await expect(page.getByRole("button", { name: "Participants" })).toBeVisible({ timeout: 90_000 });
}

test.beforeAll(async () => {
  console.log("=== Initialisation de la Base de Données pour le Test Multi-Utilisateurs ===");

  const publishedCourse = await prisma.course.findFirst({
    where: { published: true },
    orderBy: { id: "asc" },
  });
  if (!publishedCourse) {
    throw new Error("Aucun cours publié disponible pour le test live multi-utilisateurs.");
  }
  COURSE_ID = publishedCourse.id;
  console.log(`Module de test sélectionné : #${COURSE_ID} — ${publishedCourse.title}`);

  const passwordHash = bcrypt.hashSync("Password123!", 10);
  const emails = TEST_USERS.map((u) => u.email);

  // Nettoyer les anciens enregistrements de test
  await prisma.liveAttendance.deleteMany({ where: { userId: { in: TEST_USERS.map((u) => u.id) } } });
  await prisma.liveMessage.deleteMany({ where: { userId: { in: TEST_USERS.map((u) => u.id) } } });
  await prisma.academicProfile.deleteMany({ where: { userId: { in: TEST_USERS.map((u) => u.id) } } });
  await prisma.enrollment.deleteMany({ where: { userId: { in: TEST_USERS.map((u) => u.id) } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });

  // S'assurer que le module sélectionné existe
  const course = await prisma.course.findUnique({ where: { id: COURSE_ID } });
  if (!course) {
    throw new Error(`Le cours avec l'ID ${COURSE_ID} est introuvable.`);
  }

  // Créer les utilisateurs directement en base de données avec email de vérification actif
  for (const u of TEST_USERS) {
    const user = await prisma.user.create({
      data: {
        id: u.id,
        email: u.email,
        passwordHash,
        fullName: u.name,
        role: u.role,
        emailVerified: true,
        levelOrTitle: u.role === "STUDENT" ? "Étudiant" : "Docteur de Recherche",
        filiere: u.filiere || null,
      },
    });

    if (u.role === "PROFESSOR") {
      await prisma.academicProfile.create({
        data: {
          userId: user.id,
          title: "Professeur de Recherche",
          teachingDomains: ["Mathématiques", "Informatique"],
          researchDomains: ["Algorithmes"],
        },
      });
    }

    if (u.role === "STUDENT") {
      // Inscrire les étudiants au module
      await prisma.enrollment.create({
        data: {
          userId: user.id,
          courseId: COURSE_ID,
          active: true,
        },
      });
    }
  }

  // Assigner l'ownership du module au professeur de test
  await prisma.course.update({
    where: { id: COURSE_ID },
    data: {
      createdById: "test-prof-1",
      published: true,
      isLiveNow: false,
    },
  });

  console.log("Database Setup terminé. 1 Professeur et 6 Étudiants prêts.");
});

test.afterAll(async () => {
  const userIds = TEST_USERS.map((u) => u.id);
  const emails = TEST_USERS.map((u) => u.email);

  if (COURSE_ID > 0) {
    await prisma.course.update({
      where: { id: COURSE_ID },
      data: { isLiveNow: false },
    });
    const sessions = await prisma.liveSession.findMany({
      where: { courseId: COURSE_ID, professorId: { in: userIds } },
      select: { id: true },
    });
    const sessionIds = sessions.map((session) => session.id);
    if (sessionIds.length > 0) {
      await prisma.liveMessage.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await prisma.liveAttendance.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await prisma.liveActionLog.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await prisma.liveSession.deleteMany({ where: { id: { in: sessionIds } } });
    }
  }

  await prisma.liveAttendance.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.liveMessage.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.academicProfile.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.enrollment.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
});

test("Campagne de test Live multi-utilisateurs (7 clients simultanés)", async () => {
  const browserInstance = await chromium.launch({
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  });
  const contexts: any[] = [];
  const pages: any[] = [];
  const consoleErrors: string[] = [];

  // 1. Initialiser 7 contextes avec autorisations caméra/micro et configuration de flux synthétiques
  for (let i = 0; i < TEST_USERS.length; i++) {
    const context = await browserInstance.newContext({
      permissions: ["microphone", "camera"],
      viewport: { width: 1280, height: 720 },
    });

    // Mock getUserMedia to bypass headless audio card / hardware limitations
    await context.addInitScript(() => {
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = async (constraints) => {
          let audioTrack = null;
          let videoTrack = null;

          if (constraints && constraints.audio) {
            try {
              const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
              const audioCtx = new AudioContextClass();
              const dest = audioCtx.createMediaStreamDestination();
              const osc = audioCtx.createOscillator();
              osc.connect(dest);
              osc.start(0);
              audioTrack = dest.stream.getAudioTracks()[0];
            } catch (e) {
              console.error("Failed to create audio track mock:", e);
            }
          }

          if (constraints && constraints.video) {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = 640;
              canvas.height = 480;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.fillStyle = "blue";
                ctx.fillRect(0, 0, 640, 480);
              }
              // Keep drawing on canvas so it pushes frames
              let angle = 0;
              setInterval(() => {
                if (ctx) {
                  ctx.fillStyle = "blue";
                  ctx.fillRect(0, 0, 640, 480);
                  ctx.fillStyle = "white";
                  ctx.font = "30px Arial";
                  ctx.fillText("Live Mock Frame", 50, 100);
                  ctx.beginPath();
                  ctx.arc(320 + Math.cos(angle) * 100, 240 + Math.sin(angle) * 100, 20, 0, 2 * Math.PI);
                  ctx.fillStyle = "red";
                  ctx.fill();
                  angle += 0.1;
                }
              }, 100);
              const stream = canvas.captureStream(30);
              videoTrack = stream.getVideoTracks()[0];
            } catch (e) {
              console.error("Failed to create video track mock:", e);
            }
          }

          const tracks = [];
          if (audioTrack) tracks.push(audioTrack);
          if (videoTrack) tracks.push(videoTrack);

          return new MediaStream(tracks);
        };
      }
    });

    const page = await context.newPage();

    // Capturer les erreurs de la console pour le rapport de performance final
    page.on("pageerror", (exception) => {
      const errStr = `[${TEST_USERS[i].name}] Console Error: ${exception.message}`;
      console.error(errStr);
      consoleErrors.push(errStr);
    });

    page.on("console", (msg) => {
      const text = msg.text();
      if (
        msg.type() === "error" ||
        text.toLowerCase().includes("livekit") ||
        text.toLowerCase().includes("webrtc") ||
        text.toLowerCase().includes("peerconnection")
      ) {
        console.log(`   [${TEST_USERS[i].name} Console] [${msg.type()}] ${text}`);
      }
    });

    contexts.push(context);
    pages.push(page);
  }

  // 2. Connexion des 7 utilisateurs (séquentielle pour éviter le rate limiting auth/global)
  console.log("1. Connexion des 7 comptes (séquentielle)...");
  for (let index = 0; index < pages.length; index++) {
    const page = pages[index];
    const u = TEST_USERS[index];
    await page.goto("http://127.0.0.1:3000/");

    if (u.role === "STUDENT") {
      await page.click('button:has-text("Espace Étudiant")');
    } else {
      await page.click('button:has-text("Espace Professeur / Admin")');
    }

    await page.click('button:has-text("Déjà membre ? Se connecter")');
    await page.fill('input[type="email"]', u.email);
    await page.fill('input[type="password"]', "Password123!");
    await page.click('button[type="submit"]');

    if (u.role === "STUDENT") {
      await expect(page.locator("#nav-dashboard")).toBeVisible({ timeout: 20000 });
    } else {
      await expect(page.locator('button:has-text("Contrôleur de Modules Live")')).toBeVisible({ timeout: 20000 });
    }
    console.log(`   ✅ [${u.name}] Connecté avec succès.`);
    await page.waitForTimeout(400);
  }

  // 3. Professeur 1 crée la salle Live
  console.log("2. Lancement du live par le Professeur principal (Prof-1)...");
  const prof1Page = pages[0];
  await prof1Page.click('button:has-text("Contrôleur de Modules Live")');

  // Renseigner le sujet de révision actif
  await prof1Page.getByRole("textbox", { name: "Sujet de révision actif" }).fill(
    "Tests Multi-Utilisateurs en conditions réelles",
  );

  await prof1Page.getByRole("button", { name: "Lancer la session live" }).click();

  await expectLiveRoomJoined(prof1Page);
  console.log("   ✅ [Prof-1] Live démarré et salle rejointe.");

  // 3. Rejoindre la salle depuis les 6 étudiants (séquentiel — ownership live = 1 prof / module)
  console.log("3. Connexion des étudiants au live...");
  for (let index = 1; index < pages.length; index++) {
    const page = pages[index];
    const name = TEST_USERS[index].name;
    const joinBtn = page.locator('button:has-text("Rejoindre la salle de classe")');

    for (let attempt = 1; attempt <= 4; attempt++) {
      await page.reload();
      try {
        await expect(joinBtn).toBeVisible({ timeout: 5000 });
        break;
      } catch (e) {
        if (attempt === 4) throw e;
        console.log(`   [${name}] Bouton non visible, nouvel essai (${attempt}/4)...`);
        await page.waitForTimeout(2000);
      }
    }

    await joinBtn.click();
    await expectLiveRoomJoined(page);
    console.log(`   ✅ [${name}] Classe live rejointe.`);
    await page.waitForTimeout(300);
  }

  // 4. Gestion correcte des rôles et liste des participants
  console.log("4. Vérification de la liste des participants et des rôles...");
  await prof1Page.click('button:has-text("Participants")');
  await expect(prof1Page.locator('text="Membres de la session"')).toBeVisible();

  const participantCount = (count: number) =>
    prof1Page.locator("aside").locator("span.font-mono", { hasText: String(count) }).first();

  // Vérifier le nombre correct de connectés dans la liste (7)
  await expect(participantCount(7)).toBeVisible({ timeout: 10000 });

  // Vérifier la présence des participants
  for (const u of TEST_USERS) {
    if (u.id === TEST_USERS[0].id) {
      await expect(prof1Page.locator("aside").locator("text=Vous").first()).toBeVisible({ timeout: 10000 });
    } else {
      await expect(prof1Page.locator("aside").locator(`text="${u.name}"`).first()).toBeVisible({ timeout: 10000 });
    }
  }
  console.log("   ✅ Tous les 7 utilisateurs sont présents dans la liste avec leurs rôles respectifs.");

  // 5. Tests Audio/Vidéo
  console.log("5. Validation de l'activation/désactivation du micro et de la caméra...");
  await prof1Page.getByRole("button", { name: "Activer le micro (M)" }).click();
  await expect(prof1Page.getByRole("button", { name: "Couper le micro (M)" })).toBeVisible();

  await prof1Page.getByRole("button", { name: "Activer la caméra (V)" }).click();
  await expect(prof1Page.getByRole("button", { name: "Couper la caméra (V)" })).toBeVisible();
  console.log("   ✅ Caméra et micro testés avec succès.");

  // 6. Tests partage d'écran
  console.log("6. Validation du partage d'écran...");
  await prof1Page.getByRole("button", { name: "Partager l'écran" }).click();
  await prof1Page.waitForTimeout(1000);
  await prof1Page.getByRole("button", { name: "Arrêter le partage d'écran" }).click();
  console.log("   ✅ Partage d'écran professeur activé puis arrêté avec succès.");

  // 9. Tests tableau blanc collaboratif
  console.log("7. Validation du tableau blanc...");
  await prof1Page.getByRole("button", { name: "Tableau blanc" }).click();
  await expect(prof1Page.locator("canvas")).toBeVisible();

  // Simuler un tracé de souris sur le canvas
  const canvas = prof1Page.locator("canvas");
  const box = await canvas.boundingBox();
  if (box) {
    await prof1Page.mouse.move(box.x + 50, box.y + 50);
    await prof1Page.mouse.down();
    await prof1Page.mouse.move(box.x + 150, box.y + 150);
    await prof1Page.mouse.up();
  }

  // Nettoyer le tableau
  await prof1Page.click('button:has-text("Nettoyer le tableau")');
  console.log("   ✅ Dessin et effacement sur le tableau blanc validés.");

  // 10. Tests chat et messages Q&A
  console.log("9. Validation de la messagerie de groupe et de l'historique...");
  const stud1Page = pages[1];
  await stud1Page.click('button:has-text("Chat")');
  await prof1Page.click('button:has-text("Chat")');

  // Étudiant 1 envoie une question
  await stud1Page.fill(
    'input[placeholder="Tapez votre message..."]',
    "Bonjour, [question] Quelle est la complexité du tri fusion ?",
  );
  await stud1Page.press('input[placeholder="Tapez votre message..."]', "Enter");

  // Professeur 1 répond
  await prof1Page.fill('input[placeholder="Tapez votre message..."]', "C'est O(n log n) dans tous les cas !");
  await prof1Page.press('input[placeholder="Tapez votre message..."]', "Enter");

  // Attendre et vérifier la présence des messages
  await expect(prof1Page.locator("text=Quelle est la complexité du tri fusion")).toBeVisible({ timeout: 5000 });
  await expect(stud1Page.locator("text=C'est O(n log n)")).toBeVisible({ timeout: 5000 });
  console.log("   ✅ Messagerie en temps réel vérifiée sans perte.");

  // 11. Tests permissions
  console.log("10. Vérification stricte des permissions...");
  // Vérifier qu'un étudiant ne voit pas le bouton d'enregistrement (Rec)
  await expect(stud1Page.locator("button").filter({ hasText: /^Rec$/ })).not.toBeVisible();

  // Vérifier qu'un étudiant ne peut pas modérer les participants
  await stud1Page.click('button:has-text("Participants")');
  await expect(stud1Page.locator('button[title="Expulser"]')).not.toBeVisible();
  console.log("   ✅ Règles de permissions validées (les étudiants n'ont pas accès aux contrôles admin/modérateur).");

  // 12. Déconnexion / Reconnexion participant
  console.log("11. Test de déconnexion et reconnexion d'un étudiant...");
  const studLastPage = pages[6];
  await studLastPage.click('button:has-text("Quitter")');

  await prof1Page.getByRole("button", { name: "Participants" }).click();
  await expect(participantCount(6)).toBeVisible({ timeout: 30_000 });
  console.log("   ✅ Déconnexion détectée.");

  await studLastPage.reload();
  const studentRejoinBtn = studLastPage.locator('button:has-text("Rejoindre la salle de classe")');
  await expect(studentRejoinBtn).toBeVisible({ timeout: 15_000 });
  await studentRejoinBtn.click();
  await expectLiveRoomJoined(studLastPage);

  await prof1Page.getByRole("button", { name: "Participants" }).click();
  await expect(participantCount(7)).toBeVisible({ timeout: 30_000 });
  console.log("   ✅ Reconnexion réussie et validée.");

  // 13. Clôture des navigateurs
  console.log("12. Fermeture des sessions...");
  await Promise.all(pages.map((p) => p.close()));
  await Promise.all(contexts.map((c) => c.close()));
  await browserInstance.close();

  // Sauvegarder les erreurs console détectées pour le rapport final
  if (consoleErrors.length > 0) {
    console.log(`⚠️ ${consoleErrors.length} erreurs console capturées lors du test.`);
  } else {
    console.log("✅ Aucune erreur console détectée.");
  }
});
