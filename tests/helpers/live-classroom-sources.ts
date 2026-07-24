import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

/** Concatenate VirtualClassroom shell + extracted live classroom modules for static analysis tests. */
export function readLiveClassroomSources(): string {
  const parts = [
    "src/components/VirtualClassroom.tsx",
    "src/components/live/live-classroom-formatters.ts",
    "src/components/live/LiveClassroomHeader.tsx",
    "src/components/live/LiveStatsBar.tsx",
    "src/components/live/LiveControlBar.tsx",
    "src/components/live/LiveVideoStage.tsx",
    "src/components/live/LiveParticipantsPanel.tsx",
    "src/components/live/LiveChatPanel.tsx",
    "src/components/live/LiveAttendancePanel.tsx",
    "src/components/live/LiveToolsPanel.tsx",
    "src/hooks/useVirtualClassroomUI.ts",
  ];

  return parts
    .map((relativePath) => path.join(root, relativePath))
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => fs.readFileSync(filePath, "utf8"))
    .join("\n");
}

/** Concatenate useLiveKitRoom facade + extracted livekit modules for static analysis tests. */
export function readLiveKitHookSources(): string {
  const parts = [
    "src/hooks/useLiveKitRoom.tsx",
    "src/hooks/livekit/participant-sync.ts",
    "src/hooks/livekit/live-sync-state.ts",
    "src/hooks/livekit/live-sync-publish.ts",
    "src/hooks/livekit/useLiveKitConnection.ts",
    "src/hooks/livekit/useLiveMediaAttach.ts",
    "src/hooks/livekit/useLiveRoomControls.ts",
  ];

  return parts
    .map((relativePath) => path.join(root, relativePath))
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => fs.readFileSync(filePath, "utf8"))
    .join("\n");
}

/** Concatenate teacher curriculum view + step modules for static analysis tests. */
export function readCurriculumViewSources(): string {
  const parts = [
    "src/views/teacher/TeacherCurriculumView.tsx",
    "src/views/teacher/curriculum-types.ts",
    "src/views/teacher/curriculum-steps/CurriculumStepper.tsx",
    "src/views/teacher/curriculum-steps/CurriculumModulesStep.tsx",
    "src/views/teacher/curriculum-steps/CurriculumChaptersStep.tsx",
    "src/views/teacher/curriculum-steps/CurriculumMediaStep.tsx",
    "src/views/teacher/curriculum-steps/CurriculumQuizStep.tsx",
  ];

  return parts
    .map((relativePath) => path.join(root, relativePath))
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => fs.readFileSync(filePath, "utf8"))
    .join("\n");
}
