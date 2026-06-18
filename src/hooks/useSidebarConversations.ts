import { useEffect, useState } from "react";
import { api } from "../api";
import type { ConversationSummary } from "../types/messaging";

const SIDEBAR_CONVERSATION_LIMIT = 4;

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
        setConversations(items.slice(0, SIDEBAR_CONVERSATION_LIMIT));
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
