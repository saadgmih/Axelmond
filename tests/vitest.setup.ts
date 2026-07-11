/**
 * Unit-test environment defaults — keeps promo/mobile auth rules in "dev" mode
 * unless a test explicitly passes its own env object.
 */
process.env.NODE_ENV = "test";
