import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readAppSources } from "./helpers/app-sources.ts";

const appSource = readAppSources();
const lazyViewsSource = readFileSync("src/lazyViews.tsx", "utf-8");
const viteSource = readFileSync("vite.config.ts", "utf-8");

assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/views\/teacher\/TeacherWorkspace"\)\)/);
assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/views\/teacher\/TeacherLiveControlView"\)\)/);
assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/views\/shared\/MessagesView"\)\)/);
assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/views\/student\/StudentCourseView"\)\)/);
assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/views\/student\/StudentLiveView"\)\)/);
assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/components\/PaymentModal"\)\)/);
assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/views\/live\/LiveKitSessionHost"\)\)/);

assert.match(appSource, /from "\.\.\/lazyViews"/);
assert.match(appSource, /LazyTeacherWorkspace/);
assert.match(appSource, /LazyStudentCourseView/);
assert.match(appSource, /LazyMessagesView/);
assert.match(appSource, /LazyStudentLiveView/);
assert.match(appSource, /LazyPaymentModal/);
assert.match(appSource, /LazyLiveKitSessionHost/);
assert.match(appSource, /useLiveKitSession/);
assert.doesNotMatch(appSource, /from "\.\/hooks\/useLiveKitRoom"/);
assert.doesNotMatch(appSource, /from "\.\/components\/PaymentModal"/);
assert.doesNotMatch(appSource, /from "\.\/views\/teacher\/TeacherCurriculumView"/);

assert.match(viteSource, /manualChunks/);
assert.match(viteSource, /livekit-vendor/);
assert.match(viteSource, /paypal-vendor/);

console.log("Bundle lazy route rules passed");
