import fs from "node:fs";
import path from "node:path";

const testsDir = path.join(path.resolve(import.meta.dirname, ".."), "tests");
const importLine = 'import { readApiRouteSources } from "./helpers/api-route-sources.ts";\n';

for (const file of fs.readdirSync(testsDir).filter((f) => f.endsWith(".test.ts"))) {
  const filePath = path.join(testsDir, file);
  let source = fs.readFileSync(filePath, "utf8");
  if (!source.includes("readApiRouteSources()")) continue;
  if (source.includes("helpers/api-route-sources")) continue;
  source = source.replace(/^(import assert from "node:assert\/strict";\r?\n)/m, `$1${importLine}`);
  fs.writeFileSync(filePath, source);
  console.log("fixed", file);
}
