import assert from "node:assert/strict";
import { parsePositiveInt } from "../src/route-params.ts";

assert.equal(parsePositiveInt("42"), 42);
assert.equal(parsePositiveInt(7), 7);
assert.equal(parsePositiveInt("0"), null);
assert.equal(parsePositiveInt("-3"), null);
assert.equal(parsePositiveInt("abc"), null);
assert.equal(parsePositiveInt(undefined), null);

console.log("Route params validation tests passed");
