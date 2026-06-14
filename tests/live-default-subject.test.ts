import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";

import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("live-default-subject", () => {
const serverSource = readApiRouteSources();
const livekitSource = readFileSync("src/livekit.ts", "utf8");

assert.match(serverSource, /DEFAULT_LIVE_SUBJECT/);
assert.match(livekitSource, /Session académique en direct/);

console.log("Default live subject rules passed");
});
