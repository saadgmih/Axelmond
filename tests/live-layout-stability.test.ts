import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readAppSources } from "./helpers/app-sources.ts";
import { readLiveClassroomSources } from "./helpers/live-classroom-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("live-layout-stability", () => {
  const classroomSource = readLiveClassroomSources();
  const controlBarSource = readFileSync("src/components/live/LiveControlBar.tsx", "utf8");
  const liveChatSource = readFileSync("src/components/live/LiveChatPanel.tsx", "utf8");
  const themeSource = readFileSync("src/views/teacher/live-control-theme.ts", "utf8");
  const appSource = readAppSources();

  assert.match(classroomSource, /data-live-video-stage/);
  assert.match(classroomSource, /live-classroom-main/);
  assert.match(classroomSource, /live-classroom-video-stage/);
  assert.match(classroomSource, /data-live-sidebar/);
  assert.match(classroomSource, /overflow-hidden/);
  assert.match(classroomSource, /isSidebarOpen \? "2xl:grid-cols-\[minmax\(0,1fr\)_420px\]" : "2xl:grid-cols-1"/);
  assert.match(classroomSource, /matchMedia\("\(min-width: 1536px\)"\)/);
  assert.doesNotMatch(controlBarSource, /hidden (?:sm|md|lg):(?:block|flex)/);
  assert.match(controlBarSource, /flex-wrap[\s\S]*sm:flex-nowrap/);
  assert.match(controlBarSource, /order-3[\s\S]*basis-full[\s\S]*sm:order-none/);
  assert.doesNotMatch(classroomSource, /max-h-\[min\(72dvh,780px\)\]/);
  assert.doesNotMatch(classroomSource, /lg:min-h-\[480px\]/);

  assert.match(liveChatSource, /flex min-h-0 flex-1 flex-col/);
  assert.doesNotMatch(liveChatSource, /AITutorChat|Tuteur IA/);

  assert.match(themeSource, /roomShell:[\s\S]*overflow-hidden/);
  assert.match(themeSource, /roomShell:[\s\S]*h-\[min\(78dvh,820px\)\]/);

  assert.match(appSource, /lockMainScroll = currentView === "course" \|\| isStudentLive/);
  assert.match(appSource, /hideGlobalFooter = currentView === "course" \|\| isLiveSessionView/);
});
