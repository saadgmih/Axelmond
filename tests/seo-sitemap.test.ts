import assert from "node:assert/strict";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import fs from "node:fs";
import path from "node:path";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("seo-sitemap", () => {
  const sitemap = fs.readFileSync("public/sitemap.xml", "utf8");
  const robots = fs.readFileSync("public/robots.txt", "utf8");
  const indexHtml = fs.readFileSync("index.html", "utf8");
  const serverSource = readApiRouteSources();

  assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(sitemap, /<loc>https:\/\/axelmond\.com\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/axelmond\.com\/about<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/axelmond\.com\/contact<\/loc>/);
  assert.doesNotMatch(sitemap, /<html/i);

  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Disallow: \/api\//);
  assert.match(robots, /Disallow: \/student\//);
  assert.match(robots, /Disallow: \/teacher\//);
  assert.match(robots, /Disallow: \/professor\//);
  assert.match(robots, /Disallow: \/admin\//);
  assert.match(robots, /Sitemap: https:\/\/axelmond\.com\/sitemap\.xml/);

  assert.match(indexHtml, /<title>Performance Académique/);
  assert.match(indexHtml, /name="description"/);
  assert.match(indexHtml, /Performance Académique/);
  assert.match(indexHtml, /<h1[^>]*>Performance Académique/);
  assert.match(indexHtml, /rel="canonical" href="https:\/\/axelmond\.com\/"/);
  assert.match(indexHtml, /application\/ld\+json/);

  assert.match(serverSource, /seoStaticFiles/);
  assert.match(serverSource, /sitemap\.xml/);
  assert.match(serverSource, /robots\.txt/);
  assert.match(serverSource, /application\/xml/);

  if (fs.existsSync("dist/sitemap.xml")) {
    const builtSitemap = fs.readFileSync("dist/sitemap.xml", "utf8");
    assert.match(builtSitemap, /^<\?xml version="1\.0"/);
  } else {
    const publicPath = path.join(process.cwd(), "public", "sitemap.xml");
    assert.ok(fs.existsSync(publicPath), "public/sitemap.xml must exist for Vite build copy");
  }
});
