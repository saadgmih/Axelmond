# Vérification Hostinger/hCDN après déploiement

Le dépôt émet une CSP complète depuis Express. Si la réponse publique contient uniquement
`Content-Security-Policy: upgrade-insecure-requests`, l’en-tête est remplacé en amont de Node.js.

Dans hPanel, vérifier dans cet ordre :

1. **CDN > Cache** : purger entièrement le cache après le déploiement, puis désactiver temporairement le CDN pour comparer les en-têtes de l’origine et ceux du domaine public.
2. **CDN > Règles de cache** : exclure `/api/*`, `/sw.js` et `/manifest.json` du cache intégral. Ne jamais mettre en cache une réponse `403`, `429`, `5xx` ou une réponse portant `Set-Cookie`.
3. **CDN > Sécurité / protection anti-bot** : désactiver le challenge automatique pour `/api/health` et les requêtes API authentifiées. Autoriser les requêtes légitimes `GET` et `HEAD` sans challenge JavaScript.
4. **WAF / pare-feu** : consulter les événements portant l’identifiant `x-hcdn-request-id`; supprimer ou réduire uniquement la règle qui bloque simultanément `/`, `/api/health` et `/api/courses`. Conserver les protections SQLi, XSS et limitation de débit applicative.
5. **Limitation de débit hCDN** : ne pas appliquer une limite commune aux pages et à toute l’API. Exempter `/api/health`; vérifier que les sondes de disponibilité ne sont pas assimilées à un bot.
6. **En-têtes personnalisés** : supprimer toute règle hPanel qui définit ou remplace `Content-Security-Policy`. La CSP doit provenir de l’application. Conserver HSTS, COOP et CORP seulement si hPanel n’écrase pas leurs valeurs applicatives.
7. **Proxy** : transmettre `Authorization`, `Cookie`, `X-CSRF-Token`, `Origin`, `Upgrade` et `Connection`; autoriser WebSocket pour LiveKit/socket.io.

Validation publique à répéter après chaque changement :

```bash
npm run security:probe -- https://axelmond.com
PRODUCTION_PROBE_BASE_URL=https://axelmond.com PRODUCTION_PROBE_ROUNDS=5 node scripts/verify-production-edge.mjs
```

Les cinq séries doivent réussir. La CSP doit contenir toutes les directives vérifiées par la sonde, et non la seule directive `upgrade-insecure-requests`.
