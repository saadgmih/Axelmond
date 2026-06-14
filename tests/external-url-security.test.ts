import assert from "node:assert/strict";
import { sanitizeAcademicLinks } from "../src/academic-profile.ts";
import { sanitizeCourseAttachmentUrl, sanitizeHttpsUrl } from "../src/external-url-security.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("external-url-security", () => {
  assert.equal(sanitizeHttpsUrl("javascript:alert(1)"), null);
  assert.equal(sanitizeHttpsUrl("https://linkedin.com/in/demo"), "https://linkedin.com/in/demo");
  assert.equal(sanitizeHttpsUrl("http://example.com"), null);
  assert.equal(sanitizeCourseAttachmentUrl("https://utfs.io/f/demo.pdf"), "https://utfs.io/f/demo.pdf");
  assert.equal(sanitizeCourseAttachmentUrl("https://evil.example.com/file.pdf"), null);

  const links = sanitizeAcademicLinks({
    linkedIn: "https://linkedin.com/in/demo",
    orcid: "https://orcid.org/0000-0000-0000-0000",
    googleScholar: "https://scholar.google.com/citations?user=demo",
    website: "https://example.edu/lab",
  });
  assert.equal(links.linkedIn, "https://linkedin.com/in/demo");
  assert.equal(links.orcid, "https://orcid.org/0000-0000-0000-0000");
  assert.equal(links.googleScholar, "https://scholar.google.com/citations?user=demo");
  assert.equal(links.website, "https://example.edu/lab");

  const rejected = sanitizeAcademicLinks({
    linkedIn: "javascript:alert(1)",
    website: "ftp://example.edu",
  });
  assert.deepEqual(rejected, {});
});
