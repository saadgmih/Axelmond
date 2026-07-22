import React from "react";
import { MessageSquare, Paperclip, Send } from "lucide-react";
import { LiveChatMessage } from "../../livekit";
import type { LiveParticipantCard } from "../VirtualClassroom";
import LiveChatMessageRow from "./LiveChatMessageRow";

export interface LiveChatPanelProps {
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
      <div className="mb-3 shrink-0 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2.5 text-center text-xs font-bold text-emerald-200">
        Messages live
      </div>

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
            className="w-full bg-zinc-900 border border-white/5 rounded-lg px-3 py-2 text-xs text-white mb-4 focus:outline-none focus:border-emerald-500"
          >
            <option value="">Sélectionner un destinataire...</option>
            {connectedParticipants
              .filter((p) => !p.isLocal)
              .map((p) => (
                <option key={p.identity} value={p.name}>
                  {p.name}
                </option>
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
            chatMessages.map((message) => <LiveChatMessageRow key={message.id} message={message} />)
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
              aria-label="Message du chat live"
              className="live-panel-input w-full rounded-xl pl-9 pr-12 py-3 text-sm transition-colors focus:outline-none"
            />
            <button
              type="submit"
              disabled={!chatDraft.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 touch-target p-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-transparent disabled:text-zinc-600 text-white rounded-lg transition-colors flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
