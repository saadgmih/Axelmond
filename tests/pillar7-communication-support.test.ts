import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "vitest";

describe("Pillar 7 - Communication, Messagerie & Support", () => {
  it("includes notification sound utilities and Web Audio API synthesizer", () => {
    const soundUtilSource = fs.readFileSync("src/utils/notification-sound.ts", "utf8");
    assert.match(soundUtilSource, /export function playNotificationSound/);
    assert.match(soundUtilSource, /export function isSoundEnabled/);
    assert.match(soundUtilSource, /export function setSoundEnabled/);
    assert.match(soundUtilSource, /AudioContext/);
    assert.match(soundUtilSource, /createOscillator/);
  });

  it("includes messaging attachment modal preview for full-screen media inspection", () => {
    const modalSource = fs.readFileSync("src/components/messaging/MessageAttachmentModal.tsx", "utf8");
    assert.match(modalSource, /function MessageAttachmentModal/);
    assert.match(modalSource, /attachment\.url/);
    assert.match(modalSource, /Telecharger|Télécharger/);
  });

  it("includes pending attachment preview composer component", () => {
    const pendingSource = fs.readFileSync("src/components/messaging/PendingAttachmentPreview.tsx", "utf8");
    assert.match(pendingSource, /function PendingAttachmentPreview/);
    assert.match(pendingSource, /onRemove/);
    assert.match(pendingSource, /formatFileSize/);
  });

  it("includes conversation filter tabs for unread and search isolation", () => {
    const tabsSource = fs.readFileSync("src/components/messaging/ConversationFilterTabs.tsx", "utf8");
    assert.match(tabsSource, /function ConversationFilterTabs/);
    assert.match(tabsSource, /filter:/);
    assert.match(tabsSource, /unreadCount/);
  });

  it("MessagesView integrates attachment previews, pending composer bar, and sound chimes", () => {
    const messagesViewSource = fs.readFileSync("src/views/shared/MessagesView.tsx", "utf8");
    assert.match(messagesViewSource, /MessageAttachmentModal/);
    assert.match(messagesViewSource, /PendingAttachmentPreview/);
    assert.match(messagesViewSource, /ConversationFilterTabs/);
    assert.match(messagesViewSource, /playNotificationSound/);
    assert.match(messagesViewSource, /previewAttachment/);
  });

  it("supports user ticket tracking with RBAC and persistence in AuditLog", () => {
    const rbacSource = fs.readFileSync("src/rbac.ts", "utf8");
    const routesSource = fs.readFileSync("src/routes/misc-routes.ts", "utf8");
    const apiSource = fs.readFileSync("src/api.ts", "utf8");
    const supportViewSource = fs.readFileSync("src/components/SupportView.tsx", "utf8");

    // RBAC allows GET and POST on /api/support/tickets
    assert.match(rbacSource, /\(verb === "POST" \|\| verb === "GET"\) && cleanPath === "\/api\/support\/tickets"/);

    // Routes declare GET and POST
    assert.match(routesSource, /app\.get\("\/api\/support\/tickets"/);
    assert.match(routesSource, /app\.post\("\/api\/support\/tickets"/);
    assert.match(routesSource, /action: "SUPPORT_TICKET_CREATED"/);

    // Frontend API method exists
    assert.match(apiSource, /getSupportTickets:\s*\(\)\s*=>/);

    // SupportView has ticket history and maintains exact legacy support test expectations
    assert.match(supportViewSource, /Mes tickets/);
    assert.match(supportViewSource, /Base de connaissances/);
    assert.match(routesSource, /TK-/);
    assert.match(supportViewSource, /userTickets/);
    const uploadthingSource = fs.readFileSync("src/uploadthing.ts", "utf8");
    assert.match(uploadthingSource, /supportScreenshot:\s*f\(/);
    assert.match(supportViewSource, /scrollToSupportReportForm/);
  });

  it("NotificationsView incorporates category tabs, unread filter, and sound controls", () => {
    const notifViewSource = fs.readFileSync("src/views/shared/NotificationsView.tsx", "utf8");
    assert.match(notifViewSource, /NotificationCategoryFilter/);
    assert.match(notifViewSource, /ACADEMIC/);
    assert.match(notifViewSource, /LIVE/);
    assert.match(notifViewSource, /MESSAGES/);
    assert.match(notifViewSource, /playNotificationSound/);
    assert.match(notifViewSource, /isSoundEnabled/);
    assert.match(notifViewSource, /setSoundEnabled/);
    assert.match(notifViewSource, /Tester le son/);
  });
});
