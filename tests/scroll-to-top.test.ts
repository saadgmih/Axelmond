import assert from "node:assert/strict";import fs from "node:fs";import { readAppSources } from "./helpers/app-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("scroll-to-top", () => {
const mainSource = fs.readFileSync("src/main.tsx", "utf8");
const appSource = readAppSources();
const scrollSource = fs.readFileSync("src/components/ScrollToTop.tsx", "utf8");
const utilSource = fs.readFileSync("src/utils/scroll-app-to-top.ts", "utf8");
const navSource = fs.readFileSync("src/hooks/usePlatformNavigation.ts", "utf8");

const layoutSource = fs.readFileSync("src/app/AuthenticatedPlatformLayout.tsx", "utf8");
const footerSource = fs.readFileSync("src/app/AppFooter.tsx", "utf8");

assert.match(mainSource, /BrowserRouter/);
assert.match(mainSource, /ScrollToTop/);
assert.match(scrollSource, /useLayoutEffect/);
assert.match(scrollSource, /scrollAppToTopDeferred/);
assert.match(utilSource, /main-content/);
assert.match(utilSource, /window\.scrollTo\(0,\s*0\)/);
assert.match(navSource, /scrollAppToTopDeferred/);
assert.match(appSource, /scrollAppToTopDeferred/);
assert.match(layoutSource, /Global Footer[\s\S]*<AppFooter[\s\S]*<\/main>/);
assert.match(footerSource, /<footer/);
assert.doesNotMatch(layoutSource, /<\/main>[\s\S]*<footer/);

});
