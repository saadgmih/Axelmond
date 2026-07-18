/**
 * Unit-test environment defaults — keeps promo/mobile auth rules in "dev" mode
 * unless a test explicitly passes its own env object.
 */
const explicitPromoE2eUrl = process.env.PROMO_DATABASE_E2E === "1" ? process.env.PROMO_DATABASE_E2E_URL?.trim() : "";
if (explicitPromoE2eUrl) {
  // Explicit, disposable-data E2E mode. Never enabled by CI or the regular suite.
  process.env.NODE_ENV = "development";
  process.env.DATABASE_URL = explicitPromoE2eUrl;
} else {
  process.env.NODE_ENV = "test";
  const isolatedTestDatabaseUrl =
    process.env.TEST_DATABASE_URL?.trim() ||
    "postgresql://test:test@127.0.0.1:5432/axelmond_test?schema=AxelmondResearchLab&sslmode=disable";
  process.env.TEST_DATABASE_URL = isolatedTestDatabaseUrl;
  process.env.DATABASE_URL = isolatedTestDatabaseUrl;
}
