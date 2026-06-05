import assert from "node:assert/strict";
import fs from "node:fs";

const indexHtml = fs.readFileSync("index.html", "utf8");
const cssSource = fs.readFileSync("src/index.css", "utf8");
const projectMap = fs.readFileSync("PROJECT_MAP.md", "utf8");

assert.match(indexHtml, /<meta name="viewport" content="width=1280, initial-scale=1"/);
assert.doesNotMatch(indexHtml, /width=device-width/);
assert.match(cssSource, /--app-desktop-width:\s*1280px/);
assert.match(cssSource, /min-width:\s*var\(--app-desktop-width\)/);
assert.match(projectMap, /Desktop viewport/);

console.log("Desktop viewport consistency rules passed");
