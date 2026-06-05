import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const serverSource = readFileSync("server.ts", "utf8");
const livekitSource = readFileSync("src/livekit.ts", "utf8");

assert.match(serverSource, /DEFAULT_LIVE_SUBJECT/);
assert.match(livekitSource, /Session académique en direct/);

console.log("Default live subject rules passed");
