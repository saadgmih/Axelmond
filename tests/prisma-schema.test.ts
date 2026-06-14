import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("prisma-schema", () => {
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");

  assert.match(schema, /schemas\s*=\s*\["AxelmondResearchLab"\]/);
  assert.match(schema, /@@schema\("AxelmondResearchLab"\)/);
});
