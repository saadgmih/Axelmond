# Performance Académique

Plateforme académique de formation, d'accompagnement pédagogique, de classes live et de gestion de contenus par les professeurs.

## Run Locally

Prerequisites:

- Node.js
- PostgreSQL database reachable through `DATABASE_URL`

Install dependencies:

```bash
npm install
```

Generate Prisma client and apply migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Production / staging — apply committed migrations only:

```bash
npm run deploy:migrate
```

See [`docs/MIGRATIONS-RUNBOOK.md`](docs/MIGRATIONS-RUNBOOK.md) for baselining and drift recovery.

Start the application:

```bash
npm run dev
```

The local server runs at:

```txt
http://localhost:3000
```

## Email

SMTP sender:

```txt
Performance Académique <verification@axelmond.com>
```

Signature:

```txt
Performance Académique
Apprendre • Progresser • Réussir
```
