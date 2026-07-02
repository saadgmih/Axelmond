import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("brand-green-theme", () => {
  const cssSource = fs.readFileSync("src/index.css", "utf8");
  assert.match(cssSource, /--pa-brand-500:\s*#05c2a5/i);
  assert.match(cssSource, /--color-indigo-500:\s*var\(--pa-brand-500\)/);
  assert.match(cssSource, /--color-violet-500:\s*var\(--pa-brand-500\)/);
  assert.match(cssSource, /--color-pink-500:\s*var\(--pa-brand-500\)/);
  assert.match(cssSource, /--color-blue-500:\s*var\(--pa-brand-500\)/);
  assert.match(cssSource, /--color-cyan-500:\s*var\(--pa-brand-500\)/);

  const emailSource = fs.readFileSync("src/email.ts", "utf8");
  assert.match(emailSource, /#05C2A5/);
  assert.doesNotMatch(emailSource, /#8b5cf6|#ec4899|#6366f1|#4c1d95|#9d174d/i);

  const logoSvg = fs.readFileSync("public/logo-symbol.svg", "utf8");
  const faviconSvg = fs.readFileSync("public/favicon.svg", "utf8");
  assert.match(logoSvg, /#05C2A5/);
  assert.match(faviconSvg, /#05C2A5/);
  assert.doesNotMatch(logoSvg, /#0ea5e9/i);
  assert.doesNotMatch(faviconSvg, /#0ea5e9/i);
});
