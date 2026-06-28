import React from "react";
import { ChevronLeft, PenTool, Settings } from "lucide-react";
import { Course } from "../../types";

export interface LiveClassroomHeaderProps {
  course: Course;
  isRecording: boolean;
  focusMode: boolean;
  onBack?: () => void;
  onOpenWhiteboard: () => void;
  onOpenSettings: () => void;
}

export default function LiveClassroomHeader({
  course,
  isRecording,
  focusMode,
  onBack,
  onOpenWhiteboard,
  onOpenSettings,
}: LiveClassroomHeaderProps) {
  return (
    <header className="h-14 shrink-0 w-full max-w-full bg-zinc-900 border-b border-white/5 flex items-center justify-between px-4 lg:px-6 z-40 box-border">
      <div className="flex items-center gap-4 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="touch-target p-2 -ml-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center"
            title="Retour au module"
            aria-label="Retour au module"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm lg:text-base font-bold truncate tracking-tight text-zinc-100">{course.title}</h1>
            {isRecording && (
              <span className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] uppercase font-black bg-red-500/10 text-red-400 border border-red-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                REC
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 truncate font-medium">
            Laboratoire : {course.liveSubject || "Session académique"} • Dr. {course.instructor}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {focusMode && (
          <button
            type="button"
            onClick={onOpenWhiteboard}
            className="relative touch-target p-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors border border-emerald-400/20 flex items-center gap-2 min-h-[44px]"
            title="Ouvrir le tableau blanc"
            aria-label="Ouvrir le tableau blanc"
          >
            <PenTool className="w-4 h-4 text-emerald-300" />
            <span className="text-xs font-bold text-emerald-100 hidden sm:block">Tableau blanc</span>
          </button>
        )}
        <button
          type="button"
          onClick={onOpenSettings}
          className="touch-target p-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors border border-white/5 min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Paramètres Live"
          aria-label="Ouvrir les paramètres live"
        >
          <Settings className="w-4 h-4 text-zinc-200" />
        </button>
      </div>
    </header>
  );
}
