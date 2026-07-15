import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("avatar-refresh-persistence", () => {
  const avatarActionsSource = fs.readFileSync("src/app/hooks/usePlatformAvatarActions.ts", "utf8");
  const academicProfileSource = fs.readFileSync("src/hooks/useAcademicProfile.ts", "utf8");
  const profileRoutesSource = fs.readFileSync("src/routes/profile-routes.ts", "utf8");
  const userMappersSource = fs.readFileSync("src/server/mappers/user-mappers.ts", "utf8");
  const uploadthingSource = fs.readFileSync("src/uploadthing.ts", "utf8");

  assert.match(avatarActionsSource, /await api\.updateAcademicAvatar\(uploadedAvatarUrl\)/);
  assert.doesNotMatch(
    academicProfileSource,
    /api\.updateAcademicProfile\(\{[\s\S]*?avatarUrl:\s*academicProfileForm\.avatarUrl/,
  );
  assert.match(profileRoutesSource, /persistUserAvatarUrl\(authUser, avatarUrl\);\s*api\.invalidateAuthUserCache/);
  assert.match(profileRoutesSource, /app\.delete\("\/api\/me\/avatar"[\s\S]*?invalidateAuthUserCache\(authUser\.id\)/);
  assert.match(userMappersSource, /profile:\s*toAcademicProfile\(\{ \.\.\.profile, avatarUrl: dbUser\.avatarUrl \}\)/);
  assert.match(uploadthingSource, /invalidateAuthUserCache\(metadata\.userId\)/);
});
