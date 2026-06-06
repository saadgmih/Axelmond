import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

dotenv.config();

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
  pgSchema?: string;
  databaseUrl?: string;
};

const SCHEMA_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function resolvePgSchema(connectionString: string): string {
  try {
    const normalized = connectionString.replace(/^postgresql:/i, "http:").replace(/^postgres:/i, "http:");
    const url = new URL(normalized);
    const schema = url.searchParams.get("schema")?.trim();
    if (schema && SCHEMA_NAME_PATTERN.test(schema)) {
      return schema;
    }
  } catch {
    // Fall back to project default below.
  }
  return "unicode";
}

export function buildFixedDatabaseUrl(connectionString: string): { url: string; schema: string } {
  const normalized = connectionString.replace(/^postgresql:/i, "http:").replace(/^postgres:/i, "http:");
  const url = new URL(normalized);
  const schema = resolvePgSchema(connectionString);

  if (!url.searchParams.get("sslmode")) {
    url.searchParams.set("sslmode", "require");
  }
  url.searchParams.set("schema", schema);

  const protocol = connectionString.startsWith("postgres://") ? "postgres:" : "postgresql:";
  const fixedUrl = `${protocol}${url.toString().slice("http:".length)}`;

  return { url: fixedUrl, schema };
}

function ensureFixedDatabaseConfig(): { url: string; schema: string } {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const fixed = buildFixedDatabaseUrl(connectionString);
  process.env.DATABASE_URL = fixed.url;
  globalForPrisma.pgSchema = fixed.schema;
  globalForPrisma.databaseUrl = fixed.url;

  console.info(`[db] Prisma datasource schema forced: ${fixed.schema}`);
  return fixed;
}

function createPgPool(fixedDatabaseUrl: string, schema: string): Pool {
  const pool = new Pool({
    connectionString: fixedDatabaseUrl,
    max: Number(process.env.DATABASE_POOL_MAX) || 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    options: `-c search_path=${schema}`,
  });

  console.info(`[db] PostgreSQL active schema: ${schema} (search_path=${schema})`);
  return pool;
}

function createPrismaClient(): PrismaClient {
  const { url: fixedDatabaseUrl, schema } = ensureFixedDatabaseConfig();
  const pool = globalForPrisma.pgPool ?? createPgPool(fixedDatabaseUrl, schema);
  globalForPrisma.pgPool = pool;

  // Driver adapters cannot use PrismaClient({ datasources }) — Prisma reads DATABASE_URL.
  return new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.LOG_LEVEL === "debug" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;

export function getActivePgSchema(): string {
  return globalForPrisma.pgSchema ?? resolvePgSchema(process.env.DATABASE_URL || "");
}

export function getFixedDatabaseUrl(): string {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }
  return globalForPrisma.databaseUrl ?? buildFixedDatabaseUrl(connectionString).url;
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  if (globalForPrisma.pgPool) {
    await globalForPrisma.pgPool.end();
    globalForPrisma.pgPool = undefined;
  }
}
