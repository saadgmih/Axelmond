import React from "react";
import { MessageSquare, Paperclip, Send, Sparkles } from "lucide-react";
import { Course } from "../../types";
import { LiveChatMessage } from "../../livekit";
import type { LiveParticipantCard } from "../VirtualClassroom";
import AITutorChat from "../AITutorChat";
import LiveChatMessageRow from "./LiveChatMessageRow";

export interface LiveChatPanelProps {
  course: Course;
  chatView: "messages" | "tutor";
  onChatViewChange: (view: "messages" | "tutor") => void;
  messageMode: "public" | "question" | "private";
  onMessageModeChange: (mode: "public" | "question" | "private") => void;
  privateTarget: string;
  onPrivateTargetChange: (value: string) => void;
  connectedParticipants: LiveParticipantCard[];
  chatMessages: LiveChatMessage[];
  chatDraft: string;
  onChatDraftChange: (value: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
}

export default function LiveChatPanel({
  course,
  chatView,
  onChatViewChange,
  messageMode,
  onMessageModeChange,
  privateTarget,
  onPrivateTargetChange,
  connectedParticipants,
  chatMessages,
  chatDraft,
  onChatDraftChange,
  onSendMessage,
}: LiveChatPanelProps) {
  return (
    <div className="flex flex-1 min-h-0 flex-col animate-in fade-in duration-300">
      <div className="mb-3 grid grid-cols-2 gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onChatViewChange("messages")}
          aria-pressed={chatView === "messages"}
          className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
            chatView === "messages"
              ? "border-indigo-400/40 bg-indigo-500/10 text-indigo-200"
              : "border-white/10 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Messages live
        </button>
        <button
          type="button"
          onClick={() => onChatViewChange("tutor")}
          aria-pressed={chatView === "tutor"}
          className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            chatView === "tutor"
              ? "border-indigo-400/40 bg-indigo-500/10 text-indigo-200"
              : "border-white/10 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Tuteur IA
        </button>
      </div>

      {chatView === "tutor" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <AITutorChat
            courseId={course.id}
            courseTitle={course.title}
            moduleTitle={course.liveSubject || "Session live"}
            variant="live"
            className="min-h-0 flex-1 w-full"
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex bg-zinc-900 rounded-lg p-1 mb-4 border border-white/5 shrink-0">
            {(["public", "question", "private"] as const).map((item) => (
              <button
                key={item}
                onClick={() => onMessageModeChange(item)}
                className={`flex-1 rounded-md py-1.5 text-[10px] font-bold uppercase transition-colors ${
                  messageMode === item ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {item === "question" ? "Q&A" : item}
              </button>
            ))}
          </div>

          {messageMode === "private" && (
            <select
              value={privateTarget}
              onChange={(event) => onPrivateTargetChange(event.target.value)}
              className="w-full bg-zinc-900 border border-white/5 rounded-lg px-3 py-2 text-xs text-white mb-4 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Sélectionner un destinataire...</option>
              {connectedParticipants.filter((p) => !p.isLocal).map((p) => (
                <option key={p.identity} value={p.name}>{p.name}</option>
              ))}
            </select>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-50">
                <MessageSquare className="w-8 h-8 text-zinc-600" />
                <p className="text-xs text-zinc-400">Le chat académique est ouvert.</p>
              </div>
            ) : (
              chatMessages.map((message) => (
                <LiveChatMessageRow key={message.id} message={message} />
              ))
            )}
          </div>

          <div className="shrink-0 mt-4 space-y-3">
            <form onSubmit={onSendMessage} className="relative">
              <button
                type="button"
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-white transition-colors"
                title="Joindre un fichier"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                value={chatDraft}
                onChange={(event) => onChatDraftChange(event.target.value)}
                placeholder="Tapez votre message..."
                className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-12 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
              />
              <button
                type="submit"
                disabled={!chatDraft.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 touch-target p-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-transparent disabled:text-zinc-600 text-white rounded-lg transition-colors flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
