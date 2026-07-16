/**
 * Unit-test environment defaults — keeps promo/mobile auth rules in "dev" mode
 * unless a test explicitly passes its own env object.
 */
process.env.NODE_ENV = "test";
const isolatedTestDatabaseUrl =
  process.env.TEST_DATABASE_URL?.trim() ||
  "postgresql://test:test@127.0.0.1:5432/axelmond_test?schema=AxelmondResearchLab&sslmode=disable";
process.env.TEST_DATABASE_URL = isolatedTestDatabaseUrl;
process.env.DATABASE_URL = isolatedTestDatabaseUrl;
