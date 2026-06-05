import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync("src/App.tsx", "utf-8");
const playerSource = readFileSync("src/components/PremiumVideoPlayer.tsx", "utf-8");

assert.match(appSource, /selectedLessonContent\.type === "VIDEO"/);
assert.match(appSource, /<video/);

assert.match(playerSource, /export default function PremiumVideoPlayer/);
assert.match(playerSource, /const \[isPlaying, setIsPlaying\] = useState\(false\)/);
assert.match(playerSource, /const \[playbackRate, setPlaybackRate\] = useState\(1\.0\)/);
assert.match(playerSource, /const \[isMuted, setIsMuted\] = useState\(false\)/);
assert.match(playerSource, /const \[isFullscreen, setIsFullscreen\] = useState\(false\)/);
assert.match(playerSource, /Vitesse:/);
assert.match(playerSource, /Volume2/);

console.log("Premium video player tests passed successfully!");
