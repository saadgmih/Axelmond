# Checklist validation device — Phase Mobile V2.1

Date : 11 juin 2026  
Prérequis : dev build installé (`npm run build:dev:android` / `build:dev:ios`) + `npx expo start --dev-client`

Compte test : utilisateur inscrit au cours live + cours avec `isLiveNow: true`.

---

## Préparation

| # | Étape | Android | iPhone |
|---|-------|---------|--------|
| P1 | Dev build installé sur l’appareil | ☐ | ☐ |
| P2 | App connectée à l’API (prod ou locale) | ☐ | ☐ |
| P3 | Connexion JWT valide (étudiant ou enseignant) | ☐ | ☐ |
| P4 | Cours live ouvert (`isLiveNow`) | ☐ | ☐ |

---

## Permissions — caméra refusée

| # | Scénario | Résultat attendu | Android | iPhone |
|---|----------|------------------|---------|--------|
| C1 | Refuser la caméra au premier prompt | Message d’erreur + bouton « Réessayer » | ☐ | ☐ |
| C2 | Caméra refusée, micro accordé | Join bloqué tant que caméra non accordée | ☐ | ☐ |
| C3 | Caméra bloquée définitivement | Bouton « Ouvrir les paramètres » visible | ☐ | ☐ |
| C4 | Réactiver caméra dans paramètres OS → Réessayer | Join réussi | ☐ | ☐ |

---

## Permissions — micro refusé

| # | Scénario | Résultat attendu | Android | iPhone |
|---|----------|------------------|---------|--------|
| M1 | Refuser le micro au premier prompt | Message d’erreur + « Réessayer » | ☐ | ☐ |
| M2 | Micro refusé, caméra accordée | Join bloqué tant que micro non accordé | ☐ | ☐ |
| M3 | Micro bloqué définitivement | Bouton « Ouvrir les paramètres » visible | ☐ | ☐ |
| M4 | Réactiver micro dans paramètres OS → Réessayer | Join réussi | ☐ | ☐ |

---

## Join room

| # | Scénario | Résultat attendu | Android | iPhone |
|---|----------|------------------|---------|--------|
| J1 | Détail cours → « Rejoindre le live » | Navigation vers `LiveClassroomScreen` | ☐ | ☐ |
| J2 | Permissions OK | Statut « Connexion… » puis « Connecté » | ☐ | ☐ |
| J3 | Token LiveKit récupéré | Pas d’erreur 401/403 (utilisateur autorisé) | ☐ | ☐ |
| J4 | Liste participants | Au minimum le participant local affiché | ☐ | ☐ |

---

## Audio / vidéo

| # | Scénario | Résultat attendu | Android | iPhone |
|---|----------|------------------|---------|--------|
| A1 | Activer le micro | Indicateur mic ON, audio audible côté autre client | ☐ | ☐ |
| A2 | Désactiver le micro | Mic OFF, plus d’audio local | ☐ | ☐ |
| V1 | Activer la caméra | Tuile vidéo locale visible | ☐ | ☐ |
| V2 | Désactiver la caméra | Tuile vidéo masquée / placeholder | ☐ | ☐ |

---

## Leave room

| # | Scénario | Résultat attendu | Android | iPhone |
|---|----------|------------------|---------|--------|
| L1 | Bouton « Quitter » | Retour écran détail cours | ☐ | ☐ |
| L2 | Après quitter | Statut déconnecté, pas de fuite audio | ☐ | ☐ |
| L3 | Re-join même cours | Nouvelle connexion sans crash | ☐ | ☐ |

---

## Multi-participants

| # | Scénario | Résultat attendu | Android | iPhone |
|---|----------|------------------|---------|--------|
| X1 | 2+ clients dans la même salle | Tous listés dans la bande participants | ☐ | ☐ |
| X2 | Client B active caméra | Tuile vidéo B visible chez client A | ☐ | ☐ |
| X3 | Client B active micro | Audio B audible chez client A | ☐ | ☐ |
| X4 | Client B quitte | Disparaît de la liste participants | ☐ | ☐ |

---

## Régression rapide

| # | Scénario | Android | iPhone |
|---|----------|---------|--------|
| R1 | Expo Web → message « dev build requis » | N/A | N/A |
| R2 | Cours non live → pas de bouton join | ☐ | ☐ |
| R3 | Session JWT expirée → erreur claire | ☐ | ☐ |

---

## Notes de session

**Testeur :** _______________  
**Date :** _______________  
**Build Android :** _______________  
**Build iOS :** _______________  
**API :** _______________  
**Course ID testé :** _______________

**Bugs observés :**

1.
2.
3.

**Validation globale V2.1 device :** ☐ OK pour démarrer V2.2 · ☐ Bloqué (préciser ci-dessus)
