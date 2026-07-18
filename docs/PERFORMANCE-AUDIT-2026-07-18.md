# Audit de performance — 18 juillet 2026

## Périmètre et méthode

L'audit couvre le client React/Vite, le serveur Express, les API, Prisma, le service
worker et la production `https://axelmond.com`. Les mesures synthétiques ont été
réalisées avec Lighthouse 13.0.1, en profils mobile et ordinateur, cache vide. Les
tailles de bundle sont calculées à partir du manifeste Vite et compressées avec
gzip niveau 9. Les temps réseau publics proviennent de cinq nouvelles connexions
par URL avec `curl`.

Les parcours authentifiés étudiant, professeur et administrateur n'ont pas été
mesurés manuellement en production : aucune session de test autorisée n'était
disponible dans le navigateur sélectionné. Leur comportement est couvert par la
suite automatisée et par l'analyse des graphes de dépendances, sans inventer de
mesure. INP nécessite de vraies interactions et n'est donc pas disponible dans
ces exécutions synthétiques ; TBT est fourni comme indicateur de blocage du thread
principal.

## Constat avant correction

- L'accueil visiteur chargeait inutilement `/api/domains`, `/api/courses` et
  `/api/site-settings` avant authentification.
- Le graphe initial contenait du code non nécessaire : animation `motion`,
  WebAuthn, Socket.IO et CSS KaTeX.
- Les lecteurs PDF et vidéo premium étaient importés statiquement par la vue d'un
  module étudiant, même lorsque le contenu sélectionné n'en avait pas besoin.
- Le logo critique de 1,61 Mo était affiché en 96 × 96 px ; la page À propos
  chargeait un portrait de 2,05 Mo.
- La liste et le compteur de notifications nécessitaient deux appels distincts.
- Deux composants pouvaient lancer simultanément le même GET sans partage de la
  promesse en cours.
- Les réglages publics du site étaient relus à chaque requête et leur réponse
  interdisait tout cache de courte durée.
- Le HTML utilisait `no-store`, ce qui empêchait une revalidation navigateur
  efficace. Le service worker ne distinguait pas les ressources racine
  versionnées par leur nom.
- L'audit Prisma a confirmé une instance partagée, un pool Hostinger limité à
  deux connexions, des sélections/paginations et les index utilisés par les
  parcours chauds. Aucun changement de schéma ni index spéculatif n'était
  justifié.

## Mesures avant correction

### Production

| Page / profil | Score | FCP | LCP | CLS | TBT | TTI | DCL observé | Load observé | Requêtes | Transfert |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Accueil mobile | 88 | 2 458 ms | 3 474 ms | 0 | 18 ms | 3 533 ms | 293 ms | 580 ms | 20 | 1 895 903 o |
| Accueil ordinateur | 63 | 2 395 ms | 3 460 ms | 0 | 124 ms | 3 469 ms | 1 015 ms | 1 016 ms | 20 | 1 903 250 o |
| À propos mobile | 97 | 1 925 ms | 2 289 ms | 0 | 38 ms | 2 292 ms | 208 ms | 419 ms | 28 | 4 106 899 o |

TTFB sur cinq nouvelles connexions publiques :

| URL | Plage observée avant correction |
| --- | ---: |
| `/` | 371–824 ms |
| `/api/health` | 401–581 ms |
| `/api/courses` | 406–559 ms |

La réponse JSON de `/api/courses` était compressée avec gzip. Le HTML et les API
étaient servis via Cloudflare/Hostinger.

### Bundle local de production

| Métrique | Avant | Après correction locale | Variation |
| --- | ---: | ---: | ---: |
| JavaScript initial brut | 520 672 o | 479 705 o | −7,9 % |
| JavaScript initial gzip | 160 309 o | 147 749 o | −7,8 % |
| CSS initial brut | 295 288 o | 267 732 o | −9,3 % |
| CSS initial gzip | 42 460 o | 34 402 o | −19,0 % |
| Chunk d'entrée gzip | 87 454 o | 74 752 o | −14,5 % |
| Logo critique | 1 608 279 o | 34 645 o | −97,8 % |
| Portrait principal | 2 051 022 o | 57 524 o | −97,2 % |

## Corrections appliquées

### Chargement et rendu

- Suppression de `motion` et remplacement de son unique transition par une
  animation CSS légère.
- Imports dynamiques de WebAuthn, Socket.IO et du CSS KaTeX.
- Ajout d'un composant `LazyLatexText` pour charger KaTeX uniquement lorsqu'une
  formule est réellement rendue.
- Chargement différé des lecteurs PDF et vidéo premium dans le module étudiant,
  avec un état local léger pendant l'import.
- Vérification du graphe visiteur : aucune dépendance PDF, LiveKit, PayPal,
  Socket.IO, WebAuthn ou KaTeX n'est présente au premier affichage.
- Conservation des séparations de routes déjà en place pour les espaces
  étudiant, professeur et administrateur. Les grandes listes de messages et de
  notifications étaient déjà virtualisées/paginées.

### Réseau et données

- Le catalogue et les domaines ne sont plus demandés pour un visiteur non
  authentifié.
- Les GET identiques simultanés partagent maintenant une seule promesse par
  chemin et jeton. Les mutations ne sont jamais dédupliquées.
- La liste et le compteur des notifications sont fusionnés dans
  `/api/notifications/overview`; les deux lectures serveur indépendantes sont
  exécutées avec `Promise.all`.
- Le cache de réglages publics du site dure 30 secondes en mémoire et est invalidé
  immédiatement après une mise à jour administrative.
- Les règles existantes de refresh partagé, retries limités aux requêtes
  idempotentes et absence de retry automatique des mutations sensibles ont été
  conservées et testées.

### Images, médias et polices

- Logo critique redimensionné exactement à 192 × 192 px et compressé à 34 645 o.
- Portraits créés aux tailles d'affichage : 720 px pour les vues complètes et
  160 px pour les avatars/pied de page.
- Dimensions explicites, `decoding="async"`, priorité uniquement au contenu LCP
  et lazy loading hors écran.
- Le PDF, son worker, la vidéo avancée et LiveKit restent hors du graphe initial.
  Les tests existants continuent de couvrir l'annulation PDF, le chargement
  conditionnel des médias et le nettoyage des contrôles vidéo.
- Les polices restent auto-hébergées avec `font-display: swap`; aucun nouveau
  preload bloquant n'a été ajouté.

### Cache HTTP et service worker

- Assets hashés : `public, max-age=31536000, immutable`. Les images publiques
  versionnées sont aussi émises sous `/assets/`, car la couche statique Hostinger
  retire les en-têtes applicatifs des images placées à la racine.
- HTML : `no-cache, must-revalidate` (et `no-transform` pour le document généré).
- Réglages publics : cache partagé court avec revalidation en arrière-plan.
- API privées, erreurs 401/403/5xx et médias protégés : jamais placés dans un
  cache public persistant.
- Service worker version 8 : cache-first pour les assets hashés, network-first
  pour les ressources non versionnées, suppression des anciens caches et refus
  de stocker les réponses en erreur.

## Budgets ajoutés à la CI

`npm run ci:performance` analyse le manifeste Vite et échoue en cas de régression.

| Budget | Mesure finale locale | Limite |
| --- | ---: | ---: |
| JavaScript initial gzip | 144,0 Kio | 150 Kio |
| CSS initial gzip | 33,3 Kio | 40 Kio |
| JavaScript route visiteur gzip | 150,8 Kio | 170 Kio |
| Chunk d'entrée gzip | 73,0 Kio | 100 Kio |
| Requêtes d'assets initiales | 4 | 4 |
| Requêtes d'assets route visiteur | 10 | 10 |
| Plus gros chunk JavaScript | 454,3 Kio | 525 Kio |
| Worker PDF | 1 216,3 Kio | 1 300 Kio |
| Logo critique | 33,8 Kio | 64 Kio |
| Portrait critique | 56,2 Kio | 80 Kio |

Le script produit également `dist/performance-budget.json` pour inspection dans
les artefacts CI.

## Validation technique locale

- Build Vite/Express/Prisma : réussi.
- TypeScript normal et strict : réussi.
- ESLint sans avertissement et Prettier : réussi.
- Suite complète : 217 fichiers réussis, 1 test DB E2E ignoré faute de base de
  test ; 429 tests réussis.
- Catégorie runtime : 28 fichiers réussis, 1 test DB E2E ignoré ; 231 tests
  réussis. Les scénarios nécessitant `DATABASE_URL` ont proprement été ignorés en
  environnement local sans base de test.
- PDF : 5 tests réussis ; vidéo premium : 5 tests réussis.
- Audit npm : 0 vulnérabilité de niveau élevé ou supérieur.
- Scan de secrets : réussi.
- Prisma : schéma valide et 42 dossiers de migration validés.
- `git diff --check` : réussi.

Vérifications visuelles locales, mobile adaptatif et ordinateur : accueil public,
connexion, page À propos, taille intrinsèque du logo, portraits responsive,
chargement différé PDF et vidéo. Les rôles authentifiés et les actions financières
n'ont pas été simulés sans compte de test autorisé.

## Résultats après déploiement

Le déploiement Hostinger a été détecté par l'apparition du nouvel asset versionné.
Les mesures ci-dessous utilisent exactement Lighthouse 13.0.1, comme le baseline,
avec une exécution par page et profil. Une exécution unique est sensible à la
variation réseau ; elle ne constitue pas une garantie de durée fixe.

| Page / profil | Score avant → après | FCP avant → après | LCP avant → après | CLS | TBT avant → après | Requêtes avant → après | Transfert avant → après |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Accueil mobile | 88 → 93 | 2 458 → 2 107 ms | 3 474 → 3 010 ms | 0 → 0 | 18 → 0 ms | 20 → 18 | 1 895 903 → 253 105 o |
| Accueil ordinateur | 63 → 100 | 2 395 → 469 ms | 3 460 → 549 ms | 0 → 0 | 124 → 0 ms | 20 → 18 | 1 903 250 → 249 541 o |
| À propos mobile | 97 → 95 | 1 925 → 2 074 ms | 2 289 → 2 599 ms | 0 → 0 | 38 → 0 ms | 28 → 26 | 4 106 899 → 373 342 o |

Résultats complémentaires :

- Accueil mobile : travail du thread principal réduit de 911 à 502 ms (−44,9 %),
  JavaScript inutilisé de 115 648 à 79 770 o (−31,0 %) et transfert total réduit
  de 86,6 %.
- Accueil ordinateur : transfert réduit de 86,9 % et TBT supprimé dans cette
  mesure.
- Page À propos : transfert réduit de 90,9 % et TBT supprimé. Le FCP/LCP de cette
  exécution isolée est légèrement moins bon malgré la forte réduction réseau ;
  cela illustre la variabilité Hostinger/Internet et doit être suivi par les
  données réelles plutôt que masqué.
- DCL / événement Load observés : accueil mobile 293/580 → 225/425 ms, accueil
  ordinateur 1 015/1 016 → 380/631 ms, À propos 208/419 → 228/374 ms.

### Sondes publiques après déploiement

Cinq nouvelles connexions par URL :

| URL | Plage TTFB après correction | Plage avant |
| --- | ---: | ---: |
| `/` | 410–427 ms | 371–824 ms |
| `/api/health` | 402–538 ms | 401–581 ms |
| `/api/courses` | 407–495 ms | 406–559 ms |

Cinq séries supplémentaires, espacées de cinq secondes et lançant `/`,
`/api/health` et `/api/courses` en parallèle, ont toutes réussi : 15 réponses
`200`, avec 211 à 279 ms par série. Une réponse santé transitoire au moment exact
du redémarrage a été écartée après vérification du corps puis cinq séries stables.

### En-têtes et contrôle visuel public

- HTML : `no-cache, must-revalidate, no-transform`.
- Bundle JavaScript `/assets/*` et images versionnées `/assets/*` :
  `public, max-age=31536000, immutable`.
- `/api/site-settings` :
  `public, max-age=30, s-maxage=60, stale-while-revalidate=120`.
- `/api/health` : privé/non stockable ; `/api/courses` reste compressé.
- Service worker public : version 8 détectée.
- Une purge Cloudflare ciblée sur l'ancien emplacement du seul logo a été
  effectuée après déploiement. Aucune purge globale, API ou donnée privée.
- Accueil réel : logo naturel 192 × 192 px, rendu 96 × 96, priorité haute.
- À propos réel : portrait principal naturel 720 × 1 080, rendu 359 × 360 ; second
  portrait 720 × 1 082 avec lazy loading et priorité basse.

La vérification manuelle publique confirme l'accueil, la connexion et la page À
propos sans erreur visible. Les parcours authentifiés et financiers restent non
mesurés manuellement faute de session de test autorisée ; aucune conclusion
chiffrée n'est inventée pour ces rôles.
