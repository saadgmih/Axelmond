import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = fs
  .readdirSync(path.join(root, "tests"))
  .filter((name) => name.startsWith("security-runtime-") && name.endsWith(".test.ts"))
  .concat(["mobile-api-runtime.test.ts"]);

for (const name of files) {
  const filePath = path.join(root, "tests", name);
  let source = fs.readFileSync(filePath, "utf8");
  if (!source.includes("process.exit(0)")) continue;

  if (!source.includes("skipSecurityRuntimeTests")) {
    source = source.replace(
      /from "\.\/helpers\/security-runtime-harness\.ts";/,
      'from "./helpers/security-runtime-harness.ts";\nimport { skipSecurityRuntimeTests } from "./helpers/security-runtime-harness.ts";',
    );
    if (!source.includes("skipSecurityRuntimeTests")) {
      source = source.replace(
        /from '\.\/helpers\/security-runtime-harness\.ts';/,
        "from './helpers/security-runtime-harness.ts';\nimport { skipSecurityRuntimeTests } from './helpers/security-runtime-harness.ts';",
      );
    }
  }

  source = source.replace(
    /if \(!isSecurityRuntimeDatabaseAvailable\(\)\) \{\s*console\.log\([^)]+\);\s*process\.exit\(0\);\s*\}/g,
    "if (skipSecurityRuntimeTests()) return;",
  );

  fs.writeFileSync(filePath, source);
  console.log(`patched ${name}`);
}
