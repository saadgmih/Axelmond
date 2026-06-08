import assert from "node:assert/strict";
import fs from "node:fs";
import { canAccessApiRoute } from "../src/rbac.ts";

const serverSource = fs.readFileSync("server.ts", "utf8");
const schemaSource = fs.readFileSync("prisma/schema.prisma", "utf8");
const apiSource = fs.readFileSync("src/api.ts", "utf8");
const appSource = fs.readFileSync("src/App.tsx", "utf8");
const sidebarSource = fs.readFileSync("src/components/Sidebar.tsx", "utf8");
const platformPathsSource = fs.readFileSync("src/navigation/platformPaths.ts", "utf8");
const migrationSource = fs.readFileSync("prisma/migrations/20260607140000_messaging_notifications/migration.sql", "utf8");
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
assert.equal(canAccessApiRoute("STUDENT", "GET", "/api/notifications/unread-count"), true);
assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/notifications/push-subscribe"), true);

assert.match(apiSource, /getConversations/);
assert.match(apiSource, /sendConversationMessage/);
assert.match(apiSource, /getNotifications/);
assert.match(uploadSource, /messageAttachment/);

assert.match(appSource, /MessagesView/);
assert.match(appSource, /NotificationsView/);
assert.match(sidebarSource, /Messagerie/);
assert.match(platformPathsSource, /"messages"/);
assert.match(platformPathsSource, /"notifications"/);

console.log("Messaging ownership and wiring tests passed");
