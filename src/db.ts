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

export const DEFAULT_PG_SCHEMA = "AxelmondResearchLab";

/** Legacy Neon schema name — mapped automatically for older DATABASE_URL values. */
export const LEGACY_PG_SCHEMA = "unicode";

const LEGACY_SCHEMA_ALIASES: Record<string, string> = {
  [LEGACY_PG_SCHEMA]: DEFAULT_PG_SCHEMA,
};

const SCHEMA_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function normalizeSchemaName(schema: string): string {
  return LEGACY_SCHEMA_ALIASES[schema] ?? schema;
}

function quotePgIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export function resolvePgSchema(connectionString: string): string {
  try {
    const normalized = connectionString.replace(/^postgresql:/i, "http:").replace(/^postgres:/i, "http:");
    const url = new URL(normalized);
    const schema = url.searchParams.get("schema")?.trim();
    if (schema && SCHEMA_NAME_PATTERN.test(schema)) {
      return normalizeSchemaName(schema);
    }
  } catch {
    // Fall back to project default below.
  }
  return DEFAULT_PG_SCHEMA;
}

export function buildFixedDatabaseUrl(connectionString: string): { url: string; schema: string } {
  const normalized = connectionString.replace(/^postgresql:/i, "http:").replace(/^postgres:/i, "http:");
  const url = new URL(normalized);
  const rawSchema = url.searchParams.get("schema")?.trim() || "";
  const schema = resolvePgSchema(connectionString);

  if (!url.searchParams.get("sslmode")) {
    url.searchParams.set("sslmode", "require");
  }
  url.searchParams.set("schema", schema);

  const protocol = connectionString.startsWith("postgres://") ? "postgres:" : "postgresql:";
  const fixedUrl = `${protocol}${url.toString().slice("http:".length)}`;

  if (rawSchema && rawSchema !== schema) {
    console.info(`[db] Legacy schema alias applied: ${rawSchema} -> ${schema}`);
  }

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
    options: `-c search_path=${quotePgIdentifier(schema)}`,
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
