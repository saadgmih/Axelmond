import type { ConversationSummary } from "./types/messaging";

/** Max unread previews in the sidebar (full list stays in Messagerie). */
export const SIDEBAR_UNREAD_PREVIEW_LIMIT = 3;

export function selectSidebarUnreadConversations(
  conversations: ConversationSummary[],
  limit = SIDEBAR_UNREAD_PREVIEW_LIMIT,
): ConversationSummary[] {
  return conversations.filter((item) => item.unreadCount > 0).slice(0, limit);
}
