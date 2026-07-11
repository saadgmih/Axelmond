# Rapport de Charge — Performance Académique

> Généré le : 2026-07-11T02:29:26.934Z  
> Serveur   : http://127.0.0.1:3000  
> Durée par scénario : 10s  
> Résultat global : **❌ FAIL**

---

## Seuils de Qualité de Service (SLO)

| Métrique | Seuil |
|----------|-------|
| Latence p95 | < 500ms |
| Latence p99 | < 2000ms |
| Taux d'erreur | < 1% |
| Débit min (100 users) | ≥ 50 req/s |
| Débit min (500 users) | ≥ 100 req/s |
| Débit min (1000 users) | ≥ 150 req/s |

---

## Résultats par Scénario

| Utilisateurs | Route | RPS | p50 | p95 | p99 | Erreurs | Débit | Statut |
|---|---|---|---|---|---|---|---|---|
| 100 | `/api/domains` | 755 | 114ms | 340ms | 517ms | 0 | 2270 KB/s | ✅ OK |
| 100 | `/api/courses` | 755 | 135ms | 251ms | 281ms | 7547 | 2043 KB/s | ⚠️ DEGRADED |
| 500 | `/api/domains` | 1150 | 450ms | 768ms | 782ms | 11500 | 3113 KB/s | ❌ FAILED |
| 500 | `/api/courses` | 1167 | 866ms | 2262ms | 2375ms | 12512 | 3160 KB/s | ❌ FAILED |
| 1000 | `/api/domains` | 1040 | 2079ms | 3368ms | 3387ms | 11809 | 2815 KB/s | ❌ FAILED |
| 1000 | `/api/courses` | 1094 | 2640ms | 4412ms | 4592ms | 13386 | 2962 KB/s | ❌ FAILED |

---

## Analyse des Problèmes

### 100 utilisateurs — `/api/courses`
- ⚠️ Taux d'erreur 100.0% > 1%

### 500 utilisateurs — `/api/domains`
- ⚠️ Taux d'erreur 100.0% > 1%
- ⚠️ p95 latence 768ms > 500ms

### 500 utilisateurs — `/api/courses`
- ⚠️ Taux d'erreur 107.2% > 1%
- ⚠️ p99 latence 2375ms > 2000ms
- ⚠️ p95 latence 2262ms > 500ms

### 1000 utilisateurs — `/api/domains`
- ⚠️ Taux d'erreur 113.6% > 1%
- ⚠️ p99 latence 3387ms > 2000ms
- ⚠️ p95 latence 3368ms > 500ms

### 1000 utilisateurs — `/api/courses`
- ⚠️ Taux d'erreur 122.3% > 1%
- ⚠️ p99 latence 4592ms > 2000ms
- ⚠️ p95 latence 4412ms > 500ms

---

## Architecture de Scalabilité Validée

```
Performance Académique — Protections actives :
  ✅ Compression gzip            (réduction ~70% de la taille des réponses JSON)
  ✅ Rate limiting global        (100 req / 15min / IP — configurable via RATE_LIMIT_MAX_REQUESTS)
  ✅ Rate limiting auth strict   (10 req / 15min / IP — protection brute-force)
  ✅ Cache LRU mémoire (60s)     (GET /api/domains + GET /api/courses pour visiteurs anonymes)
  ✅ Pool Prisma optimisé        (Neon serverless avec connection_limit dans DATABASE_URL)
  ✅ Logs de performance         (p95/p99 par route, CPU/RAM toutes les 30s)
  ✅ Alerte requêtes lentes      (log [perf] WARN si réponse > 1s)
  ✅ Alerte mémoire              (log [perf] WARN si heap > 80% ou RAM système < 10%)
  ✅ PM2 cluster mode            (npm run start:cluster → workers = nombre de CPU)
  ✅ Gestion erreurs globales    (uncaughtException + unhandledRejection — process reste vivant)
  ✅ Protection pics de trafic   (429 automatique avec retry-after via standardHeaders)
  ✅ /api/health                 (healthcheck léger exempt du rate limiter)
```

---

## Commandes de Scalabilité

```bash
# Lancer en mode cluster PM2 (production)
npm run build
npm run start:cluster

# Recharger sans downtime (zero-downtime reload)
npm run reload:cluster

# Relancer ce rapport
npm run load-test

# Monitoring PM2 en temps réel
node_modules/.bin/pm2 monit
```
