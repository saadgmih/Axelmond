import fs from "node:fs";
import path from "node:path";

const testsDir = path.join(path.resolve(import.meta.dirname, ".."), "tests");
const skip = new Set(["server-routes-modular.test.ts"]);

for (const file of fs.readdirSync(testsDir).filter((f) => f.endsWith(".test.ts"))) {
  if (skip.has(file)) continue;
  const filePath = path.join(testsDir, file);
  let source = fs.readFileSync(filePath, "utf8");
  if (!source.includes('readFileSync("server.ts"') && !source.includes("readFileSync('server.ts'")) continue;
  if (source.includes("readApiRouteSources")) continue;

  if (source.includes('import fs from "node:fs"')) {
    source = source.replace(
      /import fs from "node:fs";\n/,
      'import fs from "node:fs";\nimport { readApiRouteSources } from "./helpers/api-route-sources.ts";\n',
    );
  } else if (source.includes('import { readFileSync } from "node:fs"')) {
    source = source.replace(
      /import { readFileSync } from "node:fs";\n/,
      'import { readFileSync } from "node:fs";\nimport { readApiRouteSources } from "./helpers/api-route-sources.ts";\n',
    );
  } else {
    source = source.replace(
      /import assert from "node:assert\/strict";\n/,
      'import assert from "node:assert/strict";\nimport { readApiRouteSources } from "./helpers/api-route-sources.ts";\n',
    );
  }

  source = source
    .replace(/const serverSource = fs\.readFileSync\("server\.ts", "utf8"\);/g, "const serverSource = readApiRouteSources();")
    .replace(/const serverSource = readFileSync\("server\.ts", "utf-8"\);/g, "const serverSource = readApiRouteSources();")
    .replace(/const serverSource = fs\.readFileSync\("server\.ts", "utf-8"\);/g, "const serverSource = readApiRouteSources();");

  fs.writeFileSync(filePath, source);
  console.log("patched", file);
}
