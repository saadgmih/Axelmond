import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  overrides?: Record<string, string>;
};
const bootstrapSource = readFileSync("src/server/start-server.ts", "utf8");
const viteConfig = readFileSync("vite.config.ts", "utf8");

assert.equal(packageJson.dependencies?.vite, undefined, "vite must stay out of production dependencies");
assert.match(packageJson.devDependencies?.vite || "", /(\^|~)?8\./);
assert.match(packageJson.devDependencies?.esbuild || "", /(\^|~)?0\.28\./);
assert.equal(packageJson.overrides?.esbuild, "^0.28.1");

assert.match(bootstrapSource, /createViteServer|await import\("vite"\)/);
assert.match(bootstrapSource, /httpServer\.listen\(PORT,\s*"0\.0\.0\.0"/);
assert.match(bootstrapSource, /Serving static files in production mode/);

assert.match(viteConfig, /host:\s*"127\.0\.0\.1"/);
assert.match(viteConfig, /strictPort:\s*true/);

console.log("Dependency audit guard tests passed");
