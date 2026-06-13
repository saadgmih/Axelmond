import assert from "node:assert/strict";
import fs from "node:fs";

const mainSource = fs.readFileSync("src/main.tsx", "utf8");
const appSource = fs.readFileSync("src/App.tsx", "utf8");
const scrollSource = fs.readFileSync("src/components/ScrollToTop.tsx", "utf8");
const utilSource = fs.readFileSync("src/utils/scroll-app-to-top.ts", "utf8");
const navSource = fs.readFileSync("src/hooks/usePlatformNavigation.ts", "utf8");

assert.match(mainSource, /BrowserRouter/);
assert.match(mainSource, /ScrollToTop/);
assert.match(scrollSource, /useLayoutEffect/);
assert.match(scrollSource, /scrollAppToTopDeferred/);
assert.match(utilSource, /main-content/);
assert.match(utilSource, /window\.scrollTo\(0,\s*0\)/);
assert.match(navSource, /scrollAppToTopDeferred/);
assert.match(appSource, /scrollAppToTopDeferred/);
assert.match(appSource, /Global Footer[\s\S]*<footer[\s\S]*<\/main>/);
assert.doesNotMatch(appSource, /<\/main>[\s\S]*<footer/);

console.log("ScrollToTop navigation tests passed");
