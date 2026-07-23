import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getClientErrorMessage } from "../../client-errors";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Clock3,
  FileText,
  Image as ImageIcon,
  Inbox,
  Loader2,
  LockKeyhole,
  MessageCircleMore,
  Mic,
  Paperclip,
  Plus,
  Search,
  Send,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { api } from "../../api";
import {
  getUploadErrorMessage,
  validateUploadFile,
  formatUploadProgressLabel,
  uploadProgressBarWidth,
} from "../../uploadthing-client";
import {
  uploadMessageAttachmentFile,
  normalizeMessageUploadFile,
  type OutgoingMessageAttachment,
} from "../../message-attachment-upload";
import { MESSAGE_ATTACHMENT_ACCEPT } from "../../message-attachment-utils";
import { useMessageAudioRecorder } from "../../hooks/useMessageAudioRecorder";
import { MessageAudioPlayer } from "../../components/messaging/MessageAudioPlayer";
import { MessageVideoAttachment } from "../../components/messaging/MessageVideoAttachment";
import { canDeleteOwnMessage } from "../../message-delete-policy";
import { VirtualList } from "../../components/VirtualList";
import { useMessagingSocket } from "../../hooks/useMessagingSocket";
import type { ChatMessage, ConversationSummary, MessagingUser } from "../../types/messaging";
import { scheduleUi } from "../teacher/schedule-theme";
import { UserProfileTrigger } from "../../components/UserProfileViewer";

interface MessagesViewProps {
  currentUserId: string;
  role: "student" | "teacher";
}

function formatDayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatMessageDay(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function isSameMessageDay(left?: string, right?: string) {
  if (!left || !right) return false;
  return new Date(left).toDateString() === new Date(right).toDateString();
}

function formatElapsedTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function getPeerRoleLabel(role?: string) {
  return role === "STUDENT" ? "Étudiant" : role === "ADMIN" ? "Administrateur" : "Professeur";
}

function getConversationPreview(conversation: ConversationSummary) {
  if (conversation.isPeerTyping) return "En train d'écrire…";
  if (conversation.lastMessage?.body) return conversation.lastMessage.body;
  const kind = conversation.lastMessage?.attachments?.[0]?.kind;
  if (kind === "AUDIO") return "Message vocal";
  if (kind === "IMAGE") return "Photo";
  if (kind === "VIDEO") return "Vidéo";
  if (kind === "DOCUMENT") return "Document";
  return "Démarrer la conversation";
}

function peerInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function renderAttachment(message: ChatMessage, role: "student" | "teacher", mine: boolean) {
  const attachment = message.attachments[0];
  if (!attachment) return null;
  if (attachment.kind === "IMAGE") {
    return (
      <a href={attachment.url} target="_blank" rel="noreferrer" className="mt-2 block max-w-full">
        <img
          src={attachment.url}
          alt={attachment.fileName}
          className="max-h-64 max-w-full rounded-xl border border-white/10 object-cover"
        />
      </a>
    );
  }
  if (attachment.kind === "VIDEO") {
    return (
      <div className="w-full" onClick={(event) => event.stopPropagation()}>
        <MessageVideoAttachment url={attachment.url} role={role} />
      </div>
    );
  }
  if (attachment.kind === "AUDIO") {
    return <MessageAudioPlayer url={attachment.url} mine={mine} />;
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-black/30"
    >
      <FileText className="h-4 w-4" />
      {attachment.fileName}
    </a>
  );
}

interface ConversationListItemProps {
  conversation: ConversationSummary;
  active: boolean;
  onSelect: (conversationId: string) => void;
}

const ConversationListItem = memo(function ConversationListItem({
  conversation,
  active,
  onSelect,
}: ConversationListItemProps) {
  const peerName = conversation.peer?.fullName || "Conversation";
  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      aria-current={active ? "page" : undefined}
      className={`group relative flex w-full items-center gap-3 border-b border-white/[0.05] px-4 py-3.5 text-left transition-all ${
        active ? "bg-emerald-500/[0.12]" : "hover:bg-white/[0.045]"
      }`}
    >
      {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-emerald-400" aria-hidden="true" />}
      <div
        className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border text-sm font-black text-white ${
          active
            ? "border-emerald-300/35 bg-emerald-500/20 shadow-lg shadow-emerald-950/40"
            : "border-white/10 bg-[#12352e]"
        }`}
      >
        {conversation.peer?.avatarUrl ? (
          <img src={conversation.peer.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
        ) : (
          peerInitials(peerName)
        )}
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#08231e] bg-emerald-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate text-sm font-bold ${active ? "text-emerald-50" : "text-slate-100"}`}>{peerName}</p>
          <span className={`text-[10px] font-semibold ${active ? "text-emerald-300/75" : "text-slate-500"}`}>
            {conversation.lastMessage ? formatDayLabel(conversation.lastMessage.createdAt) : ""}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p
            className={`truncate text-xs ${conversation.isPeerTyping ? "font-semibold text-emerald-300" : "text-slate-400"}`}
          >
            {getConversationPreview(conversation)}
          </p>
          <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-slate-600">
            {getPeerRoleLabel(conversation.peer?.role)}
          </span>
        </div>
      </div>
      {conversation.unreadCount > 0 && (
        <span className="flex min-w-5 items-center justify-center rounded-full bg-emerald-400 px-1.5 py-0.5 text-[10px] font-black text-[#042019] shadow-lg shadow-emerald-950/40">
          {conversation.unreadCount}
        </span>
      )}
    </button>
  );
});

interface MessageBubbleProps {
  message: ChatMessage;
  mine: boolean;
  role: "student" | "teacher";
  canDelete: boolean;
  deleting: boolean;
  onDelete: (messageId: string) => void;
}

const MessageBubble = memo(function MessageBubble({
  message,
  mine,
  role,
  canDelete,
  deleting,
  onDelete,
}: MessageBubbleProps) {
  const attachment = message.attachments[0];
  const hasBody = Boolean(message.body?.trim());
  const isVideo = attachment?.kind === "VIDEO";
  const isAudioOnly = attachment?.kind === "AUDIO" && !hasBody;

  const metaRow = (
    <div className={`flex items-center gap-1.5 text-[10px] ${mine ? "text-slate-400" : "text-slate-500"}`}>
      <span>{message.sentAtLabel}</span>
      {mine &&
        (message.seenByOthers ? (
          <CheckCheck className="h-3.5 w-3.5" aria-label="Vu" />
        ) : (
          <Check className="h-3.5 w-3.5" aria-label="Envoyé" />
        ))}
      {canDelete && (
        <button
          type="button"
          onClick={() => onDelete(message.id)}
          disabled={deleting}
          aria-label="Supprimer ce message"
          title="Supprimer (disponible 4 jours après l'envoi)"
          className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200 disabled:opacity-50"
        >
          {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
        </button>
      )}
    </div>
  );

  if (isVideo) {
    return (
      <div className={`group flex w-full flex-col gap-1.5 ${mine ? "items-end" : "items-start"}`}>
        {hasBody && (
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-lg ${
              mine
                ? "rounded-br-md bg-emerald-600 text-white"
                : "rounded-bl-md border border-white/10 bg-[#0b241f] text-slate-100"
            }`}
          >
            <p className="whitespace-pre-wrap text-sm">{message.body}</p>
          </div>
        )}
        <div className="w-full min-w-[220px] max-w-[min(100%,280px)]">{renderAttachment(message, role, mine)}</div>
        {metaRow}
      </div>
    );
  }

  return (
    <div className={`group flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
      {!mine && (
        <UserProfileTrigger
          userId={message.senderId}
          userName={message.sender.fullName}
          className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#12352e] text-[10px] font-black text-emerald-100 hover:border-emerald-300/30"
        >
          {message.sender.avatarUrl ? (
            <img src={message.sender.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            peerInitials(message.sender.fullName)
          )}
        </UserProfileTrigger>
      )}
      <div
        className={`relative border shadow-lg shadow-black/15 ${
          isAudioOnly
            ? "w-auto min-w-[230px] max-w-[min(82%,340px)] rounded-2xl p-1.5"
            : "max-w-[min(82%,680px)] rounded-2xl px-4 py-3"
        } ${
          mine
            ? "rounded-br-md border-emerald-300/20 bg-gradient-to-br from-emerald-600 to-teal-700 text-white"
            : "rounded-bl-md border-white/[0.08] bg-[#0a2923] text-slate-100"
        }`}
      >
        {message.body && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>}
        {attachment && <div className={hasBody ? "mt-2" : ""}>{renderAttachment(message, role, mine)}</div>}
        <div
          className={`flex items-center gap-1.5 px-1 text-[10px] ${
            isAudioOnly ? "mt-1.5 pb-0.5" : "mt-2"
          } ${mine ? "text-emerald-50/75" : "text-slate-500"}`}
        >
          <span>{message.sentAtLabel}</span>
          {mine &&
            (message.seenByOthers ? (
              <CheckCheck className="h-3.5 w-3.5" aria-label="Vu" />
            ) : (
              <Check className="h-3.5 w-3.5" aria-label="Envoyé" />
            ))}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(message.id)}
              disabled={deleting}
              aria-label="Supprimer ce message"
              title="Supprimer (disponible 4 jours après l'envoi)"
              className={`ml-1 inline-flex h-6 w-6 items-center justify-center rounded-md opacity-70 transition-all group-focus-within:opacity-100 disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100 ${
                mine ? "text-emerald-100/80 hover:bg-white/15 hover:text-white" : "text-slate-400 hover:bg-white/10"
              }`}
            >
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default function MessagesView({ currentUserId, role }: MessagesViewProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [searchUsers, setSearchUsers] = useState("");
  const [userResults, setUserResults] = useState<MessagingUser[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [startingConversationId, setStartingConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draftInputRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const messageRequestRef = useRef(0);
  const sendingRef = useRef(false);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedId) || null,
    [conversations, selectedId],
  );

  const handleSelectConversation = useCallback((conversationId: string) => {
    setDraft("");
    setPeerTyping(false);
    setError("");
    setSelectedId(conversationId);
  }, []);

  const closeNewConversation = useCallback(() => {
    setShowNewChat(false);
    setSearchUsers("");
    setUserResults([]);
  }, []);

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    setError("");
    try {
      const rows = await api.getConversations();
      setConversations(Array.isArray(rows) ? rows : []);
    } catch (err: any) {
      setError(getClientErrorMessage(err, "Impossible de charger les conversations"));
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const requestId = ++messageRequestRef.current;
    setLoadingMessages(true);
    setError("");
    try {
      const rows = await api.getConversationMessages(conversationId);
      if (requestId !== messageRequestRef.current) return;
      setMessages(Array.isArray(rows) ? rows : []);
      await api.markConversationRead(conversationId);
      if (requestId !== messageRequestRef.current) return;
      setConversations((prev) => prev.map((item) => (item.id === conversationId ? { ...item, unreadCount: 0 } : item)));
    } catch (err: any) {
      if (requestId !== messageRequestRef.current) return;
      setError(getClientErrorMessage(err, "Impossible de charger les messages"));
    } finally {
      if (requestId === messageRequestRef.current) setLoadingMessages(false);
    }
  }, []);

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!selectedId || deletingMessageId) return;
      setDeletingMessageId(messageId);
      setError("");
      try {
        await api.deleteConversationMessage(selectedId, messageId);
        setMessages((prev) => {
          const remaining = prev.filter((item) => item.id !== messageId);
          const lastMessage = remaining.at(-1) ?? null;
          setConversations((convPrev) =>
            convPrev.map((item) =>
              item.id === selectedId
                ? { ...item, lastMessage, updatedAt: lastMessage?.createdAt ?? item.updatedAt }
                : item,
            ),
          );
          return remaining;
        });
      } catch (err: any) {
        setError(getClientErrorMessage(err, "Suppression impossible"));
      } finally {
        setDeletingMessageId(null);
      }
    },
    [deletingMessageId, selectedId],
  );

  const handleMessageDeleted = useCallback(
    ({ conversationId, messageId }: { conversationId: string; messageId: string }) => {
      setMessages((prev) => (selectedId === conversationId ? prev.filter((item) => item.id !== messageId) : prev));
      setConversations((prev) =>
        prev.map((item) => {
          if (item.id !== conversationId || item.lastMessage?.id !== messageId) return item;
          return {
            ...item,
            lastMessage: null,
          };
        }),
      );
      void loadConversations();
    },
    [loadConversations, selectedId],
  );

  const { joinConversation, leaveConversation, emitTypingStart, emitTypingStop } = useMessagingSocket(true, {
    onMessage: (message) => {
      setConversations((prev) => {
        const next = prev.map((item) => {
          if (item.id !== message.conversationId) return item;
          return {
            ...item,
            updatedAt: message.createdAt,
            lastMessage: message,
            unreadCount:
              message.senderId === currentUserId
                ? item.unreadCount
                : item.unreadCount + (selectedId === item.id ? 0 : 1),
            isPeerTyping: false,
          };
        });
        return [...next].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
      if (message.conversationId === selectedId) {
        setMessages((prev) => (prev.some((item) => item.id === message.id) ? prev : [...prev, message]));
        if (message.senderId !== currentUserId) {
          api.markConversationRead(message.conversationId).catch(() => undefined);
        }
      }
    },
    onMessageRead: ({ conversationId, messageId, userId }) => {
      if (userId === currentUserId) return;
      setMessages((prev) =>
        prev.map((item) =>
          item.id === messageId && item.senderId === currentUserId
            ? { ...item, seenByOthers: true, seenCount: item.seenCount + 1 }
            : item,
        ),
      );
      if (conversationId === selectedId) setPeerTyping(false);
    },
    onMessageDeleted: handleMessageDeleted,
    onTyping: ({ conversationId, userId, isTyping }) => {
      if (conversationId !== selectedId || userId === currentUserId) return;
      setPeerTyping(isTyping);
      setConversations((prev) =>
        prev.map((item) => (item.id === conversationId ? { ...item, isPeerTyping: isTyping } : item)),
      );
    },
  });

  useEffect(() => {
    loadConversations();
    const params = new URLSearchParams(window.location.search);
    const preset = params.get("conversation");
    if (preset) setSelectedId(preset);
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) {
      messageRequestRef.current += 1;
      setMessages([]);
      setPeerTyping(false);
      return;
    }
    loadMessages(selectedId);
    joinConversation(selectedId);
    return () => leaveConversation(selectedId);
  }, [selectedId, loadMessages, joinConversation, leaveConversation]);

  useEffect(() => {
    const container = messagesScrollRef.current;
    if (container) {
      const frame = window.requestAnimationFrame(() => {
        container.scrollTo({ top: container.scrollHeight, behavior: loadingMessages ? "auto" : "smooth" });
      });
      return () => window.cancelAnimationFrame(frame);
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, peerTyping, loadingMessages]);

  useEffect(() => {
    const input = draftInputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 128)}px`;
  }, [draft]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      if (selectedId) emitTypingStop(selectedId);
    };
  }, [emitTypingStop, selectedId]);

  useEffect(() => {
    const query = searchUsers.trim();
    if (query.length < 2) {
      setUserResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const rows = await api.searchMessagingUsers(query);
        setUserResults(Array.isArray(rows) ? rows : []);
      } catch {
        setUserResults([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchUsers]);

  useEffect(() => {
    if (!showNewChat) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeNewConversation();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closeNewConversation, showNewChat]);

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (!selectedId) return;
    if (!value.trim()) {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      emitTypingStop(selectedId);
      return;
    }
    emitTypingStart(selectedId);
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => emitTypingStop(selectedId), 1200);
  };

  const sendMessage = useCallback(
    async (attachment?: OutgoingMessageAttachment, bodyOverride?: string) => {
      if (!selectedId || sendingRef.current) return;
      const body = bodyOverride === undefined ? draft.trim() : bodyOverride.trim();
      if (!body && !attachment) return;
      sendingRef.current = true;
      setSending(true);
      setError("");
      try {
        const payload = await api.sendConversationMessage(selectedId, {
          body,
          attachment: attachment
            ? {
                kind: attachment.kind,
                fileName: attachment.fileName,
                mimeType: attachment.mimeType,
                sizeBytes: attachment.sizeBytes,
                url: attachment.url,
                storageKey: attachment.storageKey,
              }
            : null,
        });
        setDraft("");
        if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
        emitTypingStop(selectedId);
        setMessages((prev) => (prev.some((item) => item.id === payload.id) ? prev : [...prev, payload]));
        setConversations((prev) => {
          const next = prev.map((item) =>
            item.id === selectedId
              ? { ...item, lastMessage: payload, updatedAt: payload.createdAt, isPeerTyping: false }
              : item,
          );
          return next.sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
        });
      } catch (err: any) {
        setError(getClientErrorMessage(err, "Envoi impossible"));
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [draft, emitTypingStop, selectedId],
  );

  const startConversation = async (participantUserId: string) => {
    if (startingConversationId) return;
    setStartingConversationId(participantUserId);
    setError("");
    try {
      const summary = await api.createConversation(participantUserId);
      closeNewConversation();
      setConversations((prev) => {
        const filtered = prev.filter((item) => item.id !== summary.id);
        return [summary, ...filtered];
      });
      handleSelectConversation(summary.id);
    } catch (err: any) {
      setError(getClientErrorMessage(err, "Impossible de démarrer la conversation"));
    } finally {
      setStartingConversationId(null);
    }
  };

  const uploadAndSendAttachment = useCallback(
    async (file: File) => {
      if (!selectedId || uploading) return;
      const normalizedFile = normalizeMessageUploadFile(file);
      const validationError = validateUploadFile(normalizedFile, "MESSAGE");
      if (validationError) {
        setError(validationError);
        return;
      }
      setUploading(true);
      setUploadProgress(0);
      setError("");
      const caption = draft.trim();
      try {
        const attachment = await uploadMessageAttachmentFile(normalizedFile, selectedId, (progress) =>
          setUploadProgress(progress),
        );
        await sendMessage(attachment, caption);
      } catch (err: any) {
        setError(getClientErrorMessage(err, getUploadErrorMessage(err)));
      } finally {
        setUploading(false);
        setUploadProgress(null);
      }
    },
    [draft, selectedId, uploading, sendMessage],
  );

  const audioRecorder = useMessageAudioRecorder({
    onRecorded: uploadAndSendAttachment,
    onError: (message) => setError(message),
  });

  const handleFilePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await uploadAndSendAttachment(file);
  };

  const accentBtn =
    role === "teacher"
      ? "bg-gradient-to-r from-emerald-600 to-emerald-600 hover:from-emerald-500 hover:to-emerald-500"
      : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500";
  const composerBusy = sending || uploading;

  return (
    <div className={scheduleUi.page}>
      <section className="relative overflow-hidden rounded-2xl border border-emerald-400/10 bg-[#041b17] shadow-2xl shadow-black/30 sm:rounded-3xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_48%)]" />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-500/10 text-emerald-300 shadow-lg shadow-emerald-950/30">
              <MessageCircleMore className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">Messagerie</h1>
                <span className="rounded-full border border-emerald-300/15 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-200">
                  Temps réel
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-sm">
                Échangez avec vos contacts académiques et partagez vos ressources en toute sécurité.
              </p>
            </div>
          </div>
          <button type="button" className={scheduleUi.addBtn} onClick={() => setShowNewChat(true)}>
            <Plus className="h-4 w-4" /> Nouvelle conversation
          </button>
        </div>
      </section>

      {error && (
        <div role="alert" aria-live="polite" className={scheduleUi.alertError}>
          {error}
        </div>
      )}

      <div
        data-testid="messaging-shell"
        className="grid h-[clamp(600px,72vh,820px)] grid-cols-1 overflow-hidden rounded-2xl border border-emerald-300/[0.12] bg-[#061f1a] shadow-2xl shadow-black/35 sm:rounded-3xl lg:grid-cols-[320px_1fr] xl:grid-cols-[350px_1fr]"
      >
        <aside
          className={`border-b border-white/[0.07] bg-[#08231e] lg:border-b-0 lg:border-r ${selectedId ? "hidden lg:flex" : "flex"} flex-col`}
        >
          <div className="border-b border-white/[0.07] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-white">Conversations</p>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                  {conversations.length} contact{conversations.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewChat(true)}
                aria-label="Nouvelle conversation"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-500/10 text-emerald-200 transition hover:bg-emerald-500/20"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={searchUsers}
                onChange={(event) => setSearchUsers(event.target.value)}
                placeholder="Rechercher un contact..."
                className="w-full rounded-xl border border-white/[0.08] bg-[#031512]/75 py-2.5 pl-10 pr-3 text-xs font-semibold text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400/40 focus:ring-4 focus:ring-emerald-500/10"
              />
            </label>
            {userResults.length > 0 && (
              <div className="mt-3 max-h-44 overflow-y-auto rounded-xl border border-emerald-300/10 bg-[#031512] p-1 shadow-xl">
                {userResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => startConversation(user.id)}
                    disabled={Boolean(startingConversationId)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-white/5 disabled:opacity-60"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#12352e] text-xs font-bold text-emerald-100">
                      {startingConversationId === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        peerInitials(user.fullName)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{user.fullName}</p>
                      <p className="truncate text-[11px] text-slate-400">{user.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col">
            {loadingConversations ? (
              <div className="flex flex-1 items-center justify-center p-8 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <Inbox className="h-8 w-8 text-emerald-400/45" />
                <p className="mt-3 text-sm font-bold text-slate-300">Aucune conversation</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Recherchez un contact pour commencer.</p>
              </div>
            ) : (
              <VirtualList
                className="flex-1 overscroll-contain"
                items={conversations}
                estimateSize={82}
                minItemsToVirtualize={20}
                getKey={(conversation) => conversation.id}
                renderItem={(conversation) => (
                  <ConversationListItem
                    conversation={conversation}
                    active={conversation.id === selectedId}
                    onSelect={handleSelectConversation}
                  />
                )}
              />
            )}
          </div>
        </aside>

        <section className={`${selectedId ? "flex" : "hidden lg:flex"} min-h-0 flex-col bg-[#031512]/70`}>
          {!selectedConversation ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-emerald-300/10 bg-emerald-500/[0.07] text-emerald-300/60">
                <MessageCircleMore className="h-8 w-8" />
              </div>
              <p className="mt-5 text-base font-black text-slate-200">Vos échanges académiques</p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                Sélectionnez une conversation dans la liste ou démarrez un nouvel échange.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <LockKeyhole className="h-3 w-3 text-emerald-400" /> Conversations privées
              </div>
            </div>
          ) : (
            <>
              <header className="flex min-h-[72px] items-center gap-3 border-b border-white/[0.07] bg-[#08231e]/85 px-4 py-3 backdrop-blur-xl sm:px-5">
                <button
                  type="button"
                  className="rounded-lg p-2 transition hover:bg-white/10 lg:hidden"
                  onClick={() => {
                    setSelectedId(null);
                    setDraft("");
                  }}
                  aria-label="Retour"
                >
                  <ArrowLeft className="h-5 w-5 text-white" />
                </button>
                <div className="min-w-0 flex-1">
                  <UserProfileTrigger
                    userId={selectedConversation.peer?.id}
                    userName={selectedConversation.peer?.fullName || "Contact"}
                    className="flex max-w-full items-center gap-3 text-white hover:text-emerald-200"
                  >
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-300/20 bg-[#12352e] text-xs font-black text-emerald-100">
                      {selectedConversation.peer?.avatarUrl ? (
                        <img src={selectedConversation.peer.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        peerInitials(selectedConversation.peer?.fullName || "Contact")
                      )}
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#08231e] bg-emerald-400" />
                    </div>
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-black">{selectedConversation.peer?.fullName}</span>
                      <span className="rounded-full border border-white/[0.07] bg-white/[0.04] px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-slate-400">
                        {getPeerRoleLabel(selectedConversation.peer?.role)}
                      </span>
                    </span>
                  </UserProfileTrigger>
                  <p
                    className={`ml-14 truncate text-[11px] ${peerTyping ? "font-semibold text-emerald-300" : "text-slate-400"}`}
                  >
                    {peerTyping || selectedConversation.isPeerTyping
                      ? "En train d'écrire…"
                      : selectedConversation.peer?.email}
                  </p>
                </div>
                <div className="hidden items-center gap-1.5 rounded-full border border-emerald-300/10 bg-emerald-500/[0.06] px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-200/70 sm:flex">
                  <LockKeyhole className="h-3 w-3" /> Privé
                </div>
              </header>

              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.045),transparent_55%)]">
                {loadingMessages ? (
                  <div className="flex flex-1 items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-300" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                    <MessageCircleMore className="h-9 w-9 text-emerald-400/35" />
                    <p className="mt-3 text-sm font-bold text-slate-300">Commencez la conversation</p>
                    <p className="mt-1 text-xs text-slate-500">Envoyez un message, une photo, une vidéo ou un vocal.</p>
                  </div>
                ) : (
                  <VirtualList
                    className="flex-1 overscroll-contain px-1 sm:px-2"
                    contentClassName="py-3 sm:py-4"
                    containerRef={messagesScrollRef}
                    items={messages}
                    estimateSize={108}
                    minItemsToVirtualize={15}
                    variableHeight
                    stickToEnd
                    getKey={(message) => message.id}
                    renderItem={(message, index) => {
                      const mine = message.senderId === currentUserId;
                      const previousMessage = messages[index - 1];
                      const showDay = !isSameMessageDay(previousMessage?.createdAt, message.createdAt);
                      return (
                        <div className="px-2 py-1 sm:px-5">
                          {showDay && (
                            <div className="mx-auto mb-4 mt-2 flex max-w-4xl items-center gap-3" role="separator">
                              <span className="h-px flex-1 bg-white/[0.05]" />
                              <span className="rounded-full border border-white/[0.07] bg-[#08231e] px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                {formatMessageDay(message.createdAt)}
                              </span>
                              <span className="h-px flex-1 bg-white/[0.05]" />
                            </div>
                          )}
                          <div className="mx-auto max-w-4xl">
                            <MessageBubble
                              message={message}
                              mine={mine}
                              role={role}
                              canDelete={mine && canDeleteOwnMessage(message, currentUserId)}
                              deleting={deletingMessageId === message.id}
                              onDelete={handleDeleteMessage}
                            />
                          </div>
                        </div>
                      );
                    }}
                  />
                )}
                <div ref={messagesEndRef} />
              </div>

              <footer className="border-t border-white/[0.07] bg-[#08231e]/90 p-3 backdrop-blur-xl sm:p-4">
                {uploadProgress !== null && (
                  <div className="mx-auto mb-3 max-w-4xl rounded-xl border border-emerald-300/10 bg-emerald-500/[0.05] px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3 text-[10px] font-bold text-emerald-100/80">
                      <span>Envoi de la pièce jointe</span>
                      <span>{formatUploadProgressLabel(uploadProgress)}</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-200"
                        style={{ width: uploadProgressBarWidth(uploadProgress) }}
                      />
                    </div>
                  </div>
                )}
                {audioRecorder.isRecording && (
                  <div className="mx-auto mb-3 flex max-w-4xl items-center gap-3 rounded-xl border border-rose-300/15 bg-rose-500/[0.08] px-3 py-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-400" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-rose-100">Enregistrement en cours</p>
                      <p className="text-[10px] text-rose-200/65">
                        {formatElapsedTime(audioRecorder.recordingSeconds)} · Appuyez sur le micro pour envoyer
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={audioRecorder.cancelRecording}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-200 transition hover:bg-rose-400/10"
                      aria-label="Annuler l'enregistrement vocal"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="mx-auto max-w-4xl">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFilePick}
                    accept={MESSAGE_ATTACHMENT_ACCEPT}
                  />
                  <div className="flex items-end gap-1.5 rounded-2xl border border-white/[0.09] bg-[#031512]/85 p-1.5 shadow-inner shadow-black/20 transition focus-within:border-emerald-400/30 focus-within:ring-4 focus-within:ring-emerald-500/[0.07] sm:gap-2">
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/[0.07] hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={composerBusy || audioRecorder.isRecording}
                      aria-label="Joindre un fichier"
                    >
                      {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
                    </button>
                    <button
                      type="button"
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                        audioRecorder.isRecording
                          ? "bg-rose-500/15 text-rose-200"
                          : "text-slate-300 hover:bg-white/[0.07] hover:text-emerald-200"
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                      onClick={audioRecorder.toggleRecording}
                      disabled={composerBusy || !selectedId}
                      aria-label={
                        audioRecorder.isRecording
                          ? "Arrêter et envoyer le message vocal"
                          : "Enregistrer un message vocal"
                      }
                      aria-pressed={audioRecorder.isRecording}
                    >
                      <Mic className={`h-5 w-5 ${audioRecorder.isRecording ? "animate-pulse" : ""}`} />
                    </button>
                    <textarea
                      ref={draftInputRef}
                      value={draft}
                      onChange={(event) => handleDraftChange(event.target.value)}
                      rows={1}
                      maxLength={4000}
                      disabled={composerBusy || audioRecorder.isRecording}
                      placeholder="Écrire un message…"
                      className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm leading-5 text-slate-100 outline-none placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey && !composerBusy) {
                          event.preventDefault();
                          void sendMessage();
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={composerBusy || audioRecorder.isRecording || !draft.trim()}
                      onClick={() => sendMessage()}
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg transition active:scale-95 disabled:cursor-not-allowed disabled:bg-white/[0.05] disabled:text-slate-600 disabled:shadow-none ${accentBtn}`}
                      aria-label="Envoyer le message"
                    >
                      {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" /> Image
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Video className="h-3 w-3" /> Vidéo
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Document
                      </span>
                    </div>
                    <span className="hidden items-center gap-1 sm:inline-flex">
                      <Clock3 className="h-3 w-3" /> Entrée pour envoyer
                    </span>
                  </div>
                </div>
              </footer>
            </>
          )}
        </section>
      </div>

      {showNewChat && (
        <div
          className={scheduleUi.modalOverlay}
          onMouseDown={(event) => event.target === event.currentTarget && closeNewConversation()}
        >
          <div
            className={scheduleUi.modalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-conversation-title"
          >
            <div className={`${scheduleUi.modalHeader} flex items-center justify-between`}>
              <div>
                <h2 id="new-conversation-title" className={scheduleUi.modalTitle}>
                  Nouvelle conversation
                </h2>
                <p className="mt-1 text-xs text-slate-500">Choisissez un contact académique.</p>
              </div>
              <button
                type="button"
                onClick={closeNewConversation}
                aria-label="Fermer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl transition hover:bg-white/[0.06]"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className={scheduleUi.modalBody}>
              <label className={scheduleUi.label}>Rechercher un utilisateur</label>
              <input
                autoFocus
                type="search"
                value={searchUsers}
                onChange={(event) => setSearchUsers(event.target.value)}
                className={scheduleUi.input}
                placeholder="Nom ou email (min. 2 caractères)"
              />
              <div className="space-y-2">
                {userResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => startConversation(user.id)}
                    disabled={Boolean(startingConversationId)}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-[#031512]/70 px-3 py-3 text-left transition hover:border-emerald-500/30 hover:bg-emerald-500/[0.04] disabled:opacity-60"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#12352e] text-xs font-bold text-emerald-100">
                      {startingConversationId === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        peerInitials(user.fullName)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white">{user.fullName}</p>
                      <p className="truncate text-xs text-slate-400">{user.email}</p>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                      {getPeerRoleLabel(user.role)}
                    </span>
                  </button>
                ))}
                {searchUsers.trim().length < 2 && (
                  <p className="rounded-xl border border-dashed border-white/[0.08] px-4 py-6 text-center text-xs text-slate-500">
                    Saisissez au moins 2 caractères pour rechercher.
                  </p>
                )}
                {searchUsers.trim().length >= 2 && userResults.length === 0 && !startingConversationId && (
                  <p className="rounded-xl border border-dashed border-white/[0.08] px-4 py-6 text-center text-xs text-slate-500">
                    Aucun contact trouvé.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
