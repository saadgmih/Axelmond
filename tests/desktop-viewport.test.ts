import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("desktop-viewport", () => {
  const indexHtml = fs.readFileSync("index.html", "utf8");
  const cssSource = fs.readFileSync("src/index.css", "utf8");
  const projectMap = fs.readFileSync("PROJECT_MAP.md", "utf8");

  assert.match(indexHtml, /width=device-width/);
  assert.doesNotMatch(indexHtml, /width=1280/);
  assert.match(cssSource, /--app-content-max:/);
  assert.match(cssSource, /overflow-x:\s*hidden/);
  assert.doesNotMatch(cssSource, /--app-desktop-width/);
  assert.match(projectMap, /Viewport responsive mobile-first/);
});
