import fs from "node:fs";
import path from "node:path";

const testsDir = path.join(process.cwd(), "tests");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (entry.isFile() && entry.name.endsWith(".test.ts")) return [fullPath];
    return [];
  });
}

function splitImports(source) {
  let importBlock = "";
  let remaining = source;

  while (true) {
    remaining = remaining.replace(/^\s+/, "");
    if (!remaining.startsWith("import ")) break;

    const match = remaining.match(/^import[\s\S]*?;\n?/);
    if (!match) break;

    importBlock += match[0];
    remaining = remaining.slice(match[0].length);
  }

  return { importBlock: importBlock.trimEnd(), body: remaining.trimEnd() };
}

function wrapFile(filePath) {
  const relative = path.relative(testsDir, filePath).replace(/\\/g, "/");
  if (relative.startsWith("helpers/")) return false;

  let source = fs.readFileSync(filePath, "utf8");
  if (/import\s+\{\s*test\s*\}\s+from\s+["']vitest["']/.test(source)) return false;
  if (/import\s+test\s+from\s+["']node:test["']/.test(source)) return false;
  if (/rulesTest\s*\(/.test(source)) return false;

  const { importBlock, body } = splitImports(source);
  if (!importBlock) return false;

  const cleanedBody = body.replace(/\nconsole\.log\([^)]+\);\s*$/m, "");
  const testName = relative.replace(/\.test\.ts$/, "").replace(/\//g, " / ");
  const wrapped = `${importBlock}\nimport { rulesTest } from "./helpers/rulesTest.ts";\n\nrulesTest("${testName}", () => {\n${cleanedBody}\n});\n`;
  fs.writeFileSync(filePath, wrapped, "utf8");
  return true;
}

let wrapped = 0;
for (const filePath of walk(testsDir)) {
  if (wrapFile(filePath)) {
    wrapped += 1;
    console.log("wrapped", path.relative(testsDir, filePath).replace(/\\/g, "/"));
  }
}
console.log(`Done. Wrapped ${wrapped} files.`);
