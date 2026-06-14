/**
 * Remove unused imports, then rename unused destructured bindings to `prop: _prop`.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function run(command) {
  console.log(`[fix-eslint-unused] ${command}`);
  execSync(command, { cwd: root, stdio: "inherit", env: process.env });
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function readReport() {
  const raw = execSync("npx eslint . --max-warnings 9999 -f json", {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  return JSON.parse(stripBom(raw));
}

function fixUnusedBinding(line, name, column, message) {
  const catchMatch = line.match(new RegExp(`catch\\s*\\(\\s*${name}\\s*(?::[^)]*)?\\)`));
  if (catchMatch) {
    return line.replace(catchMatch[0], "catch (_err)");
  }

  const index = column - 1;
  if (line.slice(index, index + name.length) !== name) {
    return line;
  }

  const before = line.slice(0, index);
  const after = line.slice(index + name.length);

  if (before.endsWith(":") || before.endsWith(": ")) {
    return line;
  }

  const isArg = message.includes("is defined but never used");
  const isDestructuring =
    before.includes("{") || /^\s+[A-Za-z][A-Za-z0-9]*,?\s*$/.test(line) || /^\s+[A-Za-z][A-Za-z0-9]*,?\s*\/\//.test(line);

  if (!isArg && isDestructuring) {
    return `${before}${name}: _${name}${after}`;
  }

  return `${before}_${name}${after}`;
}

run("npx eslint . --max-warnings 9999 --fix");

for (let pass = 1; pass <= 6; pass++) {
  const report = readReport();
  const fileEdits = new Map();
  let fixes = 0;

  for (const fileResult of report) {
    const unusedMessages = fileResult.messages.filter((message) => message.ruleId === "unused-imports/no-unused-vars");
    if (unusedMessages.length === 0) continue;

    const filePath = fileResult.filePath;
    if (!filePath.includes(`${path.sep}src${path.sep}`) && !filePath.includes(`${path.sep}tests${path.sep}`)) {
      continue;
    }

    const lines = fs.readFileSync(filePath, "utf8").split("\n");
    let changed = false;

    for (const message of unusedMessages) {
      const lineIndex = message.line - 1;
      const nextLine = fixUnusedBinding(
        lines[lineIndex],
        message.message.match(/'([^']+)'/)?.[1] ?? "",
        message.column,
        message.message,
      );
      if (nextLine !== lines[lineIndex]) {
        lines[lineIndex] = nextLine;
        changed = true;
        fixes++;
      }
    }

    if (changed) {
      fileEdits.set(filePath, lines.join("\n"));
    }
  }

  for (const [filePath, content] of fileEdits) {
    fs.writeFileSync(filePath, content);
  }

  console.log(`[fix-eslint-unused] Pass ${pass}: renamed ${fixes} unused bindings`);
  if (fixes === 0) break;
}

run("npx eslint . --max-warnings 9999 --fix");
run("npx eslint . --max-warnings 9999");
