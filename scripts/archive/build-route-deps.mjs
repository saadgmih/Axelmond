/**
 * Build src/server/route-deps.ts from shared sections of server.ts
 * Run: node scripts/build-route-deps.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const serverLines = fs.readFileSync(path.join(root, "server.ts"), "utf8").split("\n");

const importBlock = serverLines.slice(0, 127).join("\n");

const bodyRanges = [
  [709, 791],
  [924, 1507],
  [1693, 2024],
];

const body = bodyRanges
  .map(([start, end]) => serverLines.slice(start - 1, end).join("\n"))
  .join("\n\n");

const depsContent = `${importBlock}

${body}
`;

const outPath = path.join(root, "src", "server", "route-deps.ts");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, depsContent);
console.log(`Wrote ${outPath} (${depsContent.split("\n").length} lines)`);
