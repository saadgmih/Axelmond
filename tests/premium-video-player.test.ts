import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync("src/App.tsx", "utf-8");
const studentCourseViewSource = readFileSync("src/views/student/StudentCourseView.tsx", "utf-8");
const playerSource = readFileSync("src/components/PremiumVideoPlayer.tsx", "utf-8");
const hookSource = readFileSync("src/hooks/useCourseVideoPlayer.ts", "utf-8");

assert.match(appSource, /StudentCourseView/);
assert.match(studentCourseViewSource, /selectedLessonContent\.type === "VIDEO"/);
assert.match(studentCourseViewSource, /<video/);

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

console.log("Premium video player tests passed successfully!");
