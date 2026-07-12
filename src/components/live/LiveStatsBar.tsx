import React from "react";
import { Hand, MessageSquare, Timer, UserCheck, Wifi } from "lucide-react";
import { formatLiveDuration, formatLiveStat } from "./live-classroom-formatters";

export interface LiveStatsBarProps {
  elapsedSeconds: number;
  connectedCount: number;
  raisedHands: number;
  questionsCount: number;
  averageQuality: string;
}

export default function LiveStatsBar({
  elapsedSeconds,
  connectedCount,
  raisedHands,
  questionsCount,
  averageQuality,
}: LiveStatsBarProps) {
  return (
    <div className="shrink-0 bg-zinc-900/95 border-b border-white/5 py-2 px-4 flex justify-between md:justify-center items-center gap-4 lg:gap-10 overflow-x-auto hide-scrollbar z-30">
      <div className="flex items-center gap-2 text-xs text-zinc-300">
        <Timer className="w-4 h-4 text-emerald-400" />
        <span className="font-mono">{formatLiveDuration(elapsedSeconds)}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-300">
        <UserCheck className="w-4 h-4 text-emerald-400" />
        <span className="font-bold">{formatLiveStat(connectedCount, "connecté", "connectés")}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-300">
        <Hand className="w-4 h-4 text-lime-400" />
        <span className="font-bold">{formatLiveStat(raisedHands, "main levée", "mains levées")}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-300 hidden sm:flex">
        <MessageSquare className="w-4 h-4 text-emerald-400" />
        <span className="font-bold">{formatLiveStat(questionsCount, "question", "questions")}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-300 hidden lg:flex">
        <Wifi className="w-4 h-4 text-zinc-400" />
        <span className="font-medium text-zinc-400">{averageQuality}</span>
      </div>
    </div>
  );
}
