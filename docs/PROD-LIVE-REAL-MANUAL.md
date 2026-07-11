# Test manuel réel — Live production

Checklist à exécuter **par un humain** après validation des 3 runs Playwright automatisés.

## Matériel

| Rôle | Appareil | Média |
|------|----------|-------|
| Professeur | PC (Chrome/Edge récent) | Vraie caméra + vrai micro |
| Étudiant | Téléphone **ou** second PC | Vraie caméra + vrai micro |

## Comptes

- Utiliser les **comptes de test dédiés** (mêmes variables `AXELMOND_LIVE_*` que l'automatisation).
- Ne pas partager les identifiants dans un chat public ; les faire tourner après la campagne QA.

## Module

- Module de test dédié (`AXELMOND_LIVE_TEST_COURSE_ID` / titre) — non visible aux vrais utilisateurs si possible.
- L'étudiant doit être **inscrit** à ce module.

---

## Parcours

### 1. Préparation prof (PC)

- [ ] Connexion espace professeur sur https://axelmond.com
- [ ] Ouvrir **Contrôleur de Modules Live**
- [ ] Sélectionner le module de test
- [ ] Saisir un sujet identifiable (ex. `[MANUAL-QA] …`)
- [ ] Autoriser caméra + micro quand le navigateur le demande

### 2. Lancement live

- [ ] Cliquer **Lancer la session live**
- [ ] Vérifier entrée dans la salle (bouton Participants visible)
- [ ] Activer micro et caméra — vérifier retour local (aperçu)

### 3. Étudiant rejoint (mobile / autre PC)

- [ ] Connexion espace étudiant
- [ ] Vérifier apparition **Rejoindre la salle de classe**
- [ ] Rejoindre — autoriser caméra/micro
- [ ] Côté prof : **Participants = 2**

### 4. Partage d'écran (prof)

- [ ] **Partager l'écran** — choisir une fenêtre/écran
- [ ] Côté étudiant : vérifier que le partage est visible
- [ ] **Arrêter le partage d'écran**

### 5. Chat

- [ ] Étudiant envoie un message
- [ ] Prof reçoit et répond
- [ ] Étudiant voit la réponse

### 6. Coupure Wi-Fi (étudiant)

- [ ] Couper le Wi-Fi (ou mode avion) sur l'appareil étudiant ~15 s
- [ ] Réactiver le réseau
- [ ] Vérifier reconnexion automatique ou bouton **Rejoindre** à nouveau
- [ ] Côté prof : participant de nouveau compté (2)

### 7. Fin du live (prof)

- [ ] **Éteindre le live** depuis la console
- [ ] Vérifier badge **Hors ligne**
- [ ] Côté étudiant : le live **disparaît** (pas de bouton rejoindre)

### 8. Replay (si enregistrement activé)

- [ ] Attendre traitement rediffusion (peut prendre 1–3 min)
- [ ] Prof → **Gestion des Contenus** → vérifier **Rediffusion live** / entrée rediffusion
- [ ] Publier si nécessaire et vérifier lecture côté étudiant inscrit

---

## Critères de succès

- Aucun crash navigateur
- Audio/vidéo bidirectionnels perceptibles
- Partage d'écran visible côté étudiant
- Reconnexion après coupure réseau sans bloquer la session prof
- Fin de live propre des deux côtés
- Replay présent **uniquement** si l'enregistrement était activé

## Nettoyage

- [ ] Live arrêté
- [ ] Pas de session live orpheline sur le module de test
- [ ] Messages de test identifiables (`[MANUAL-QA]`) — optionnel : supprimer via interface admin si disponible

## Rapport

Noter dans `docs/PROD-LIVE-TEST-REPORT.md` (section manuelle) :

- Date / heure
- Appareils utilisés
- Résultat global PASS/FAIL
- Anomalies éventuelles (sans coller d'identifiants)
