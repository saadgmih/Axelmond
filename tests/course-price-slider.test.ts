import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync("src/App.tsx", "utf8");
const cssSource = readFileSync("src/index.css", "utf8");

assert.match(appSource, /type="range"/);
assert.match(appSource, /course\.price/);
assert.match(cssSource, /\.course-price-slider/);

console.log("Course price slider rules passed");
