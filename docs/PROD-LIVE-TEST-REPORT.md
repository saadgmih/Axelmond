# Rapport — Test live production Playwright (3 runs)

Généré le : 2026-07-11T05:03:22.405Z
URL : https://axelmond.com

## Contraintes respectées

- Comptes dédiés via variables `AXELMOND_LIVE_*` (aucun identifiant dans le code)
- Module de test via `AXELMOND_LIVE_TEST_COURSE_ID` ou `AXELMOND_LIVE_TEST_COURSE_TITLE`
- Faux média caméra/micro (Chrome flags + mock getUserMedia)
- Pas de désactivation rate limiting / ACL / sécurité
- Nettoyage UI : fin du live en fin de test (+ hook best-effort)
- Emails masqués dans logs et captures

## Résultats par run

### Run 1 — PASS

- **Durée** : 38.6s
- **Code sortie** : 0
- **Étapes vérifiées** :
  - 1. Connexion professeur
  - 2. Connexion étudiant
  - 3. Ouverture console live + sélection module de test
  - 4. Saisie sujet + lancement session live
  - 5. Détection live côté étudiant
  - 6. Connexion étudiant à la salle
  - 7. Vérification liste participants (2)
  - 8. Activation/désactivation micro et caméra (prof)
  - 9. Envoi/réception message chat
  - 10. Déconnexion puis reconnexion étudiant
  - 11. Fin du live par le professeur
  - 12. Vérification disparition live côté étudiant
  - 13. Vérification statut final session (Hors ligne)
  - 14. Replay ignoré (AXELMOND_LIVE_EXPECT_REPLAY ≠ true)
  - 15. Nettoyage UI terminé (live arrêté)
- **Erreurs console** : 5
  - `[prof] Failed to load resource: the server responded with a status of 403 ()`
  - `[prof] Failed to load resource: the server responded with a status of 403 ()`
  - `[prof] Failed to load resource: the server responded with a status of 403 ()`
  - `[prof] Failed to load resource: the server responded with a status of 403 ()`
  - `[student] Failed to load resource: the server responded with a status of 403 ()`
- **Erreurs page** : 1
- **Réponses HTTP 4xx** : 2
  - 403 POST https://axelmond.com/api/auth/refresh
  - 403 POST https://axelmond.com/api/auth/refresh
- **Réponses HTTP 5xx** : 0
- **Traces** : `test-results/prod-live-run-1/trace-prof.zip`, `trace-student.zip`
- **Captures** : `test-results/prod-live-run-1/final-*.png`

### Run 2 — PASS

- **Durée** : 40.3s
- **Code sortie** : 0
- **Étapes vérifiées** :
  - 1. Connexion professeur
  - 2. Connexion étudiant
  - 3. Ouverture console live + sélection module de test
  - 4. Saisie sujet + lancement session live
  - 5. Détection live côté étudiant
  - 6. Connexion étudiant à la salle
  - 7. Vérification liste participants (2)
  - 8. Activation/désactivation micro et caméra (prof)
  - 9. Envoi/réception message chat
  - 10. Déconnexion puis reconnexion étudiant
  - 11. Fin du live par le professeur
  - 12. Vérification disparition live côté étudiant
  - 13. Vérification statut final session (Hors ligne)
  - 14. Replay ignoré (AXELMOND_LIVE_EXPECT_REPLAY ≠ true)
  - 15. Nettoyage UI terminé (live arrêté)
- **Erreurs console** : 5
  - `[prof] Failed to load resource: the server responded with a status of 403 ()`
  - `[prof] Failed to load resource: the server responded with a status of 403 ()`
  - `[prof] Failed to load resource: the server responded with a status of 403 ()`
  - `[prof] Failed to load resource: the server responded with a status of 403 ()`
  - `[student] Failed to load resource: the server responded with a status of 403 ()`
- **Erreurs page** : 1
- **Réponses HTTP 4xx** : 2
  - 403 POST https://axelmond.com/api/auth/refresh
  - 403 POST https://axelmond.com/api/auth/refresh
- **Réponses HTTP 5xx** : 0
- **Traces** : `test-results/prod-live-run-2/trace-prof.zip`, `trace-student.zip`
- **Captures** : `test-results/prod-live-run-2/final-*.png`

### Run 3 — PASS

- **Durée** : 40.1s
- **Code sortie** : 0
- **Étapes vérifiées** :
  - 1. Connexion professeur
  - 2. Connexion étudiant
  - 3. Ouverture console live + sélection module de test
  - 4. Saisie sujet + lancement session live
  - 5. Détection live côté étudiant
  - 6. Connexion étudiant à la salle
  - 7. Vérification liste participants (2)
  - 8. Activation/désactivation micro et caméra (prof)
  - 9. Envoi/réception message chat
  - 10. Déconnexion puis reconnexion étudiant
  - 11. Fin du live par le professeur
  - 12. Vérification disparition live côté étudiant
  - 13. Vérification statut final session (Hors ligne)
  - 14. Replay ignoré (AXELMOND_LIVE_EXPECT_REPLAY ≠ true)
  - 15. Nettoyage UI terminé (live arrêté)
- **Erreurs console** : 5
  - `[prof] Failed to load resource: the server responded with a status of 403 ()`
  - `[prof] Failed to load resource: the server responded with a status of 403 ()`
  - `[prof] Failed to load resource: the server responded with a status of 403 ()`
  - `[prof] Failed to load resource: the server responded with a status of 403 ()`
  - `[student] Failed to load resource: the server responded with a status of 403 ()`
- **Erreurs page** : 1
- **Réponses HTTP 4xx** : 2
  - 403 POST https://axelmond.com/api/auth/refresh
  - 403 POST https://axelmond.com/api/auth/refresh
- **Réponses HTTP 5xx** : 0
- **Traces** : `test-results/prod-live-run-3/trace-prof.zip`, `trace-student.zip`
- **Captures** : `test-results/prod-live-run-3/final-*.png`

## Verdict global

**3/3 PASS** — critères automatisés satisfaits.

## Test manuel réel (à exécuter par un humain)

Voir `docs/PROD-LIVE-REAL-MANUAL.md` pour la checklist prof PC + étudiant mobile.
