import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readAppSources } from "./helpers/app-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("bundle-lazy-routes", () => {
  const appSource = readAppSources();
  const appFooterSource = readFileSync("src/app/AppFooter.tsx", "utf-8");
  const lazyViewsSource = readFileSync("src/lazyViews.tsx", "utf-8");
  const supportViewSource = readFileSync("src/components/SupportView.tsx", "utf-8");
  const viteSource = readFileSync("vite.config.ts", "utf-8");

  assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/views\/teacher\/TeacherWorkspace"\)\)/);
  assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/views\/teacher\/TeacherLiveControlView"\)\)/);
  assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/views\/shared\/MessagesView"\)\)/);
  assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/views\/student\/StudentCourseView"\)\)/);
  assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/views\/student\/StudentLiveView"\)\)/);
  assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/views\/student\/StudentDashboardView"\)\)/);
  assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/views\/student\/StudentCatalogView"\)\)/);
  assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/views\/student\/StudentProfileView"\)\)/);
  assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/views\/student\/StudentAccountSecurityView"\)\)/);
  assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/views\/student\/StudentStudyPlanView"\)\)/);
  assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/views\/student\/StudentStudyScheduleView"\)\)/);
  assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/views\/student\/StudentObjectivesView"\)\)/);
  assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/views\/shared\/NotificationsView"\)\)/);
  assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/components\/PaymentModal"\)\)/);
  assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/views\/live\/LiveKitSessionHost"\)\)/);

  assert.match(appSource, /from "\.\.\/lazyViews"/);
  assert.match(appSource, /LazyTeacherWorkspace/);
  assert.match(appSource, /LazyStudentCourseView/);
  assert.match(appSource, /LazyStudentDashboardView/);
  assert.match(appSource, /LazyStudentCatalogView/);
  assert.match(appSource, /LazyMessagesView/);
  assert.match(appSource, /LazyStudentLiveView/);
  assert.match(appSource, /LazyNotificationsView/);
  assert.doesNotMatch(appSource, /from "\.\.\/views\/shared\/NotificationsView"/);
  assert.doesNotMatch(appSource, /from "\.\.\/views\/student\/StudentDashboardView"/);
  assert.doesNotMatch(appSource, /from "\.\.\/views\/student\/StudentCatalogView"/);
  assert.doesNotMatch(appSource, /from "\.\.\/views\/student\/StudentProfileView"/);
  assert.match(appSource, /LazyPaymentModal/);
  assert.match(appSource, /LazyLiveKitSessionHost/);
  assert.match(appSource, /useLiveKitSession/);
  assert.doesNotMatch(appSource, /from "\.\/hooks\/useLiveKitRoom"/);
  assert.doesNotMatch(appSource, /from "\.\/components\/PaymentModal"/);
  assert.doesNotMatch(appSource, /from "\.\/views\/teacher\/TeacherCurriculumView"/);

  assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/components\/AboutView"\)\)/);
  assert.match(lazyViewsSource, /lazy\(\(\) => import\("\.\/components\/PrivacyView"\)\)/);
  assert.match(supportViewSource, /utils\/support-navigation/);
  assert.doesNotMatch(appFooterSource, /utils\/support-navigation/);
  assert.equal((appFooterSource.match(/Centre d'aide/g) || []).length, 1);
  assert.doesNotMatch(appFooterSource, /Signaler un problème/);
  assert.doesNotMatch(appFooterSource, /components\/SupportView/);

  assert.match(viteSource, /manualChunks/);
  assert.match(viteSource, /livekit-vendor/);
  assert.match(viteSource, /react-vendor/);
  assert.match(viteSource, /REACT_VENDOR_PACKAGES/);
  assert.doesNotMatch(viteSource, /paypal-vendor/);
  assert.doesNotMatch(viteSource, /id\.includes\("react"\)/);
});
