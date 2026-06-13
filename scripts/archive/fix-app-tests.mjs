import fs from "node:fs";
import path from "node:path";

const testsDir = path.join(process.cwd(), "tests");

for (const file of fs.readdirSync(testsDir)) {
  if (!file.endsWith(".test.ts")) continue;
  const filePath = path.join(testsDir, file);
  let src = fs.readFileSync(filePath, "utf8");
  const original = src;

  src = src.replace(
    /import \{ readApiRouteSources\s*,\s*readServerBootstrapSources\s*,\s*readAppSources \} from "\.\/helpers\/app-sources\.ts";/g,
    'import { readApiRouteSources, readServerBootstrapSources } from "./helpers/api-route-sources.ts";\nimport { readAppSources } from "./helpers/app-sources.ts";',
  );
  src = src.replace(
    /import \{ readApiRouteSources\s*,\s*readAppSources \} from "\.\/helpers\/app-sources\.ts";/g,
    'import { readApiRouteSources } from "./helpers/api-route-sources.ts";\nimport { readAppSources } from "./helpers/app-sources.ts";',
  );
  src = src.replace(/fs\.readAppSources\(\)/g, "readAppSources()");

  if (src !== original) {
    fs.writeFileSync(filePath, src);
    console.log("fixed", file);
  }
}
