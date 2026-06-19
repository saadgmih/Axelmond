import { useEffect, useState } from "react";
import { api } from "../api";
import type { ConversationSummary } from "../types/messaging";
import { selectSidebarUnreadConversations } from "../sidebar-conversations";

export function useSidebarConversations(enabled: boolean) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  useEffect(() => {
    if (!enabled) {
      setConversations([]);
      return;
    }

    let cancelled = false;

    void api
      .getConversations()
      .then((items) => {
        if (cancelled || !Array.isArray(items)) return;
        setConversations(selectSidebarUnreadConversations(items));
      })
      .catch(() => {
        if (!cancelled) setConversations([]);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return conversations;
}
