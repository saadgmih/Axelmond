import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("legal-documents-pdf", () => {
  const termsSource = fs.readFileSync("src/components/TermsView.tsx", "utf8");
  const panelSource = fs.readFileSync("src/components/legal/LegalDocumentPdfPanel.tsx", "utf8");
  const viewerSource = fs.readFileSync("src/components/PdfLessonViewer.tsx", "utf8");
  const dataSource = fs.readFileSync("src/data/legalDocuments.ts", "utf8");
  const legalStyleSource = fs.readFileSync("docs/legal-documents/source/performance-legal-style.tex", "utf8");

  for (const fileName of ["privacy-policy", "cookies-policy", "help-center", "contact-sheet"]) {
    assert.ok(fs.existsSync(`public/legal-documents/${fileName}.pdf`), `${fileName}.pdf must be public`);
    assert.ok(fs.existsSync(`docs/legal-documents/source/${fileName}.tex`), `${fileName}.tex must be kept`);
  }

  assert.match(dataSource, /Politique de confidentialité/);
  assert.match(dataSource, /Politique des cookies/);
  assert.match(dataSource, /Centre d'aide/);
  assert.match(dataSource, /Contact/);
  assert.match(dataSource, /\/legal-documents\/privacy-policy\.pdf/);
  assert.match(dataSource, /\/legal-documents\/cookies-policy\.pdf/);
  assert.match(dataSource, /\/legal-documents\/help-center\.pdf/);
  assert.match(dataSource, /\/legal-documents\/contact-sheet\.pdf/);
  assert.match(legalStyleSource, /05C2A5/);
  assert.doesNotMatch(legalStyleSource, /6C5CFF|149DFF/);

  assert.match(termsSource, /LEGAL_DOCUMENTS\.map/);
  assert.match(termsSource, /setSelectedLegalDocumentKey\(document\.key\)/);
  assert.match(termsSource, /LegalDocumentPdfPanel/);

  assert.match(panelSource, /PdfLessonViewer/);
  assert.match(panelSource, /allowDownload/);
  assert.match(panelSource, /downloadFileName=\{document\.fileName\}/);

  assert.match(viewerSource, /documentUrl/);
  assert.match(viewerSource, /allowDownload/);
  assert.match(viewerSource, /getFreshSessionToken/);
  assert.match(viewerSource, /\/api\/lesson-contents\/\$\{contentId\}\/document/);
  assert.doesNotMatch(viewerSource, /download=\{title \|\| "document\.pdf"\}/);

  console.log("Legal document PDF rules passed");
});
