import fs from "fs";
const path = "C:/Users/saadg/Desktop/AxelmondResearchLab/scripts/extract-curriculum-view.mjs";
let s = fs.readFileSync(path, "utf8");
s = s.replace(
  `const statePairs = [...appBefore.matchAll(/const \\[(\\w+), (set\\w+)\\]/g)]
  .filter((m) => uses(m[1], jsxInner) || uses(m[2], jsxInner));`,
  `const statePairs = [...appBefore.matchAll(/const \\[(\\w+), (set\\w+)\\]/g)]
  .map((m) => [m[1], m[2]])
  .filter(([name, setter]) => uses(name, jsxInner) || uses(setter, jsxInner));`,
);
s = s.replace(
  `const propLines = [];
for (const m of statePairs) { const name = m[0]; const setter = m[1]; {
  const t = typeMap[name] || "unknown";
  propLines.push(\`  \${name}: \${t};\`);
  if (uses(setter, jsxInner)) {
    const st = typeMap[name] ? \`(value: \${typeMap[name]}) => void\` : "(value: unknown) => void";
    propLines.push(\`  \${setter}: \${st};\`);
  }
}`,
  `const propLines = [];
for (const [name, setter] of statePairs) {
  const t = typeMap[name] || "unknown";
  propLines.push(\`  \${name}: \${t};\`);
  if (uses(setter, jsxInner)) {
    const st = typeMap[name] ? \`(value: \${typeMap[name]}) => void\` : "(value: unknown) => void";
    propLines.push(\`  \${setter}: \${st};\`);
  }
}`,
);
fs.writeFileSync(path, s);
