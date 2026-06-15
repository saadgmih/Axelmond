import assert from "node:assert/strict";
import fs from "node:fs";
import {
  isAllowedPushEndpointUrl,
  isAllowedPushProviderHost,
  isPrivateOrBlockedHost,
  validatePushSubscriptionInput,
} from "../src/push-endpoint-security.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("push-endpoint-security", () => {
  const validKeys = {
    p256dh: "BNcRdskM_twdnP9Z8ZnwKNBFsONNbStHYxK23TyDCk9hjWKZuebglPp2n6c1c0JYtH_uaHUSMXZOa8d6oh4MX2U",
    auth: "tBHItJI5svbpez7KI4CCXg",
  };

  assert.equal(isAllowedPushEndpointUrl("https://fcm.googleapis.com/fcm/send/device-token"), true);
  assert.equal(isAllowedPushEndpointUrl("https://updates.push.services.mozilla.com/wpush/v2/gAAAAA"), true);
  assert.equal(isAllowedPushEndpointUrl("https://web.push.apple.com/abc123"), true);
  assert.equal(isAllowedPushEndpointUrl("https://wns2-bl2p.notify.windows.com/w/?token=abc"), true);

  assert.equal(isAllowedPushEndpointUrl("http://fcm.googleapis.com/fcm/send/x"), false);
  assert.equal(isAllowedPushEndpointUrl("https://example.com/push"), false);
  assert.equal(isAllowedPushEndpointUrl("https://127.0.0.1/push"), false);
  assert.equal(isAllowedPushEndpointUrl("https://localhost/push"), false);
  assert.equal(isAllowedPushEndpointUrl("https://169.254.169.254/latest/meta-data"), false);
  assert.equal(isAllowedPushEndpointUrl("https://192.168.1.10/internal"), false);
  assert.equal(isAllowedPushEndpointUrl("https://10.0.0.5/internal"), false);
  assert.equal(isAllowedPushEndpointUrl("https://[::1]/push"), false);
  assert.equal(isAllowedPushEndpointUrl("https://metadata.google.internal/computeMetadata/v1/"), false);

  assert.equal(isPrivateOrBlockedHost("127.0.0.1"), true);
  assert.equal(isPrivateOrBlockedHost("10.1.2.3"), true);
  assert.equal(isPrivateOrBlockedHost("192.168.0.44"), true);
  assert.equal(isPrivateOrBlockedHost("169.254.10.1"), true);
  assert.equal(isPrivateOrBlockedHost("fe80::1"), true);
  assert.equal(isPrivateOrBlockedHost("fcm.googleapis.com"), false);

  assert.equal(isAllowedPushProviderHost("fcm.googleapis.com"), true);
  assert.equal(isAllowedPushProviderHost("wns2-bl2p.notify.windows.com"), true);
  assert.equal(isAllowedPushProviderHost("evil-fcm.googleapis.com.attacker.com"), false);

  const validated = validatePushSubscriptionInput({
    endpoint: "https://fcm.googleapis.com/fcm/send/device-token",
    keys: validKeys,
  });
  assert.equal(validated.endpoint, "https://fcm.googleapis.com/fcm/send/device-token");

  assert.throws(
    () =>
      validatePushSubscriptionInput({
        endpoint: "https://attacker.example/hook",
        keys: validKeys,
      }),
    /non autoris/i,
  );

  const notificationsSource = fs.readFileSync("src/notifications.ts", "utf8");
  const messagingRoutesSource = fs.readFileSync("src/routes/messaging-routes.ts", "utf8");

  assert.match(notificationsSource, /validatePushSubscriptionInput/);
  assert.match(notificationsSource, /isAllowedPushEndpointUrl/);
  assert.match(notificationsSource, /PushSubscriptionLimitError/);
  assert.match(messagingRoutesSource, /PushSubscriptionValidationError/);
  assert.match(messagingRoutesSource, /PushSubscriptionLimitError/);

  console.log("Push endpoint security rules passed");
});
