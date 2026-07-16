# Vérification Hostinger/hCDN et Cloudflare après déploiement

Le dépôt émet la CSP statique définie dans `src/server/production-csp.ts`. L’origine Hostinger/hCDN
peut néanmoins la remplacer par `Content-Security-Policy: upgrade-insecure-requests`, même lorsque
le CDN est affiché comme inactif dans hPanel. Cloudflare doit alors restaurer exactement cette CSP
avec une règle de transformation d’en-tête de réponse. La politique reste statique afin que la même
valeur puisse être appliquée à l’origine et à la périphérie sans autoriser de script ou de style en ligne.

Dans hPanel, vérifier dans cet ordre :

1. **CDN > Cache** : purger entièrement le cache après le déploiement, puis désactiver temporairement le CDN pour comparer les en-têtes de l’origine et ceux du domaine public.
2. **CDN > Règles de cache** : exclure `/api/*`, `/sw.js` et `/manifest.json` du cache intégral. Ne jamais mettre en cache une réponse `403`, `429`, `5xx` ou une réponse portant `Set-Cookie`.
3. **CDN > Sécurité / protection anti-bot** : désactiver le challenge automatique pour `/api/health` et les requêtes API authentifiées. Autoriser les requêtes légitimes `GET` et `HEAD` sans challenge JavaScript.
4. **WAF / pare-feu** : consulter les événements portant l’identifiant `x-hcdn-request-id`; supprimer ou réduire uniquement la règle qui bloque simultanément `/`, `/api/health` et `/api/courses`. Conserver les protections SQLi, XSS et limitation de débit applicative.
5. **Limitation de débit hCDN** : ne pas appliquer une limite commune aux pages et à toute l’API. Exempter `/api/health`; vérifier que les sondes de disponibilité ne sont pas assimilées à un bot.
6. **En-têtes personnalisés Hostinger** : supprimer toute règle hPanel qui définit ou remplace `Content-Security-Policy`. Conserver HSTS, COOP et CORP seulement si hPanel n’écrase pas leurs valeurs applicatives.
7. **Proxy** : transmettre `Authorization`, `Cookie`, `X-CSRF-Token`, `Origin`, `Upgrade` et `Connection`; autoriser WebSocket pour LiveKit/socket.io.

Dans Cloudflare, appliquer les réglages suivants :

1. **Caching > Configuration > Browser Cache TTL** : sélectionner `Respect Existing Headers`.
2. **AI Crawl Control > Signals** : désactiver le fichier `robots.txt` géré par Cloudflare afin de servir `public/robots.txt` sans contenu préfixé.
3. **Rules > Transform Rules > Response Header Transform Rules** : définir statiquement `Content-Security-Policy` avec la valeur exacte exportée par `src/server/production-csp.ts`, pour toutes les réponses.
4. **Caching > Cache Rules** : créer une règle `URI Path equals /sw.js` avec l’éligibilité au cache sur `Bypass cache`.
5. **Rules > Transform Rules > Response Header Transform Rules** : pour `URI Path equals /sw.js`, définir `Cache-Control` à `no-store`.
6. Purger entièrement le cache Cloudflare après un déploiement ou une modification de règle.

Validation publique à répéter après chaque changement :

```bash
npm run security:probe -- https://axelmond.com
PRODUCTION_PROBE_BASE_URL=https://axelmond.com PRODUCTION_PROBE_ROUNDS=5 node scripts/verify-production-edge.mjs
```

Les cinq séries doivent réussir. La CSP doit contenir toutes les directives vérifiées par la sonde,
et non la seule directive `upgrade-insecure-requests`. `/sw.js` doit rester `no-store` et ne jamais
être servi avec un statut de cache `HIT`. `robots.txt` doit commencer par le contenu du dépôt.
