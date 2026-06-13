import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const testsDir = path.join(root, "tests");

for (const file of fs.readdirSync(testsDir)) {
  if (!file.endsWith(".test.ts")) continue;
  const filePath = path.join(testsDir, file);
  let src = fs.readFileSync(filePath, "utf8");
  if (!src.includes('readFileSync("src/App.tsx"') && !src.includes("readFileSync('src/App.tsx'") && !src.includes('readFileSync("src/App.tsx", "utf-8")')) {
    continue;
  }

  if (!src.includes("readAppSources")) {
    if (src.includes('from "./helpers/api-route-sources.ts"')) {
      src = src.replace(
        /import \{([^}]+)\} from "\.\/helpers\/api-route-sources\.ts";/,
        'import {$1, readAppSources } from "./helpers/app-sources.ts";',
      );
    } else if (src.includes('from "node:fs"')) {
      src = src.replace(
        /import ([^\n]+) from "node:fs";/,
        'import $1 from "node:fs";\nimport { readAppSources } from "./helpers/app-sources.ts";',
      );
    } else {
      src = `import { readAppSources } from "./helpers/app-sources.ts";\n` + src;
    }
  }

  src = src.replace(/readFileSync\("src\/App\.tsx", "utf-8"\)/g, "readAppSources()");
  src = src.replace(/readFileSync\("src\/App\.tsx", "utf8"\)/g, "readAppSources()");
  src = src.replace(/readFileSync\('src\/App\.tsx', "utf8"\)/g, "readAppSources()");
  src = src.replace(/readFileSync\("src\/App\.tsx", "utf-8"\)/g, "readAppSources()");
  src = src.replace(/readFileSync\(new URL\("\.\.\/src\/App\.tsx", import\.meta\.url\), "utf8"\)/g, "readAppSources()");

  fs.writeFileSync(filePath, src);
  console.log("updated", file);
}
