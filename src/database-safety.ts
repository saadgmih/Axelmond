const LOOPBACK_DATABASE_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])(test|tests|ci)(?:$|[_-])/i;

export interface DatabaseTarget {
  host: string;
  database: string;
  isLoopback: boolean;
  isNamedForTests: boolean;
}

export function inspectDatabaseTarget(connectionString: string): DatabaseTarget {
  const url = new URL(connectionString);
  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  return {
    host: url.hostname.toLowerCase(),
    database,
    isLoopback: LOOPBACK_DATABASE_HOSTS.has(url.hostname.toLowerCase()),
    isNamedForTests: TEST_DATABASE_NAME_PATTERN.test(database),
  };
}

export function assertSafeTestDatabaseEnvironment(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== "test" && env.SECURITY_RUNTIME_TEST !== "1") return;

  const testDatabaseUrl = env.TEST_DATABASE_URL?.trim();
  const activeDatabaseUrl = env.DATABASE_URL?.trim();
  if (!testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL is required when tests can access PostgreSQL");
  }
  if (!activeDatabaseUrl || activeDatabaseUrl !== testDatabaseUrl) {
    throw new Error("DATABASE_URL must exactly match TEST_DATABASE_URL in the test environment");
  }

  let target: DatabaseTarget;
  try {
    target = inspectDatabaseTarget(activeDatabaseUrl);
  } catch {
    throw new Error("TEST_DATABASE_URL is not a valid PostgreSQL URL");
  }

  if (!target.isNamedForTests) {
    throw new Error(`Refusing test database without a test/ci database name (${target.host}/${target.database})`);
  }
  if (!target.isLoopback && env.ALLOW_REMOTE_TEST_DATABASE !== "1") {
    throw new Error(`Refusing remote test database without ALLOW_REMOTE_TEST_DATABASE=1 (${target.host})`);
  }
}
