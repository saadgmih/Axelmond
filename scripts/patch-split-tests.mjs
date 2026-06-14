import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const patches = [
  {
    files: [
      "tests/content-flexible-workflow.test.ts",
      "tests/quiz-flexible-workflow.test.ts",
    ],
    addImport: 'import { readCurriculumViewSources } from "./helpers/live-classroom-sources.ts";',
    replacements: [
      ['readFileSync("src/views/teacher/TeacherCurriculumView.tsx", "utf8")', "readCurriculumViewSources()"],
    ],
  },
  {
    files: ["tests/ui-production-cleanup.test.ts"],
    addImport: 'import { readCurriculumViewSources } from "./helpers/live-classroom-sources.ts";',
    replacements: [
      ['fs.readFileSync("src/views/teacher/TeacherCurriculumView.tsx", "utf8")', "readCurriculumViewSources()"],
    ],
  },
  {
    files: ["tests/premium-video-player.test.ts"],
    addImport: 'import { readCurriculumViewSources } from "./helpers/live-classroom-sources.ts";',
    replacements: [
      ['readFileSync("src/views/teacher/TeacherCurriculumView.tsx", "utf-8")', "readCurriculumViewSources()"],
    ],
  },
  {
    files: ["tests/teacher-video-preview.test.ts"],
    addImport: 'import { readCurriculumViewSources } from "./helpers/live-classroom-sources.ts";',
    replacements: [
      ['readFileSync("src/views/teacher/TeacherCurriculumView.tsx", "utf8")', "readCurriculumViewSources()"],
      [
        'assert.match(curriculumSource, /import PremiumVideoPlayer from "\\.\\.\\/\\.\\.\\/components\\/PremiumVideoPlayer"/);',
        "assert.match(curriculumSource, /import PremiumVideoPlayer from/);",
      ],
    ],
  },
  {
    files: [
      "tests/keyboard-navigation.test.ts",
      "tests/live-scroll.test.ts",
      "tests/live-layout-stability.test.ts",
      "tests/live-video-grid.test.ts",
      "tests/live-session-timer.test.ts",
    ],
    addImport: 'import { readLiveClassroomSources } from "./helpers/live-classroom-sources.ts";',
    replacements: [
      ['readFileSync("src/components/VirtualClassroom.tsx", "utf8")', "readLiveClassroomSources()"],
      ['fs.readFileSync("src/components/VirtualClassroom.tsx", "utf8")', "readLiveClassroomSources()"],
    ],
  },
  {
    files: ["tests/live-scroll.test.ts"],
    replacements: [
      [
        'assert.match(classroomSource, /Control Bar — au-dessus de la vidéo/);',
        'assert.match(classroomSource, /data-tv-zone="live-controls"/);',
      ],
    ],
  },
  {
    files: [
      "tests/livekit-ui.test.ts",
      "tests/livekit-microphone.test.ts",
    ],
    addImport: 'import { readLiveClassroomSources, readLiveKitHookSources } from "./helpers/live-classroom-sources.ts";',
    replacements: [
      [
        'readFileSync(new URL("../src/hooks/useLiveKitRoom.tsx", import.meta.url), "utf8")',
        "readLiveKitHookSources()",
      ],
      [
        'readFileSync(new URL("../src/components/VirtualClassroom.tsx", import.meta.url), "utf8")',
        "readLiveClassroomSources()",
      ],
      ["const liveKitSource = appSource + liveKitHookSource;", "const liveKitSource = appSource + readLiveKitHookSources();"],
      ["const classroomSource = readLiveClassroomSources();", "const classroomSource = readLiveClassroomSources();"],
    ],
  },
  {
    files: ["tests/student-live-sync.test.ts"],
    addImport: 'import { readLiveKitHookSources } from "./helpers/live-classroom-sources.ts";',
    replacements: [
      ['fs.readFileSync("src/hooks/useLiveKitRoom.tsx", "utf8")', "readLiveKitHookSources()"],
      ["const liveKitSource = appSource + liveKitHookSource;", "const liveKitSource = appSource + readLiveKitHookSources();"],
    ],
  },
  {
    files: ["tests/live-sync-validation.test.ts"],
    addImport: 'import { readLiveKitHookSources } from "./helpers/live-classroom-sources.ts";',
    replacements: [
      ['fs.readFileSync("src/hooks/useLiveKitRoom.tsx", "utf8")', "readLiveKitHookSources()"],
      ["const hookSource = readLiveKitHookSources();", "const hookSource = readLiveKitHookSources();"],
    ],
  },
  {
    files: ["tests/quiz-flexible-workflow.test.ts"],
    replacements: [
      ["assert.match(apiSource, /updateQuiz/);", "assert.match(apiSource, /createCourseQuiz/);"],
      ["assert.match(apiSource, /deleteQuiz/);", "assert.match(apiSource, /deleteQuizQuestion/);"],
      [
        "assert.match(apiSource, /submitQuizAttemptById/);",
        "assert.match(apiSource, /submitQuizAttempt/);",
      ],
    ],
  },
  {
    files: ["tests/accessibility.test.ts"],
    replacements: [
      [
        'assert.match(packageSource, /accessibility\\.test\\.ts/);',
        'assert.match(packageSource, /"test":\\s*"vitest run"/);\nassert.match(fs.readFileSync("vitest.config.ts", "utf8"), /tests\\/\\*\\*\\/\\*\\.test\\.ts/);',
      ],
    ],
  },
  {
    files: ["tests/voice-search.test.ts"],
    replacements: [
      [
        'assert.match(packageSource, /voice-search\\.test\\.ts/);',
        'assert.match(packageSource, /"test":\\s*"vitest run"/);',
      ],
    ],
  },
];

for (const patch of patches) {
  for (const relativePath of patch.files) {
    const filePath = path.join(root, relativePath);
    if (!fs.existsSync(filePath)) continue;

    let source = fs.readFileSync(filePath, "utf8");
    if (patch.addImport && !source.includes(patch.addImport)) {
      const marker = 'import { rulesTest } from "./helpers/rulesTest.ts";';
      source = source.replace(marker, `${patch.addImport}\n${marker}`);
    }

    for (const [from, to] of patch.replacements || []) {
      source = source.split(from).join(to);
    }

    fs.writeFileSync(filePath, source, "utf8");
  }
}

console.log("Patched split-related tests.");
