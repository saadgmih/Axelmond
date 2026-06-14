import assert from "node:assert/strict";
import {
  isAvatarUrlFieldInvalid,
  sanitizeAcademicLinks,
  sanitizeAcademicProfileInput,
  sanitizeAvatarUrl,
  sanitizeDomainList,
} from "../src/academic-profile.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("academic-profile", () => {
  assert.deepEqual(sanitizeDomainList("Mathématiques, IA\nData Science"), ["Mathématiques", "IA", "Data Science"]);
  assert.deepEqual(sanitizeDomainList([" Physique ", "", "Chimie"]), ["Physique", "Chimie"]);

  assert.deepEqual(
    sanitizeAcademicLinks({
      linkedIn: " https://www.linkedin.com/in/demo ",
      orcid: "https://orcid.org/0000-0000-0000-0000",
      googleScholar: "https://scholar.google.com/citations?user=demo",
      website: "https://axelmond.com",
      role: "ADMIN",
    }),
    {
      linkedIn: "https://www.linkedin.com/in/demo",
      orcid: "https://orcid.org/0000-0000-0000-0000",
      googleScholar: "https://scholar.google.com/citations?user=demo",
      website: "https://axelmond.com",
    },
  );

  const profile = sanitizeAcademicProfileInput({
    title: " Professeur ",
    department: " Informatique ",
    lab: " Axelmond Lab ",
    speciality: " IA ",
    teachingDomains: "Programmation, Machine Learning",
    researchDomains: ["IA générative", "Sécurité"],
    bio: "Bio courte",
    avatarUrl: " https://axelmond.com/avatar.png ",
    links: { website: "https://axelmond.com" },
    role: "ADMIN",
    userId: "other-user",
  });

  assert.equal(profile.title, "Professeur");
  assert.equal(profile.department, "Informatique");
  assert.deepEqual(profile.teachingDomains, ["Programmation", "Machine Learning"]);
  assert.deepEqual(profile.researchDomains, ["IA générative", "Sécurité"]);
  assert.equal(profile.avatarUrl, null);
  assert.equal("role" in profile, false);
  assert.equal("userId" in profile, false);

  assert.equal(sanitizeAvatarUrl("https://utfs.io/f/avatar.jpg"), "https://utfs.io/f/avatar.jpg");
  assert.equal(sanitizeAvatarUrl("https://evil.com/avatar.jpg"), null);
  assert.equal(isAvatarUrlFieldInvalid("https://evil.com/avatar.jpg"), true);
  assert.equal(isAvatarUrlFieldInvalid(""), false);

  const profileWithoutAvatar = sanitizeAcademicProfileInput({ title: "Professeur" });
  assert.equal(profileWithoutAvatar.avatarUrl, undefined);
});
