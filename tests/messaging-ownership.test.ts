import assert from "node:assert/strict";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { readAppSources } from "./helpers/app-sources.ts";
import fs from "node:fs";
import { canAccessApiRoute } from "../src/rbac.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("messaging-ownership", () => {
  const serverSource = readApiRouteSources();
  const schemaSource = fs.readFileSync("prisma/schema.prisma", "utf8");
  const apiSource = fs.readFileSync("src/api.ts", "utf8");
  const appSource = readAppSources();
  const sidebarSource = fs.readFileSync("src/components/Sidebar.tsx", "utf8");
  const platformPathsSource = fs.readFileSync("src/navigation/platformPaths.ts", "utf8");
  const institutionalSwitchSource = fs.readFileSync("src/views/InstitutionalViewSwitch.tsx", "utf8");
  const migrationSource = fs.readFileSync(
    "prisma/migrations/20260607140000_messaging_notifications/migration.sql",
    "utf8",
  );
  const uploadSource = fs.readFileSync("src/uploadthing.ts", "utf8");

  assert.match(schemaSource, /model Conversation/);
  assert.match(schemaSource, /model ConversationParticipant/);
  assert.match(schemaSource, /model Message/);
  assert.match(schemaSource, /model MessageAttachment/);
  assert.match(schemaSource, /model MessageRead/);
  assert.match(schemaSource, /model Notification/);
  assert.match(schemaSource, /model PushSubscription/);
  assert.match(migrationSource, /CREATE TABLE "Conversation"/);

  assert.match(serverSource, /registerMessagingRoutes/);
  assert.match(serverSource, /initMessagingSocket/);
  assert.match(serverSource, /notifyEnrolledStudentsForCourse/);
  assert.match(serverSource, /NEW_CHAPTER/);
  assert.match(serverSource, /NEW_QUIZ/);
  assert.match(serverSource, /LIVE_STARTED/);
  assert.match(serverSource, /NEW_HOMEWORK/);

  assert.equal(canAccessApiRoute("STUDENT", "GET", "/api/conversations"), true);
  assert.equal(canAccessApiRoute("PROFESSOR", "POST", "/api/conversations"), true);
  assert.equal(canAccessApiRoute("STUDENT", "GET", "/api/conversations/abc/messages"), true);
  assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/conversations/abc/read"), true);
  assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/conversations/abc/attachments/confirm"), true);
  assert.equal(canAccessApiRoute("STUDENT", "DELETE", "/api/conversations/abc/messages/msg-1"), true);
  assert.equal(canAccessApiRoute("STUDENT", "GET", "/api/notifications/unread-count"), true);
  assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/notifications/push-subscribe"), true);

  assert.match(apiSource, /getConversations/);
  assert.match(apiSource, /sendConversationMessage/);
  assert.match(apiSource, /deleteConversationMessage/);
  assert.match(apiSource, /getNotifications/);
  assert.match(uploadSource, /messageAttachment/);

  const messagingRoutesSource = fs.readFileSync("src/routes/messaging-routes.ts", "utf8");
  const messagesViewSource = fs.readFileSync("src/views/shared/MessagesView.tsx", "utf8");
  assert.match(messagingRoutesSource, /canDeleteOwnMessage/);
  assert.match(messagingRoutesSource, /message:deleted/);
  assert.match(messagesViewSource, /deleteConversationMessage/);
  assert.match(messagesViewSource, /canDeleteOwnMessage/);

  assert.match(appSource, /MessagesView/);
  assert.match(appSource, /NotificationsView/);
  assert.match(sidebarSource, /openMessages/);
  assert.match(sidebarSource, /Messages/);
  assert.match(platformPathsSource, /"messages"/);
  assert.match(platformPathsSource, /"notifications"/);
  assert.match(institutionalSwitchSource, /SupportView navigateTo/);
  assert.doesNotMatch(appSource, /\/support#report/);
  assert.doesNotMatch(platformPathsSource, /"report-problem"/);
  assert.doesNotMatch(institutionalSwitchSource, /ReportProblemView/);
  assert.doesNotMatch(appSource, /navigateTo\("report-problem"\)/);
});
