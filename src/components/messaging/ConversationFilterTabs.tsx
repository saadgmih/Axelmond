import React from "react";
import { MessageSquare, Volume2, VolumeX } from "lucide-react";
import { isSoundEnabled, setSoundEnabled } from "../../utils/notification-sound";

export type ConversationFilter = "all" | "unread";

interface ConversationFilterTabsProps {
  filter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
  totalCount: number;
  unreadCount: number;
  soundActive: boolean;
  onToggleSound: () => void;
}

export default function ConversationFilterTabs({
  filter,
  onFilterChange,
  totalCount,
  unreadCount,
  soundActive,
  onToggleSound,
}: ConversationFilterTabsProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-4 py-2 bg-[#061e19]">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onFilterChange("all")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
            filter === "all"
              ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          <span>Toutes</span>
          <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-slate-300">
            {totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("unread")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
            filter === "unread"
              ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          <span>Non lues</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-emerald-400 px-1.5 py-0.2 text-[10px] font-black text-[#042019]">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={onToggleSound}
        title={soundActive ? "Sons activés (cliquer pour couper)" : "Sons coupés (cliquer pour activer)"}
        aria-label={soundActive ? "Désactiver les alertes sonores" : "Activer les alertes sonores"}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
          soundActive
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
            : "border-white/10 bg-white/5 text-slate-500 hover:text-slate-300"
        }`}
      >
        {soundActive ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
