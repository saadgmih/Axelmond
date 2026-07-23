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
  const stylesSource = readFileSync("src/index.css", "utf-8");

  assert.match(appSource, /StudentCourseView/);
  assert.match(studentCourseViewSource, /selectedLessonContent\.type === "VIDEO"/);
  assert.match(studentCourseViewSource, /PremiumVideoPlayer/);
  assert.match(studentCourseViewSource, /selectedModule\.attachmentUrl/);
  assert.match(studentCourseViewSource, /Vidéo à venir/);
  assert.doesNotMatch(studentCourseViewSource, /isVideoPlaying/);

  assert.match(teacherCurriculumSource, /PremiumVideoPlayer/);
  assert.match(readFileSync("src/components/messaging/MessageVideoAttachment.tsx", "utf-8"), /PremiumVideoPlayer/);
  assert.match(teacherCurriculumSource, /activeSector="teacher"/);
  assert.match(teacherCurriculumSource, /managedCourse\?\.instructor \?\? "Professeur"/);
  assert.doesNotMatch(teacherCurriculumSource, /<video controls/);

  assert.match(playerSource, /export default function PremiumVideoPlayer/);
  assert.match(playerSource, /useCourseVideoPlayer/);
  assert.match(playerSource, /controlsVisible/);
  assert.match(playerSource, /overlayVisible/);
  assert.match(playerSource, /OVERLAY_HIDE_DELAY_MS = 500/);
  assert.match(playerSource, /CONTROLS_HIDE_DELAY_MS = 1600/);
  assert.match(playerSource, /VOLUME_CONTROL_CLOSE_DELAY_MS = 250/);
  assert.match(playerSource, /showMetadata/);
  assert.match(playerSource, /if \(isPlaying && showMetadata\)/);
  assert.match(playerSource, /Vitesse/);
  assert.match(playerSource, /COURSE_VIDEO_PLAYBACK_RATES\.map/);
  assert.match(playerSource, /aria-label="Volume vidéo"/);
  assert.match(playerSource, /video-volume-slider-vertical/);
  assert.match(playerSource, /group\/volume/);
  assert.match(playerSource, /volumeControlOpen/);
  assert.match(playerSource, /volumeDraggingRef/);
  assert.match(playerSource, /volumeHasFocusRef/);
  assert.match(playerSource, /course-video-player/);
  assert.match(playerSource, /course-video-controls/);
  assert.match(playerSource, /flex-nowrap/);
  assert.match(playerSource, /course-video-progress flex min-w-0 flex-1/);
  assert.match(playerSource, /aria-label="Vitesse de lecture"/);
  assert.doesNotMatch(playerSource, /min-w-\[140px\]/);
  assert.match(playerSource, /onPointerEnter=\{openVolumeControl\}/);
  assert.match(playerSource, /onPointerDown=\{\(event\) =>/);
  assert.match(playerSource, /finishVolumeInteraction/);
  assert.match(playerSource, /Volume2/);
  assert.match(playerSource, /VolumeX/);
  assert.match(
    studentCourseViewSource,
    /selectedLessonContent\.type !== "VIDEO" &&\s*selectedLessonContent\.type !== "IMAGE" && \([\s\S]*selectedLessonContent\.attachments\[0\]\?\.fileName \|\| "Contenu texte"/,
  );

  assert.match(hookSource, /COURSE_VIDEO_PLAYBACK_RATES = \[0\.5, 0\.75, 1, 1\.25, 1\.5, 1\.75, 2, 2\.5, 3, 3\.5, 4\]/);
  assert.match(hookSource, /export function useCourseVideoPlayer/);
  assert.match(hookSource, /const \[isPlaying, setIsPlaying\] = useState\(false\)/);
  assert.match(hookSource, /const \[playbackRate, setPlaybackRate\] = useState\(1\.0\)/);
  assert.match(hookSource, /const \[volume, setVolume\] = useState\(readStoredCourseVideoVolume\)/);
  assert.match(hookSource, /const \[isMuted, setIsMuted\] = useState\(\(\) => readStoredCourseVideoVolume\(\) === 0\)/);
  assert.match(hookSource, /COURSE_VIDEO_VOLUME_STORAGE_KEY/);
  assert.match(hookSource, /handleVolumeChange/);
  assert.match(hookSource, /handlePlaybackRateChange/);
  assert.match(hookSource, /const \[isFullscreen, setIsFullscreen\] = useState\(false\)/);
  assert.match(hookSource, /export function formatCourseVideoTime/);
  assert.match(stylesSource, /container-name:\s*course-video/);
  assert.match(stylesSource, /@container course-video \(max-width: 520px\)/);
  assert.match(stylesSource, /@container course-video \(max-width: 300px\)/);
});
