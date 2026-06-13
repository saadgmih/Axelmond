# Axelmond Research Labs

Research, innovation and education platform for academic computing, AI-assisted learning, live courses, and professor-managed curriculum content.

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
Axelmond Research Labs <verification@axelmond.com>
```

Signature:

```txt
Axelmond Research Labs
Research • Innovation • Education
```
