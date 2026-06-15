import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("architecture-score-guards", () => {
  const root = process.cwd();
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
  const registerSource = fs.readFileSync("src/routes/register-api-routes.ts", "utf8");
  const authScreen = fs.readFileSync("src/components/AuthScreen.tsx", "utf8");
  const typesSource = fs.readFileSync("src/types.ts", "utf8");
  const syllabusSource = fs.readFileSync("src/course-syllabus-modules.ts", "utf8");
  const usePlatformApp = fs.readFileSync("src/app/usePlatformApp.ts", "utf8");
  const apiSource = readApiRouteSources();

  const guards: Array<{ id: string; ok: boolean; weight: number }> = [
    {
      id: "messaging-routes-in-tree",
      ok: fs.existsSync(path.join(root, "src/routes/messaging-routes.ts")),
      weight: 3,
    },
    {
      id: "mobile-routes-in-tree",
      ok: fs.existsSync(path.join(root, "src/routes/mobile-api-routes.ts")),
      weight: 2,
    },
    {
      id: "register-api-routes-unified",
      ok: /registerMessagingRoutes/.test(registerSource) && /registerMobileApiRoutes/.test(registerSource),
      weight: 3,
    },
    {
      id: "canonical-app-user",
      ok: fs.existsSync("src/shared/app-user.ts") && !/export interface AppUser/.test(authScreen),
      weight: 4,
    },
    {
      id: "course-modules-json-dropped",
      ok: !/modules\s+Json/.test(schema) && /model CourseModule/.test(schema),
      weight: 5,
    },
    {
      id: "relational-modules-only",
      ok: !/parseCourseModulesJson/.test(syllabusSource) && !/COURSE_MODULES_READ_RELATIONAL/.test(syllabusSource),
      weight: 4,
    },
    {
      id: "route-mappers-split",
      ok:
        fs.existsSync("src/server/mappers/catalog-mappers.ts") &&
        fs.existsSync("src/server/mappers/user-mappers.ts"),
      weight: 3,
    },
    {
      id: "platform-slice-hooks",
      ok:
        fs.existsSync("src/app/hooks/usePlatformCatalogData.ts") &&
        fs.existsSync("src/app/hooks/usePlatformAvatarActions.ts") &&
        fs.existsSync("src/app/hooks/usePlatformTeacherWorkspace.ts"),
      weight: 3,
    },
    {
      id: "no-orphan-chat-message-type",
      ok: !/export interface ChatMessage/.test(typesSource),
      weight: 2,
    },
    {
      id: "use-platform-app-srp",
      ok: usePlatformApp.split("\n").length <= 520,
      weight: 3,
    },
    {
      id: "api-source-includes-messaging",
      ok: /createNotificationsForUsers/.test(apiSource),
      weight: 2,
    },
  ];

  const missing = guards.filter((guard) => !guard.ok).map((guard) => guard.id);
  assert.equal(missing.length, 0, `Architecture score guards failed: ${missing.join(", ")}`);

  const baseline = 75;
  const uplift = guards.reduce((sum, guard) => sum + (guard.ok ? guard.weight : 0), 0);
  const estimatedArchitecture = Math.min(100, baseline + uplift);
  assert.ok(estimatedArchitecture >= 100, `Estimated architecture score ${estimatedArchitecture}/100 is below 100/100`);
});
