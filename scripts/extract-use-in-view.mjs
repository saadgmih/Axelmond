import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const components = [
  "src/components/LegalView.tsx",
  "src/components/PrivacyView.tsx",
  "src/components/CookiesView.tsx",
  "src/components/TermsView.tsx",
  "src/components/ResearchView.tsx",
  "src/components/PublicationsView.tsx",
  "src/components/AboutView.tsx",
];

const useInViewBlock = /\/\/ ─── Intersection observer[\s\S]*?return \{ ref, inView \};\s*\}\s*/;

for (const relativePath of components) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) continue;

  let source = fs.readFileSync(filePath, "utf8");
  if (!source.includes("function useInView(")) continue;

  source = source.replace(useInViewBlock, "");
  if (!source.includes('from "../hooks/useInView"')) {
    source = source.replace(
      /^import React(?:, \{[^}]+\})? from "react";\n/m,
      (match) => `${match}import { useInView } from "../hooks/useInView";\n`,
    );
  }

  fs.writeFileSync(filePath, source);
  console.log(`updated ${relativePath}`);
}
