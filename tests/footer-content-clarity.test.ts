import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("footer-content-clarity", () => {
  const footerPageFiles = [
    "src/components/ContactView.tsx",
    "src/components/CookiesView.tsx",
    "src/components/LegalView.tsx",
    "src/components/PrivacyView.tsx",
    "src/components/SupportView.tsx",
    "src/components/TermsView.tsx",
  ];

  const footerSource = footerPageFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");

  assert.doesNotMatch(footerSource, /verification@axelmond\.com/);
  assert.doesNotMatch(footerSource, /minimum 8 caractères/);
  assert.doesNotMatch(footerSource, /Les étudiants doivent contacter l'administration/);
  assert.doesNotMatch(footerSource, /\bARL\b/);
  assert.doesNotMatch(footerSource, /analytics_session|theme_preference|user_preferences/);

  const supportViewSource = fs.readFileSync("src/components/SupportView.tsx", "utf8");
  assert.match(supportViewSource, /Sécurité du compte/);
  assert.match(supportViewSource, /Mot de passe oublié \?/);

  const termsViewSource = fs.readFileSync("src/components/TermsView.tsx", "utf8");
  assert.match(termsViewSource, /minimum 12 caractères/);

  const contactViewSource = fs.readFileSync("src/components/ContactView.tsx", "utf8");
  for (const email of [
    "contact@axelmond.com",
    "support@axelmond.com",
    "admissions@axelmond.com",
    "billing@axelmond.com",
    "privacy@axelmond.com",
    "legal@axelmond.com",
  ]) {
    assert.match(contactViewSource, new RegExp(email.replace(".", "\\.")));
  }

  const legalViewSource = fs.readFileSync("src/components/LegalView.tsx", "utf8");
  assert.match(legalViewSource, /legal@axelmond\.com/);
  assert.match(legalViewSource, /privacy@axelmond\.com/);
  assert.match(legalViewSource, /support@axelmond\.com/);

  const cookiesViewSource = fs.readFileSync("src/components/CookiesView.tsx", "utf8");
  assert.match(cookiesViewSource, /refresh_token/);
  assert.match(cookiesViewSource, /csrf_token/);
  assert.match(cookiesViewSource, /axelmond-course-video-volume/);
});
