import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("module-vocabulary", () => {
  const visibleFiles = [
    "src/components/AboutView.tsx",
    "src/components/AuthScreen.tsx",
    "src/components/ContactView.tsx",
    "src/components/LegalView.tsx",
    "src/components/PrivacyView.tsx",
    "src/components/Sidebar.tsx",
    "src/components/SupportView.tsx",
    "src/components/TermsView.tsx",
    "src/components/PaymentModal.tsx",
    "src/components/AITutorChat.tsx",
    "src/components/CookiesView.tsx",
    "src/components/VirtualClassroom.tsx",
  ];

  const offenders: string[] = [];

  for (const file of visibleFiles) {
    const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    source.split(/\r?\n/).forEach((line, index) => {
      const normalizedLine = line.replace(/\ben cours\b/gi, "");
      if (!/\bcours\b/i.test(normalizedLine)) return;
      offenders.push(`${file}:${index + 1}: ${line.trim()}`);
    });
  }

  assert.equal(
    offenders.length,
    0,
    `Le vocabulaire visible doit utiliser "module" au lieu de "cours":\n${offenders.join("\n")}`,
  );
});
