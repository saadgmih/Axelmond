import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getClientErrorMessage } from "../../client-errors";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  FileText,
  Image as ImageIcon,
  Loader2,
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
import { uploadMessageAttachmentFile, normalizeMessageUploadFile, type OutgoingMessageAttachment } from "../../message-attachment-upload";
import { useMessageAudioRecorder } from "../../hooks/useMessageAudioRecorder";
import { MessageAudioPlayer } from "../../components/messaging/MessageAudioPlayer";
import { MessageVideoAttachment } from "../../components/messaging/MessageVideoAttachment";
import { canDeleteOwnMessage } from "../../message-delete-policy";
import { VirtualList } from "../../components/VirtualList";
import { useMessagingSocket } from "../../hooks/useMessagingSocket";
import type { ChatMessage, ConversationSummary, MessagingUser } from "../../types/messaging";
import { scheduleUi } from "../teacher/schedule-theme";

interface MessagesViewProps {
  currentUserId: string;
  role: "student" | "teacher";
}

function formatDayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
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
  role: "student" | "teacher";
  onSelect: (conversationId: string) => void;
}

const ConversationListItem = memo(function ConversationListItem({
  conversation,
  active,
  role,
  onSelect,
}: ConversationListItemProps) {
  const peerName = conversation.peer?.fullName || "Conversation";
  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      className={`flex w-full items-start gap-3 border-b border-white/[0.05] px-4 py-3 text-left transition ${active ? "bg-white/10" : "hover:bg-white/5"}`}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full ${active ? (role === "teacher" ? "bg-emerald-600/30" : "bg-emerald-600/30") : "bg-slate-700"} text-sm font-black text-white`}
      >
        {conversation.peer?.avatarUrl ? (
          <img src={conversation.peer.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
        ) : (
          peerInitials(peerName)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-bold text-white">{peerName}</p>
          <span className="text-[10px] font-semibold text-slate-500">
            {conversation.lastMessage ? formatDayLabel(conversation.lastMessage.createdAt) : ""}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-slate-400">
          {conversation.isPeerTyping
            ? "En train d'écrire..."
            : conversation.lastMessage?.body ||
              (conversation.lastMessage?.attachments?.length ? "Pièce jointe" : "Démarrer la conversation")}
        </p>
      </div>
      {conversation.unreadCount > 0 && (
        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
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
    <div className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative rounded-2xl shadow-lg ${
          isAudioOnly ? "w-auto min-w-[200px] max-w-[min(85%,280px)] px-4 py-3" : "max-w-[85%] px-4 py-3"
        } ${mine ? "rounded-br-md bg-emerald-600 text-white" : "rounded-bl-md border border-white/10 bg-[#0b241f] text-slate-100"}`}
      >
        {message.body && <p className="whitespace-pre-wrap text-sm">{message.body}</p>}
        {renderAttachment(message, role, mine)}
        <div className={`mt-2 flex items-center gap-1.5 text-[10px] ${mine ? "text-emerald-100/80" : "text-slate-500"}`}>
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
              className={`ml-1 inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors disabled:opacity-50 ${
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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedId) || null,
    [conversations, selectedId],
  );

  const handleSelectConversation = useCallback((conversationId: string) => {
    setSelectedId(conversationId);
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
    setLoadingMessages(true);
    setError("");
    try {
      const rows = await api.getConversationMessages(conversationId);
      setMessages(Array.isArray(rows) ? rows : []);
      await api.markConversationRead(conversationId);
      setConversations((prev) => prev.map((item) => (item.id === conversationId ? { ...item, unreadCount: 0 } : item)));
    } catch (err: any) {
      setError(getClientErrorMessage(err, "Impossible de charger les messages"));
    } finally {
      setLoadingMessages(false);
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
    },
    [selectedId],
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
      setMessages([]);
      return;
    }
    loadMessages(selectedId);
    joinConversation(selectedId);
    return () => leaveConversation(selectedId);
  }, [selectedId, loadMessages, joinConversation, leaveConversation]);

  useEffect(() => {
    const container = messagesScrollRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, peerTyping]);

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

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (!selectedId) return;
    emitTypingStart(selectedId);
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => emitTypingStop(selectedId), 1200);
  };

  const sendMessage = useCallback(
    async (attachment?: OutgoingMessageAttachment) => {
      if (!selectedId || sending) return;
      const body = draft.trim();
      if (!body && !attachment) return;
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
        emitTypingStop(selectedId);
        setMessages((prev) => (prev.some((item) => item.id === payload.id) ? prev : [...prev, payload]));
      } catch (err: any) {
        setError(getClientErrorMessage(err, "Envoi impossible"));
      } finally {
        setSending(false);
      }
    },
    [draft, emitTypingStop, selectedId, sending],
  );

  const startConversation = async (participantUserId: string) => {
    try {
      const summary = await api.createConversation(participantUserId);
      setShowNewChat(false);
      setSearchUsers("");
      setUserResults([]);
      setConversations((prev) => {
        const filtered = prev.filter((item) => item.id !== summary.id);
        return [summary, ...filtered];
      });
      setSelectedId(summary.id);
    } catch (err: any) {
      setError(getClientErrorMessage(err, "Impossible de démarrer la conversation"));
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
      try {
        const attachment = await uploadMessageAttachmentFile(normalizedFile, selectedId, (progress) =>
          setUploadProgress(progress),
        );
        await sendMessage(attachment);
      } catch (err: any) {
        setError(getClientErrorMessage(err, getUploadErrorMessage(err)));
      } finally {
        setUploading(false);
        setUploadProgress(null);
      }
    },
    [selectedId, uploading, sendMessage],
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

  return (
    <div className={scheduleUi.page}>
      <section className={scheduleUi.hero}>
        <div className={scheduleUi.heroGradient} />
        <div className={scheduleUi.heroInner}>
          <div>
            <h1 className={scheduleUi.heroTitle}>Messagerie</h1>
            <p className={scheduleUi.heroSubtitle}>
              Conversations sécurisées entre professeurs et étudiants, avec pièces jointes et statut de lecture en temps
              réel.
            </p>
          </div>
          <button type="button" className={scheduleUi.addBtn} onClick={() => setShowNewChat(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle conversation
          </button>
        </div>
      </section>

      {error && <div className={scheduleUi.alertError}>{error}</div>}

      <div className="grid min-h-[70vh] grid-cols-1 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b241f]/80 shadow-2xl shadow-black/30 lg:grid-cols-[340px_1fr]">
        <aside
          className={`border-b border-white/[0.08] lg:border-b-0 lg:border-r ${selectedId ? "hidden lg:flex" : "flex"} flex-col`}
        >
          <div className="border-b border-white/[0.08] p-4">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={searchUsers}
                onChange={(event) => setSearchUsers(event.target.value)}
                placeholder="Rechercher un contact..."
                className={`${scheduleUi.input} pl-10`}
              />
            </label>
            {userResults.length > 0 && (
              <div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#031512]/80">
                {userResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => startConversation(user.id)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/5"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-xs font-bold">
                      {peerInitials(user.fullName)}
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
              <p className="p-6 text-center text-sm text-slate-500">Aucune conversation pour le moment.</p>
            ) : (
              <VirtualList
                className="flex-1"
                items={conversations}
                estimateSize={76}
                minItemsToVirtualize={20}
                getKey={(conversation) => conversation.id}
                renderItem={(conversation) => (
                  <ConversationListItem
                    conversation={conversation}
                    active={conversation.id === selectedId}
                    role={role}
                    onSelect={handleSelectConversation}
                  />
                )}
              />
            )}
          </div>
        </aside>

        <section className={`${selectedId ? "flex" : "hidden lg:flex"} min-h-[420px] flex-col bg-[#031512]/40`}>
          {!selectedConversation ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-slate-500">
              Sélectionnez une conversation ou créez-en une nouvelle.
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3">
                <button
                  type="button"
                  className="lg:hidden rounded-lg p-2 hover:bg-white/10"
                  onClick={() => setSelectedId(null)}
                  aria-label="Retour"
                >
                  <ArrowLeft className="h-5 w-5 text-white" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-white">{selectedConversation.peer?.fullName}</p>
                  <p className="truncate text-[11px] text-slate-400">
                    {peerTyping || selectedConversation.isPeerTyping
                      ? "En train d'écrire..."
                      : selectedConversation.peer?.email}
                  </p>
                </div>
              </header>

              <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
                {loadingMessages ? (
                  <div className="flex flex-1 justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <VirtualList
                    className="flex-1"
                    containerRef={messagesScrollRef}
                    items={messages}
                    estimateSize={96}
                    minItemsToVirtualize={15}
                    variableHeight
                    getKey={(message) => message.id}
                    renderItem={(message) => {
                      const mine = message.senderId === currentUserId;
                      return (
                        <MessageBubble
                          message={message}
                          mine={mine}
                          role={role}
                          canDelete={mine && canDeleteOwnMessage(message, currentUserId)}
                          deleting={deletingMessageId === message.id}
                          onDelete={handleDeleteMessage}
                        />
                      );
                    }}
                  />
                )}
                <div ref={messagesEndRef} />
              </div>

              <footer className="border-t border-white/[0.08] p-3 sm:p-4">
                {uploadProgress !== null && (
                  <div className="mb-3 space-y-1.5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all duration-200 ${role === "teacher" ? "bg-emerald-500" : "bg-emerald-500"}`}
                        style={{ width: uploadProgressBarWidth(uploadProgress) }}
                      />
                    </div>
                    <p className="text-[11px] font-semibold text-slate-400">
                      Téléversement : {formatUploadProgressLabel(uploadProgress)}
                    </p>
                  </div>
                )}
                {audioRecorder.isRecording && (
                  <p className="mb-3 text-[11px] font-semibold text-red-300">
                    Enregistrement vocal en cours… Cliquez à nouveau sur le micro pour envoyer.
                  </p>
                )}
                <div className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFilePick}
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,audio/mpeg,audio/wav,audio/webm,audio/mp4,audio/ogg,application/pdf,.doc,.docx"
                  />
                  <button
                    type="button"
                    className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-200 hover:bg-white/10"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || audioRecorder.isRecording}
                    aria-label="Joindre un fichier"
                  >
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
                  </button>
                  <button
                    type="button"
                    className={`rounded-xl border p-3 transition-colors ${
                      audioRecorder.isRecording
                        ? "border-red-400/40 bg-red-500/15 text-red-200"
                        : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                    }`}
                    onClick={audioRecorder.toggleRecording}
                    disabled={uploading || !selectedId}
                    aria-label={
                      audioRecorder.isRecording ? "Arrêter et envoyer le message vocal" : "Enregistrer un message vocal"
                    }
                    aria-pressed={audioRecorder.isRecording}
                  >
                    <Mic className={`h-5 w-5 ${audioRecorder.isRecording ? "animate-pulse" : ""}`} />
                  </button>
                  <textarea
                    value={draft}
                    onChange={(event) => handleDraftChange(event.target.value)}
                    rows={1}
                    placeholder="Écrire un message..."
                    className={`${scheduleUi.textarea} min-h-[48px] max-h-32 flex-1 resize-none`}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={sending || (!draft.trim() && !uploading)}
                    onClick={() => sendMessage()}
                    className={`rounded-xl p-3 text-white shadow-lg disabled:opacity-50 ${accentBtn}`}
                    aria-label="Envoyer"
                  >
                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" /> Images
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Video className="h-3 w-3" /> Vidéos
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Mic className="h-3 w-3" /> Audio
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3 w-3" /> PDF / Word
                  </span>
                </div>
              </footer>
            </>
          )}
        </section>
      </div>

      {showNewChat && (
        <div className={scheduleUi.modalOverlay}>
          <div className={scheduleUi.modalPanel}>
            <div className={`${scheduleUi.modalHeader} flex items-center justify-between`}>
              <h2 className={scheduleUi.modalTitle}>Nouvelle conversation</h2>
              <button type="button" onClick={() => setShowNewChat(false)} aria-label="Fermer">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className={scheduleUi.modalBody}>
              <label className={scheduleUi.label}>Rechercher un utilisateur</label>
              <input
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
                    className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-[#031512]/70 px-3 py-3 text-left hover:border-emerald-500/30"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-xs font-bold">
                      {peerInitials(user.fullName)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{user.fullName}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
