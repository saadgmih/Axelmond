import { useCallback, useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { getFreshSessionToken } from "../api";
import type { ChatMessage } from "../types/messaging";

const socketBaseUrl = ((import.meta as any).env?.VITE_API_BASE_URL || "").replace(/\/$/, "") || window.location.origin;

export interface MessagingSocketHandlers {
  onMessage?: (message: ChatMessage) => void;
  onMessageDeleted?: (payload: { conversationId: string; messageId: string }) => void;
  onMessageRead?: (payload: { conversationId: string; messageId: string; userId: string }) => void;
  onTyping?: (payload: { conversationId: string; userId: string; isTyping: boolean }) => void;
  onNotification?: (payload: unknown) => void;
}

export function useMessagingSocket(enabled: boolean, handlers: MessagingSocketHandlers) {
  const socketRef = useRef<Socket | null>(null);
  const activeConversationRef = useRef<string | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    (async () => {
      const token = await getFreshSessionToken();
      if (!token || cancelled) return;

      const { io } = await import("socket.io-client");
      if (cancelled) return;
      const socket = io(socketBaseUrl, {
        path: "/socket.io",
        auth: { token },
        transports: ["websocket"],
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        if (activeConversationRef.current) {
          socket.emit("conversation:join", activeConversationRef.current);
        }
      });
      socket.on("message:new", (payload: ChatMessage) => handlersRef.current.onMessage?.(payload));
      socket.on("message:deleted", (payload) => handlersRef.current.onMessageDeleted?.(payload));
      socket.on("message:read", (payload) => handlersRef.current.onMessageRead?.(payload));
      socket.on("typing:update", (payload) => handlersRef.current.onTyping?.(payload));
      socket.on("notification:new", (payload) => handlersRef.current.onNotification?.(payload));
    })();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);

  const joinConversation = useCallback((conversationId: string | null) => {
    activeConversationRef.current = conversationId;
    if (!conversationId || !socketRef.current?.connected) return;
    socketRef.current.emit("conversation:join", conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId: string | null) => {
    if (conversationId && socketRef.current?.connected) {
      socketRef.current.emit("conversation:leave", conversationId);
    }
    if (activeConversationRef.current === conversationId) {
      activeConversationRef.current = null;
    }
  }, []);

  const emitTypingStart = useCallback((conversationId: string) => {
    socketRef.current?.emit("typing:start", conversationId);
  }, []);

  const emitTypingStop = useCallback((conversationId: string) => {
    socketRef.current?.emit("typing:stop", conversationId);
  }, []);

  return { joinConversation, leaveConversation, emitTypingStart, emitTypingStop };
}
