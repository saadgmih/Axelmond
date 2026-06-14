import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("route-deps-modular", () => {
  const routeDeps = fs.readFileSync("src/server/route-deps.ts", "utf8");
  const routeMappers = fs.readFileSync("src/server/route-mappers.ts", "utf8");
  const routeSchemas = fs.readFileSync("src/server/route-schemas.ts", "utf8");

  assert.match(routeDeps, /from "\.\/route-loggers"/);
  assert.match(routeDeps, /from "\.\/route-ownership"/);
  assert.match(routeDeps, /from "\.\/route-types"/);
  assert.match(routeDeps, /from "\.\/route-mappers"/);
  assert.match(routeDeps, /from "\.\/route-schemas"/);
  assert.match(routeDeps, /export \* from "\.\/route-mappers"/);
  assert.match(routeDeps, /export \* from "\.\/route-schemas"/);
  assert.match(routeDeps, /getAuthUser/);
  assert.match(routeMappers, /export function toCourse/);
  assert.match(routeMappers, /export function collectDescendantSectionIds/);
  assert.match(routeSchemas, /export function validateBody/);
  assert.match(routeSchemas, /export const registerSchema/);

  assert.ok(fs.existsSync("src/server/route-loggers.ts"));
  assert.ok(fs.existsSync("src/server/route-ownership.ts"));
  assert.ok(fs.existsSync("src/server/route-types.ts"));
  assert.ok(fs.existsSync("src/server/route-mappers.ts"));
  assert.ok(fs.existsSync("src/server/route-schemas.ts"));

  const depsLines = routeDeps.split("\n").length;
  const mapperLines = routeMappers.split("\n").length;
  const schemaLines = routeSchemas.split("\n").length;

  assert.ok(depsLines <= 500, `route-deps.ts still ${depsLines} lines — keep auth + barrel exports only`);
  assert.ok(mapperLines <= 800, `route-mappers.ts is ${mapperLines} lines`);
  assert.ok(schemaLines <= 400, `route-schemas.ts is ${schemaLines} lines`);
});
