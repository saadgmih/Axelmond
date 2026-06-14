import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targets = [
  "src/routes",
  "src/messaging-routes.ts",
  "src/mobile-api-routes.ts",
];

const replacements = [
  ["(req as any).authUser as AppUser", "getAuthUser(req)"],
  ["(req as any).authUser", "getAuthUser(req)"],
];

function collectFiles(entry) {
  const resolved = path.join(root, entry);
  if (!fs.existsSync(resolved)) return [];
  const stat = fs.statSync(resolved);
  if (stat.isFile()) return [resolved];
  const files = [];
  for (const name of fs.readdirSync(resolved)) {
    if (!name.endsWith(".ts")) continue;
    files.push(...collectFiles(path.join(entry, name)));
  }
  return files;
}

let changed = 0;
for (const entry of targets) {
  for (const filePath of collectFiles(entry)) {
    let source = fs.readFileSync(filePath, "utf8");
    if (!source.includes("(req as any).authUser")) continue;

    const original = source;
    for (const [from, to] of replacements) {
      source = source.split(from).join(to);
    }

    if (!source.includes('from "../server/route-types"') && !source.includes('from "./server/route-types"')) {
      const importLine = filePath.includes(`${path.sep}routes${path.sep}`)
        ? 'import { getAuthUser } from "../server/route-types";\n'
        : 'import { getAuthUser } from "./server/route-types";\n';
      source = source.replace(/^import type \{ Express \} from "express";\n/, `$&${importLine}`);
      if (!source.includes("getAuthUser")) {
        source = importLine + source;
      }
    }

    if (source.includes("import type { AppUser }") && !source.match(/AppUser[^;]*;/)) {
      source = source.replace(/\nimport type \{ AppUser \}[^\n]+\n/g, "\n");
    }

    if (source !== original) {
      fs.writeFileSync(filePath, source);
      changed += 1;
      console.log(`updated ${path.relative(root, filePath)}`);
    }
  }
}

console.log(`auth typing migration: ${changed} file(s)`);
