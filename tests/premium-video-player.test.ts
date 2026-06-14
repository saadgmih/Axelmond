import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readAppSources } from "./helpers/app-sources.ts";
import { readCurriculumViewSources } from "./helpers/live-classroom-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("premium-video-player", () => {
  const appSource = readAppSources();
  const studentCourseViewSource = readFileSync("src/views/student/StudentCourseView.tsx", "utf-8");
  const teacherCurriculumSource = readCurriculumViewSources();
  const playerSource = readFileSync("src/components/PremiumVideoPlayer.tsx", "utf-8");
  const hookSource = readFileSync("src/hooks/useCourseVideoPlayer.ts", "utf-8");

  assert.match(appSource, /StudentCourseView/);
  assert.match(studentCourseViewSource, /selectedLessonContent\.type === "VIDEO"/);
  assert.match(studentCourseViewSource, /PremiumVideoPlayer/);
  assert.match(studentCourseViewSource, /selectedModule\.attachmentUrl/);
  assert.match(studentCourseViewSource, /Vidéo à venir/);
  assert.doesNotMatch(studentCourseViewSource, /isVideoPlaying/);

  assert.match(teacherCurriculumSource, /PremiumVideoPlayer/);
  assert.match(teacherCurriculumSource, /activeSector="teacher"/);
  assert.match(teacherCurriculumSource, /managedCourse\?\.instructor \?\? "Professeur"/);
  assert.doesNotMatch(teacherCurriculumSource, /<video controls/);

  assert.match(playerSource, /export default function PremiumVideoPlayer/);
  assert.match(playerSource, /useCourseVideoPlayer/);
  assert.match(playerSource, /Vitesse:/);
  assert.match(playerSource, /Volume2/);

  assert.match(hookSource, /export function useCourseVideoPlayer/);
  assert.match(hookSource, /const \[isPlaying, setIsPlaying\] = useState\(false\)/);
  assert.match(hookSource, /const \[playbackRate, setPlaybackRate\] = useState\(1\.0\)/);
  assert.match(hookSource, /const \[isMuted, setIsMuted\] = useState\(false\)/);
  assert.match(hookSource, /const \[isFullscreen, setIsFullscreen\] = useState\(false\)/);
  assert.match(hookSource, /export function formatCourseVideoTime/);
});
