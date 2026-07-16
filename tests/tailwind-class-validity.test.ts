import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rulesTest } from "./helpers/rulesTest";

rulesTest("known invalid Tailwind classes are absent", () => {
  const files = [
    "src/components/ContactView.tsx",
    "src/components/SupportView.tsx",
    "src/components/SupportTicketForm.tsx",
  ];
  const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(source, /(?:border|bg)-slate-850|text-slate-350/);
  assert.match(source, /border-slate-800/);
  assert.match(source, /text-slate-300/);
});
