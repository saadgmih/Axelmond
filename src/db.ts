import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

dotenv.config();

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
  pgSchema?: string;
};

const SCHEMA_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function resolvePgSchema(connectionString: string): string {
  try {
    const normalized = connectionString.replace(/^postgresql:/i, "http:");
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

function createPgPool(): Pool {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const schema = resolvePgSchema(connectionString);
  globalForPrisma.pgSchema = schema;

  const pool = new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX) || 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    options: `-c search_path=${schema}`,
  });

  console.info(`[db] PostgreSQL active schema: ${schema} (search_path=${schema})`);
  return pool;
}

function createPrismaClient(): PrismaClient {
  const pool = globalForPrisma.pgPool ?? createPgPool();
  globalForPrisma.pgPool = pool;

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

export async function disconnectDatabase() {
  await prisma.$disconnect();
  if (globalForPrisma.pgPool) {
    await globalForPrisma.pgPool.end();
    globalForPrisma.pgPool = undefined;
  }
}
