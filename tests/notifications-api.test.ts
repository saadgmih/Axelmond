import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("notifications-api", () => {
  const apiSource = fs.readFileSync("src/api.ts", "utf8");
  const notificationsHookSource = fs.readFileSync("src/hooks/useNotifications.ts", "utf8");
  const pushHookSource = fs.readFileSync("src/hooks/usePushNotifications.ts", "utf8");
  const messagingRoutesSource = fs.readFileSync("src/messaging-routes.ts", "utf8");

  assert.match(apiSource, /markAllNotificationsRead/);
  assert.match(apiSource, /subscribePushNotifications/);
  assert.match(apiSource, /allowCsrfRetry/);
  assert.match(apiSource, /readCsrfFromCookie\(\)/);

  assert.match(notificationsHookSource, /markAllNotificationsRead/);
  assert.match(notificationsHookSource, /catch \(err/);
  assert.match(notificationsHookSource, /markNotificationRead/);

  assert.match(pushHookSource, /configured === false/);
  assert.match(pushHookSource, /subscribePushNotifications/);
  assert.match(pushHookSource, /console\.error\("\[push\] subscribe flow failed"/);

  assert.match(messagingRoutesSource, /\/api\/notifications\/read-all/);
  assert.match(messagingRoutesSource, /\/api\/notifications\/push-subscribe/);
  assert.match(messagingRoutesSource, /isWebPushConfigured\(\)/);
});
