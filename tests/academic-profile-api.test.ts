import assert from "node:assert/strict";
import fs from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { readAppSources } from "./helpers/app-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("academic-profile-api", () => {
  const serverSource = readApiRouteSources();
  const appSource = readAppSources();
  const academicProfileHookSource = fs.readFileSync("src/hooks/useAcademicProfile.ts", "utf8");
  const appProfileBundle = appSource + academicProfileHookSource;
  const sidebarConfigSource = fs.readFileSync("src/navigation/sidebar-config.ts", "utf8");
  const profileViewerSource = fs.readFileSync("src/components/UserProfileViewer.tsx", "utf8");
  const profileDetailsSource = fs.readFileSync("src/components/profile/UserProfileDetails.tsx", "utf8");

  assert.match(serverSource, /ensureAcademicProfileForUser\(tx,\s*\{\s*id:\s*createdUser\.id/s);
  assert.match(serverSource, /app\.get\("\/api\/me\/profile",\s*requireAuth,\s*requireRbac/);
  assert.match(serverSource, /app\.get\("\/api\/users\/:userId\/profile",\s*requireAuth,\s*requireRbac/);
  assert.match(serverSource, /toConsultableUserProfile/);
  assert.match(serverSource, /"\/api\/me\/user-profile"/);
  assert.match(serverSource, /userProfileDetailsSchema/);
  assert.match(serverSource, /app\.put\("\/api\/me\/profile",\s*requireAuth,\s*requireRbac/);
  assert.match(serverSource, /app\.post\("\/api\/me\/avatar",\s*requireAuth,\s*requireRbac/);
  assert.match(serverSource, /AVATAR_URL_INVALID/);
  assert.match(serverSource, /persistUserAvatarUrl/);
  assert.match(serverSource, /isAvatarUrlFieldInvalid/);
  assert.match(serverSource, /app\.get\("\/api\/admin\/academic-profiles",\s*requireAuth,\s*requireAdmin/);
  assert.match(serverSource, /"role"\s+in\s+req\.body\s+\|\|\s+"userId"\s+in\s+req\.body/);
  assert.match(appSource, /teacherView === "academic-profile"/);
  assert.match(appProfileBundle, /api\.updateAcademicProfile\(\{/);
  assert.doesNotMatch(appProfileBundle, /api\.updateAcademicProfile\(\{[^}]*role/s);
  assert.match(sidebarConfigSource, /Mon Profil Académique/);
  assert.match(profileViewerSource, /UserProfileViewerProvider/);
  assert.match(profileViewerSource, /Consulter le profil de/);
  assert.match(profileDetailsSource, /Informations communes/);
  assert.match(profileDetailsSource, /Profil étudiant/);
  assert.doesNotMatch(profileDetailsSource, /<select/);
  assert.match(appSource, /<UserProfileViewerProvider\b/);
});
