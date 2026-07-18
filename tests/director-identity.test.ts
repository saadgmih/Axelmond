import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("director-identity", () => {
  assert.equal(fs.existsSync("public/director-oussama-el-abboudi.png"), true);
  assert.equal(fs.existsSync("public/director-oussama-el-abboudi-full.png"), true);
  assert.equal(fs.existsSync("public/director-oussama-el-abboudi-thinking.png"), true);
  assert.equal(fs.existsSync("public/director-oussama-footer.png"), true);
  assert.equal(fs.existsSync("public/director-oussama-avatar-160-d71a9347.jpg"), true);
  assert.equal(fs.existsSync("public/director-oussama-full-720-8e453474.jpg"), true);
  assert.equal(fs.existsSync("public/director-oussama-thinking-720-a43920b8.jpg"), true);
  assert.equal(fs.existsSync("public/director-oussama-footer-160-ce163101.jpg"), true);
  assert.equal(fs.existsSync("public/director-oussama-el-abboudi.jpg"), false);
  assert.equal(fs.existsSync("public/director-oussama-el-abboudi-full.jpg"), false);

  const profileSource = fs.readFileSync("src/content/director-profile.ts", "utf8");
  assert.match(profileSource, /Pr\. Oussama El Abboudi/);
  assert.match(profileSource, /Former aujourd'hui les talents de demain/);
  assert.match(profileSource, /\/assets\/director-oussama-avatar-160-d71a9347\.jpg/);
  assert.match(profileSource, /\/assets\/director-oussama-full-720-8e453474\.jpg/);
  assert.match(profileSource, /\/assets\/director-oussama-thinking-720-a43920b8\.jpg/);
  assert.match(profileSource, /founderPhotos/);
  assert.match(profileSource, /\/assets\/director-oussama-footer-160-ce163101\.jpg/);

  const identitySource = fs.readFileSync("src/components/DirectorIdentity.tsx", "utf8");
  assert.doesNotMatch(identitySource, /DirectorSidebarCard/);
  assert.doesNotMatch(identitySource, /DirectorWelcomeCard/);
  assert.doesNotMatch(identitySource, /DirectorFooterLine/);
  assert.match(identitySource, /DirectorFounderSection/);
  assert.match(identitySource, /DirectorAuthCard/);
  assert.match(identitySource, /founder-photo-carousel/);
  assert.match(identitySource, /snap-mandatory/);
  assert.match(identitySource, /scrollTo\(\{ left: track\.clientWidth \* nextIndex, behavior: "smooth" \}\)/);
  assert.match(identitySource, /Voir la photo précédente/);
  assert.match(identitySource, /Voir la photo suivante/);
  assert.match(identitySource, /aria-roledescription="carrousel"/);

  const expectedIntegrations = [["src/components/AboutView.tsx", /DirectorFounderSection/]] as const;

  for (const [file, pattern] of expectedIntegrations) {
    assert.match(fs.readFileSync(file, "utf8"), pattern);
  }

  const removedIntegrations = [
    ["src/components/Sidebar.tsx", /DirectorSidebarCard/],
    ["src/views/student/StudentDashboardView.tsx", /DirectorWelcomeCard/],
    ["src/views/teacher/TeacherDashboardView.tsx", /DirectorWelcomeCard/],
    ["src/components/AuthScreen.tsx", /DirectorAuthCard/],
  ] as const;

  for (const [file, pattern] of removedIntegrations) {
    assert.doesNotMatch(fs.readFileSync(file, "utf8"), pattern);
  }
});
