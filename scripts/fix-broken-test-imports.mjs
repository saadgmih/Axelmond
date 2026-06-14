import fs from "node:fs";

const brokenFiles = [
  "tests/rbac.test.ts",
  "tests/avatar-security.test.ts",
  "tests/business-race-guards.test.ts",
  "tests/email-verification.test.ts",
  "tests/messaging-validation.test.ts",
  "tests/push-endpoint-security.test.ts",
  "tests/student-objectives-validation.test.ts",
];

for (const file of brokenFiles) {
  let src = fs.readFileSync(file, "utf8");
  src = src.replace(
    /import \{\nimport \{ rulesTest \} from "\.\/helpers\/rulesTest\.ts";\n\nrulesTest\("[^"]+", \(\) => \{\n([\s\S]*?\n\}) from "([^"]+)";\n/,
    'import {\n$1} from "$2";\nimport { rulesTest } from "./helpers/rulesTest.ts";\n\nrulesTest("' + file.replace("tests/", "").replace(".test.ts", "") + '", () => {\n',
  );
  fs.writeFileSync(file, src);
  console.log("fixed", file);
}
