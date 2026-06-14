import assert from "node:assert/strict";
import fs from "node:fs";

import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("async-effect-guard", () => {
  const guardSource = fs.readFileSync("src/hooks/useAsyncEffectGuard.ts", "utf8");
  const platformAppSource = fs.readFileSync("src/app/usePlatformApp.ts", "utf8");
  const curriculumSource = fs.readFileSync("src/hooks/useTeacherCurriculum.tsx", "utf8");
  const academicSource = fs.readFileSync("src/hooks/useAcademicProfile.ts", "utf8");
  const appSource = fs.readFileSync("src/App.tsx", "utf8");

  assert.match(guardSource, /mountedRef/);
  assert.match(guardSource, /startRequest/);
  assert.match(guardSource, /isActive\(\)/);

  assert.match(platformAppSource, /useAsyncEffectGuard/);
  assert.match(platformAppSource, /isActive\(\)/);
  assert.match(curriculumSource, /useAsyncEffectGuard/);
  assert.match(curriculumSource, /isActive\(\)/);
  assert.match(academicSource, /useAsyncEffectGuard/);
  assert.match(academicSource, /isActive\(\)/);

  assert.match(appSource, /PlatformAppRoot/);
  assert.doesNotMatch(appSource, /useEffect\(\(\)\s*=>\s*\{[\s\S]*Promise\.all/);

  console.log("Async effect guard tests passed");
});
