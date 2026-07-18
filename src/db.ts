import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { loadEnv } from "./load-env";
import { isVerboseStartup } from "./server/startup-logging";
import { assertSafeTestDatabaseEnvironment } from "./database-safety";

loadEnv();
assertSafeTestDatabaseEnvironment();

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
  pgSchema?: string;
  databaseUrl?: string;
  databaseDisconnected?: boolean;
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

  const sslMode = url.searchParams.get("sslmode");
  if (!sslMode) {
    url.searchParams.set("sslmode", "verify-full");
  } else if (/^(prefer|require|verify-ca)$/i.test(sslMode)) {
    url.searchParams.set("sslmode", "verify-full");
  }
  url.searchParams.set("schema", schema);

  const protocol = connectionString.startsWith("postgres://") ? "postgres:" : "postgresql:";
  const fixedUrl = `${protocol}${url.toString().slice("http:".length)}`;

  if (rawSchema && rawSchema !== schema && isVerboseStartup()) {
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

  if (isVerboseStartup()) {
    console.info(`[db] Prisma datasource schema forced: ${fixed.schema}`);
  }
  return fixed;
}

function createPgPool(fixedDatabaseUrl: string, schema: string): Pool {
  const isHostinger = process.env.HOSTINGER_WEBAPP === "1";
  const defaultPoolMax = isHostinger ? 2 : 5;
  const pool = new Pool({
    connectionString: fixedDatabaseUrl,
    max: Number(process.env.DATABASE_POOL_MAX) || defaultPoolMax,
    idleTimeoutMillis: isHostinger ? 10_000 : 30_000,
    connectionTimeoutMillis: isHostinger ? 5_000 : 10_000,
    options: `-c search_path=${quotePgIdentifier(schema)}`,
  });

  if (isVerboseStartup()) {
    console.info(`[db] PostgreSQL active schema: ${schema} (search_path=${schema})`);
  }
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
    transactionOptions: {
      maxWait: 10_000,
      timeout: 30_000,
    },
  });
}

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createPrismaClient();
  return globalForPrisma.prisma;
}

/** Lazy proxy: importing a pure helper never opens a PostgreSQL pool. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, client) as unknown;
    return typeof value === "function" ? value.bind(client) : value;
  },
});

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

type DatabaseConnectionCheck = { ok: boolean; schema: string; error?: string };

export async function verifyDatabaseConnection(options?: {
  timeoutMs?: number;
  trackTask?: (task: Promise<DatabaseConnectionCheck>) => Promise<DatabaseConnectionCheck>;
}): Promise<DatabaseConnectionCheck> {
  const schema = getActivePgSchema();
  const timeoutMs =
    options?.timeoutMs ??
    (Number(process.env.STARTUP_DB_TIMEOUT_MS) || (process.env.HOSTINGER_WEBAPP === "1" ? 5_000 : 8_000));

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const databaseCheck: Promise<DatabaseConnectionCheck> = (async () => {
      await prisma.user.findFirst({ select: { id: true } });
      return { ok: true, schema };
    })();
    const trackedDatabaseCheck = options?.trackTask ? options.trackTask(databaseCheck) : databaseCheck;

    return await Promise.race([
      trackedDatabaseCheck,
      new Promise<{ ok: false; schema: string; error: string }>((resolve) => {
        timer = setTimeout(
          () => resolve({ ok: false, schema, error: `Database verification timed out after ${timeoutMs}ms` }),
          timeoutMs,
        );
      }),
    ]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, schema, error: message };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function disconnectDatabase() {
  if (globalForPrisma.databaseDisconnected) return;
  globalForPrisma.databaseDisconnected = true;

  try {
    if (globalForPrisma.prisma) await globalForPrisma.prisma.$disconnect();
  } finally {
    if (globalForPrisma.pgPool) {
      await globalForPrisma.pgPool.end();
      globalForPrisma.pgPool = undefined;
    }
  }
}

export function isDatabaseDisconnected(): boolean {
  return Boolean(globalForPrisma.databaseDisconnected);
}
