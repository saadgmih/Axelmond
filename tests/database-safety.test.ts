import { describe, expect, test } from "vitest";
import { assertSafeTestDatabaseEnvironment, inspectDatabaseTarget } from "../src/database-safety";

const localTestUrl = "postgresql://test:secret@127.0.0.1:5432/axelmond_test?schema=AxelmondResearchLab&sslmode=disable";

describe("database safety", () => {
  test("accepts a dedicated loopback test database", () => {
    expect(() =>
      assertSafeTestDatabaseEnvironment({
        NODE_ENV: "test",
        DATABASE_URL: localTestUrl,
        TEST_DATABASE_URL: localTestUrl,
      }),
    ).not.toThrow();
  });

  test("rejects a production-looking database during tests", () => {
    const productionUrl = "postgresql://user:secret@production.example.com:5432/axelmond";
    expect(() =>
      assertSafeTestDatabaseEnvironment({
        NODE_ENV: "test",
        DATABASE_URL: productionUrl,
        TEST_DATABASE_URL: productionUrl,
      }),
    ).toThrow(/Refusing test database/);
  });

  test("rejects an accidental mismatch with TEST_DATABASE_URL", () => {
    expect(() =>
      assertSafeTestDatabaseEnvironment({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://user:secret@db.example.com:5432/production",
        TEST_DATABASE_URL: localTestUrl,
      }),
    ).toThrow(/exactly match/);
  });

  test("never includes credentials in the inspected target", () => {
    expect(inspectDatabaseTarget(localTestUrl)).toEqual({
      host: "127.0.0.1",
      database: "axelmond_test",
      isLoopback: true,
      isNamedForTests: true,
    });
  });
});
