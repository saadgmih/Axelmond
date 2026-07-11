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
  const catalogMappers = fs.readFileSync("src/server/mappers/catalog-mappers.ts", "utf8");
  const contentMappers = fs.readFileSync("src/server/mappers/content-mappers.ts", "utf8");
  assert.match(catalogMappers, /export function toCourse/);
  assert.match(contentMappers, /export function collectDescendantSectionIds/);
  assert.match(routeSchemas, /export function validateBody/);
  assert.match(routeSchemas, /export const registerSchema/);

  assert.ok(fs.existsSync("src/server/route-loggers.ts"));
  assert.ok(fs.existsSync("src/server/route-ownership.ts"));
  assert.ok(fs.existsSync("src/server/route-types.ts"));
  assert.ok(fs.existsSync("src/server/route-mappers.ts"));
  assert.ok(fs.existsSync("src/server/route-schemas.ts"));

  assert.ok(fs.existsSync("src/server/mappers/catalog-mappers.ts"));
  assert.ok(fs.existsSync("src/server/mappers/content-mappers.ts"));
  assert.ok(fs.existsSync("src/server/mappers/user-mappers.ts"));
  assert.ok(fs.existsSync("src/server/mappers/live-mappers.ts"));

  const catalogMapperLines = fs.readFileSync("src/server/mappers/catalog-mappers.ts", "utf8").split("\n").length;
  const contentMapperLines = fs.readFileSync("src/server/mappers/content-mappers.ts", "utf8").split("\n").length;
  const userMapperLines = fs.readFileSync("src/server/mappers/user-mappers.ts", "utf8").split("\n").length;
  const liveMapperLines = fs.readFileSync("src/server/mappers/live-mappers.ts", "utf8").split("\n").length;

  assert.ok(catalogMapperLines <= 250, `catalog-mappers.ts is ${catalogMapperLines} lines`);
  assert.ok(contentMapperLines <= 250, `content-mappers.ts is ${contentMapperLines} lines`);
  assert.ok(userMapperLines <= 320, `user-mappers.ts is ${userMapperLines} lines`);
  assert.ok(liveMapperLines <= 400, `live-mappers.ts is ${liveMapperLines} lines`);

  const depsLines = routeDeps.split("\n").length;
  const mapperLines = routeMappers.trim().split(/\r?\n/).length;
  const schemaLines = routeSchemas.split("\n").length;

  assert.ok(depsLines <= 500, `route-deps.ts still ${depsLines} lines — keep auth + barrel exports only`);
  assert.ok(mapperLines <= 25, `route-mappers.ts should be a barrel export (${mapperLines} lines)`);
  assert.ok(schemaLines <= 400, `route-schemas.ts is ${schemaLines} lines`);
});
