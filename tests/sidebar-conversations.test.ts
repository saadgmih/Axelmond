import assert from "node:assert/strict";
import { selectSidebarUnreadConversations, SIDEBAR_UNREAD_PREVIEW_LIMIT } from "../src/sidebar-conversations.ts";
import type { ConversationSummary } from "../src/types/messaging.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

function summary(id: string, unreadCount: number): ConversationSummary {
  return {
    id,
    peer: {
      id: `user-${id}`,
      fullName: `Contact ${id}`,
      email: `${id}@example.com`,
      role: "PROFESSOR",
      avatarUrl: "",
    },
    updatedAt: new Date().toISOString(),
    unreadCount,
    lastMessage: null,
    isPeerTyping: false,
  };
}

rulesTest("sidebar-conversations", () => {
  assert.equal(SIDEBAR_UNREAD_PREVIEW_LIMIT, 3);

  const items = [summary("a", 0), summary("b", 2), summary("c", 0), summary("d", 1), summary("e", 4)];

  assert.deepEqual(
    selectSidebarUnreadConversations(items).map((item) => item.id),
    ["b", "d", "e"],
  );

  assert.deepEqual(
    selectSidebarUnreadConversations(items, 1).map((item) => item.id),
    ["b"],
  );
  assert.deepEqual(selectSidebarUnreadConversations([]), []);
});
