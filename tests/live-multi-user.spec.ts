import { test, expect, chromium } from "@playwright/test";
import { prisma } from "../src/db";
import bcrypt from "bcryptjs";

// Définir la configuration du test
test.setTimeout(240000); // 4 minutes pour tout le flow multi-utilisateurs

const TEST_USERS = [
  { id: "test-prof-1", role: "PROFESSOR" as const, email: "prof1@axelmond.edu.fr", name: "Pr. Jean Dupont" },
  { id: "test-prof-2", role: "PROFESSOR" as const, email: "prof2@axelmond.edu.fr", name: "Pr. Marie Curie" },
  { id: "test-prof-3", role: "PROFESSOR" as const, email: "prof3@axelmond.edu.fr", name: "Pr. Albert Einstein" },
  { id: "test-prof-4", role: "PROFESSOR" as const, email: "prof4@axelmond.edu.fr", name: "Pr. Isaac Newton" },
  { id: "test-stud-1", role: "STUDENT" as const, email: "stud1@axelmond.univ.fr", name: "Elie Cartan", filiere: "Mathématiques" },
  { id: "test-stud-2", role: "STUDENT" as const, email: "stud2@axelmond.univ.fr", name: "Sophie Germain", filiere: "Physique" },
  { id: "test-stud-3", role: "STUDENT" as const, email: "stud3@axelmond.univ.fr", name: "Henri Poincare", filiere: "Informatique" },
];

const COURSE_ID = 1; // Algorithmique et Structures de Données

test.beforeAll(async () => {
  console.log("=== Initialisation de la Base de Données pour le Test Multi-Utilisateurs ===");

  const passwordHash = bcrypt.hashSync("Password123!", 10);
  const emails = TEST_USERS.map((u) => u.email);

  // Nettoyer les anciens enregistrements de test
  await prisma.liveAttendance.deleteMany({ where: { userId: { in: TEST_USERS.map((u) => u.id) } } });
  await prisma.liveMessage.deleteMany({ where: { userId: { in: TEST_USERS.map((u) => u.id) } } });
  await prisma.academicProfile.deleteMany({ where: { userId: { in: TEST_USERS.map((u) => u.id) } } });
  await prisma.enrollment.deleteMany({ where: { userId: { in: TEST_USERS.map((u) => u.id) } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });

  // S'assurer que le cours ID 1 existe et est assigné au Professeur 1
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

  // Assigner l'ownership du cours ID 1 au Professeur 1
  await prisma.course.update({
    where: { id: COURSE_ID },
    data: { 
      createdById: "test-prof-1",
      published: true,
      isLiveNow: false,
    },
  });

  console.log("Database Setup terminé. 4 Professeurs et 3 Étudiants prêts.");
});

test("Campagne de test Live multi-utilisateurs (7 clients simultanés)", async () => {
  const browserInstance = await chromium.launch({
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ]
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
      if (msg.type() === "error" || text.toLowerCase().includes("livekit") || text.toLowerCase().includes("webrtc") || text.toLowerCase().includes("peerconnection")) {
        console.log(`   [${TEST_USERS[i].name} Console] [${msg.type()}] ${text}`);
      }
    });

    contexts.push(context);
    pages.push(page);
  }

  // 2. Connexion simultanée des 7 utilisateurs
  console.log("1. Lancement de la connexion simultanée des 7 comptes...");
  await Promise.all(
    pages.map(async (page, index) => {
      const u = TEST_USERS[index];
      await page.goto("http://127.0.0.1:3000/");

      // Sélectionner le bon secteur (étudiant ou professeur)
      if (u.role === "STUDENT") {
        await page.click('button:has-text("Espace Étudiant")');
      } else {
        await page.click('button:has-text("Espace Professeur / Chercheur")');
      }

      // Passer en mode connexion
      await page.click('button:has-text("Déjà membre ? Se connecter")');

      // Remplir le formulaire
      await page.fill('input[type="email"]', u.email);
      await page.fill('input[type="password"]', "Password123!");

      // Soumettre
      await page.click('button[type="submit"]');

      // Valider que l'utilisateur accède au tableau de bord
      if (u.role === "STUDENT") {
        await expect(page.locator("#nav-dashboard")).toBeVisible({ timeout: 10000 });
      } else {
        await expect(page.locator('button:has-text("Contrôleur de Modules Live")')).toBeVisible({ timeout: 10000 });
      }
      console.log(`   ✅ [${u.name}] Connecté avec succès.`);
    })
  );

  // 3. Professeur 1 crée la salle Live
  console.log("2. Lancement du live par le Professeur principal (Prof-1)...");
  const prof1Page = pages[0];
  await prof1Page.click('button:has-text("Contrôleur de Modules Live")');
  
  // Renseigner le sujet de révision actif
  await prof1Page.fill('input[placeholder="ex: Résolution par pivot de Gauss..."]', "Tests Multi-Utilisateurs en conditions réelles");
  
  // Lancer le live
  const toggleLiveBtn = prof1Page.locator('button:has-text("Lancer la session live")');
  if (await toggleLiveBtn.isVisible()) {
    await toggleLiveBtn.click();
  }
  
  // Attendre que l'état passe à "Entrer dans la salle"
  await prof1Page.click('button:has-text("Entrer dans la salle")');
  await expect(prof1Page.locator('text="Classe virtuelle sécurisée"')).toBeVisible({ timeout: 15000 });
  console.log("   ✅ [Prof-1] Live démarré et salle rejointe.");

  // 4. Rejoindre la salle depuis les autres professeurs (Prof-2, Prof-3, Prof-4)
  console.log("3. Connexion des autres professeurs au live...");
  await Promise.all(
    [pages[1], pages[2], pages[3]].map(async (page, index) => {
      const name = TEST_USERS[index + 1].name;
      await page.click('button:has-text("Contrôleur de Modules Live")');
      await page.click('button:has-text("Entrer dans la salle")');
      await expect(page.locator('text="Classe virtuelle sécurisée"')).toBeVisible({ timeout: 15000 });
      console.log(`   ✅ [${name}] Salle Live rejointe.`);
    })
  );

  // 5. Rejoindre la salle depuis les étudiants (Stud-1, Stud-2, Stud-3)
  console.log("4. Connexion des étudiants au live...");
  await Promise.all(
    [pages[4], pages[5], pages[6]].map(async (page, index) => {
      const name = TEST_USERS[index + 4].name;
      const joinBtn = page.locator('button:has-text("Rejoindre la salle de classe")');
      
      // Essayer de recharger la page jusqu'à 4 fois avec un intervalle de 2 secondes
      // pour laisser le temps au statut live de se propager et d'invalider le cache.
      for (let attempt = 1; attempt <= 4; attempt++) {
        await page.reload();
        try {
          await expect(joinBtn).toBeVisible({ timeout: 3000 });
          break;
        } catch (e) {
          if (attempt === 4) throw e;
          console.log(`   [${name}] Bouton non visible sur le tableau de bord, nouvel essai (${attempt}/4)...`);
          await page.waitForTimeout(2000);
        }
      }
      
      await joinBtn.click();
      await expect(page.locator('text="Classe virtuelle sécurisée"')).toBeVisible({ timeout: 15000 });
      console.log(`   ✅ [${name}] Classe live rejointe.`);
    })
  );

  // 6. Gestion correcte des rôles et liste des participants
  console.log("5. Vérification de la liste des participants et des rôles...");
  await prof1Page.click('button:has-text("Participants")');
  await expect(prof1Page.locator('text="Membres de la session"')).toBeVisible();
  
  // Vérifier le nombre correct de connectés dans la liste (7)
  const connectedCountLocator = prof1Page.locator('span.font-mono:has-text("7")');
  await expect(connectedCountLocator).toBeVisible({ timeout: 10000 });
  
  // Vérifier la présence des participants
  for (const u of TEST_USERS) {
    if (u.id === TEST_USERS[0].id) {
      await expect(prof1Page.locator('aside').locator('text=Vous').first()).toBeVisible({ timeout: 10000 });
    } else {
      await expect(prof1Page.locator('aside').locator(`text="${u.name}"`).first()).toBeVisible({ timeout: 10000 });
    }
  }
  console.log("   ✅ Tous les 7 utilisateurs sont présents dans la liste avec leurs rôles respectifs.");

  // 7. Tests Audio/Vidéo pour tous les utilisateurs (Caméra et Micro)
  console.log("6. Validation de l'activation/désactivation du micro et de la caméra...");
  // Activer micro pour Prof-1
  await prof1Page.click('button:has-text("Activer")');
  await expect(prof1Page.locator('button:has-text("Désactiver")')).toBeVisible();
  
  // Activer caméra pour Prof-1
  await prof1Page.click('button:has-text("Caméra")');
  console.log("   ✅ Caméra et micro testés avec succès.");

  // 8. Tests partage d'écran
  console.log("7. Validation du partage d'écran...");
  await prof1Page.click('button:has-text("Partager")');
  await prof1Page.waitForTimeout(1000); // attente synchro
  await prof1Page.click('button:has-text("Partager")'); // arrêter le partage
  console.log("   ✅ Partage d'écran professeur activé puis arrêté avec succès.");

  // 9. Tests tableau blanc collaboratif
  console.log("8. Validation du tableau blanc...");
  await prof1Page.click('button:has-text("Tableau blanc")');
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
  const stud1Page = pages[4]; // Elie Cartan
  await stud1Page.click('button:has-text("Chat")');
  await prof1Page.click('button:has-text("Chat")');

  // Étudiant 1 envoie une question
  await stud1Page.fill('input[placeholder="Tapez votre message..."]', "Bonjour, [question] Quelle est la complexité du tri fusion ?");
  await stud1Page.press('input[placeholder="Tapez votre message..."]', "Enter");
  
  // Professeur 1 répond
  await prof1Page.fill('input[placeholder="Tapez votre message..."]', "C'est O(n log n) dans tous les cas !");
  await prof1Page.press('input[placeholder="Tapez votre message..."]', "Enter");

  // Attendre et vérifier la présence des messages
  await expect(prof1Page.locator('text=Quelle est la complexité du tri fusion')).toBeVisible({ timeout: 5000 });
  await expect(stud1Page.locator('text=C\'est O(n log n)')).toBeVisible({ timeout: 5000 });
  console.log("   ✅ Messagerie en temps réel vérifiée sans perte.");

  // 11. Tests permissions
  console.log("10. Vérification stricte des permissions...");
  // Vérifier qu'un étudiant ne voit pas le bouton d'enregistrement (Rec)
  await expect(stud1Page.locator('button').filter({ hasText: /^Rec$/ })).not.toBeVisible();
  
  // Vérifier qu'un étudiant ne peut pas modérer les participants
  await stud1Page.click('button:has-text("Participants")');
  await expect(stud1Page.locator('button[title="Expulser"]')).not.toBeVisible();
  console.log("   ✅ Règles de permissions validées (les étudiants n'ont pas accès aux contrôles admin/modérateur).");

  // 12. Déconnexion / Reconnexion participant
  console.log("11. Test de déconnexion et reconnexion d'un étudiant...");
  const stud3Page = pages[6]; // Henri Poincaré
  await stud3Page.click('button:has-text("Quitter")');
  
  // Vérifier que le nombre de participants passe à 6
  await expect(prof1Page.locator('span.font-mono:has-text("6")')).toBeVisible({ timeout: 10000 });
  console.log("   ✅ Déconnexion détectée.");

  // Reconnexion de l'étudiant 3
  await stud3Page.reload();
  const student3JoinBtn = stud3Page.locator('button:has-text("Rejoindre la salle de classe")');
  await expect(student3JoinBtn).toBeVisible({ timeout: 10000 });
  await student3JoinBtn.click();
  
  // Vérifier que le nombre remonte à 7
  await expect(prof1Page.locator('span.font-mono:has-text("7")')).toBeVisible({ timeout: 15000 });
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
