# Checklist manuelle production — axelmond.com

> **Ne pas committer les mots de passe.** Utiliser des variables d'environnement ou un gestionnaire de secrets.

## Prérequis

```powershell
$env:AXELMOND_BASE_URL = "https://axelmond.com"
$env:AXELMOND_STUDENT_EMAIL = "..."
$env:AXELMOND_STUDENT_PASSWORD = "..."
$env:AXELMOND_PROF_EMAIL = "..."
$env:AXELMOND_PROF_PASSWORD = "..."
$env:AXELMOND_ADMIN_EMAIL = "..."
$env:AXELMOND_ADMIN_PASSWORD = "..."
```

Automatisation partielle :

```powershell
npx playwright test tests/manual-prod-journey.spec.ts --reporter=line
```

### Test live production (automatisé — 2026-07-11)

```powershell
$env:AXELMOND_LIVE_TEST_COURSE_ID = "2"   # Programmation en C++ (module commun prof/étudiant)
npm run test:prod-live                     # 3 runs consécutifs + rapport
```

Variables : `AXELMOND_LIVE_PROF_*` / `AXELMOND_LIVE_STUDENT_*` (ou fallback `AXELMOND_PROF_*` / `AXELMOND_STUDENT_*`).

| Run | Durée | Résultat | Étapes |
|-----|-------|----------|--------|
| 1 | ~39s | **PASS** | 15/15 (live, participants, micro/cam, chat, reconnexion, fin) |
| 2 | ~40s | **PASS** | 15/15 |
| 3 | ~40s | **PASS** | 15/15 |

Rapport détaillé : `docs/PROD-LIVE-TEST-REPORT.md`  
Traces : `test-results/prod-live-run-{1,2,3}/trace-*.zip`

Erreurs connues non bloquantes : `403` sur `/api/auth/refresh` en contexte Playwright headless (cookies refresh path `/api/auth`).

Replay : non vérifié (`AXELMOND_LIVE_EXPECT_REPLAY` non défini).

---

## Étudiant (ordinateur)

| # | Action | OK | Notes |
|---|--------|----|-------|
| 1 | Connexion | ☐ | Pas d'alerte rate limit |
| 2 | Tableau de bord `#nav-dashboard` | ☐ | |
| 3 | Catalogue → ouvrir un module | ☐ | |
| 4 | Vidéo / PDF / image dans un cours | ☐ | |
| 5 | Progression visible | ☐ | |
| 6 | Profil | ☐ | |
| 7 | Notifications | ☐ | |
| 8 | Déconnexion | ☐ | |

## Étudiant (téléphone 375px)

| # | Action | OK | Notes |
|---|--------|----|-------|
| 1 | Connexion responsive | ☐ | |
| 2 | Catalogue utilisable | ☐ | |
| 3 | Cours lisible | ☐ | |

## Professeur (autre appareil / session)

| # | Action | OK | Notes |
|---|--------|----|-------|
| 1 | Connexion espace professeur | ☐ | |
| 2 | Contrôleur Modules Live | ☐ | |
| 3 | Lancer live | ☐ | |
| 4 | Micro / caméra réels | ☐ | |
| 5 | Partage d'écran | ☐ | |
| 6 | Chat live | ☐ | |
| 7 | Arrêter live | ☐ | |
| 8 | Live disparaît côté étudiant | ☐ | |
| 9 | Replay disponible | ☐ | |

## Administrateur

| # | Action | OK | Notes |
|---|--------|----|-------|
| 1 | Connexion admin | ☐ | |
| 2 | Droits étendus (codes prof, charity, etc.) | ☐ | |
| 3 | Déconnexion | ☐ | |

## Réseau et logs

| # | Action | OK | Notes |
|---|--------|----|-------|
| 1 | Reconnexion après coupure réseau | ☐ | |
| 2 | Console navigateur sans erreur critique | ☐ | |
| 3 | Logs serveur / LiveKit propres | ☐ | |

---

## Résultats automatisés (Playwright prod — 2026-07-11)

Exécution sur **https://axelmond.com** via `tests/manual-prod-journey.spec.ts` (identifiants via variables d'environnement uniquement).

| Parcours | Résultat | Détail |
|----------|----------|--------|
| Étudiant desktop | **PASS** | Connexion, catalogue, déconnexion |
| Étudiant mobile 375px | **PASS** | Dashboard (attente 35 s entre logins même email) |
| Professeur | **PASS** | Console live, gestion contenus, déconnexion |
| Administrateur | **PASS** | Espace staff, section Lajr wa Tawab / admin |

**API login vérifié :** les 3 comptes répondent 200 avec le rôle correct (`STUDENT` / `PROFESSOR` / `ADMIN`).

**Avertissements :**
- 2 erreurs console mineures côté étudiant (CSP inline styles — non bloquant)
- Enchaîner plusieurs logins rapides même email → échec UI ; prévoir **35 s** entre tests ou cookies isolés

### Encore à valider manuellement (humain + matériel réel)

| # | Action | Statut |
|---|--------|--------|
| 1 | Live prof → étudiant rejoint (micro/caméra réels) | ☐ | Automatisé avec faux média : **PASS 3/3** |
| 2 | Partage d'écran réel | ☐ | Voir `docs/PROD-LIVE-REAL-MANUAL.md` |
| 3 | Coupure réseau + reconnexion | ☐ | Automatisé (reload) : **PASS** ; Wi-Fi réel : manuel |
| 4 | Fin live → disparition côté étudiant | ☐ | **PASS 3/3** |
| 5 | Replay après session | ☐ | Manuel si enregistrement activé |
| 6 | Vidéo / PDF dans un module inscrit | ☐ |

**Sécurité :** faire tourner les mots de passe des comptes de test après cette campagne.
