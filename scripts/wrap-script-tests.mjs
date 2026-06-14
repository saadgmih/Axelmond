import fs from "node:fs";
import path from "node:path";

const testsDir = "tests";
const files = [];

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const entry = path.join(dir, name);
    if (fs.statSync(entry).isDirectory()) walk(entry);
    else if (name.endsWith(".test.ts") && !name.endsWith(".test.tsx")) files.push(entry);
  }
}

walk(testsDir);

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  if (/rulesTest\s*\(|^\s*test\s*\(|^\s*describe\s*\(/m.test(src)) continue;

  const base = path.basename(file, ".test.ts");
  const helperImport = file.replace(/\\/g, "/").includes("tests/http/")
    ? 'import { rulesTest } from "../helpers/rulesTest.ts";\n'
    : 'import { rulesTest } from "./helpers/rulesTest.ts";\n';

  const lines = src.split("\n");
  let importEnd = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith("import ") || line === "") importEnd = i + 1;
    else break;
  }

  const imports = lines.slice(0, importEnd).join("\n");
  const body = lines.slice(importEnd).join("\n").trimEnd();
  const wrapped = `${imports}\n${helperImport}\nrulesTest("${base}", () => {\n${body}\n});\n`;
  fs.writeFileSync(file, wrapped);
  console.log("wrapped", file);
}
