import { memo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle,
  CheckCircle2,
  FileText,
  HelpCircle,
  Loader2,
  PlayCircle,
  RotateCcw,
} from "lucide-react";
import type { CourseModule } from "../../../types";

interface StudentCourseBottomNavProps {
  modules: CourseModule[];
  currentModule: CourseModule;
  onSelectModule: (module: CourseModule) => void;
  onToggleCompleted: (completed: boolean) => void;
  isCompleted: boolean;
  isPending: boolean;
  completionLabel?: string;
}

function getModuleIcon(type?: string) {
  switch (type) {
    case "video":
      return PlayCircle;
    case "pdf":
      return FileText;
    case "image":
      return Camera;
    case "quiz":
      return HelpCircle;
    default:
      return FileText;
  }
}

export const StudentCourseBottomNav = memo(function StudentCourseBottomNav({
  modules,
  currentModule,
  onSelectModule,
  onToggleCompleted,
  isCompleted,
  isPending,
  completionLabel,
}: StudentCourseBottomNavProps) {
  const currentIndex = modules.findIndex((m) => m.id === currentModule.id);
  const prevModule = currentIndex > 0 ? modules[currentIndex - 1] : null;
  const nextModule = currentIndex >= 0 && currentIndex < modules.length - 1 ? modules[currentIndex + 1] : null;

  const PrevIcon = prevModule ? getModuleIcon(prevModule.type) : null;
  const NextIcon = nextModule ? getModuleIcon(nextModule.type) : null;

  return (
    <nav
      aria-label="Navigation entre leçons"
      className="mt-8 pt-6 border-t border-slate-200 bg-white rounded-2xl p-4 sm:p-5 shadow-xs"
    >
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Previous Module CTA */}
        <div className="flex-1 min-w-0">
          {prevModule ? (
            <button
              type="button"
              onClick={() => onSelectModule(prevModule)}
              className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex items-center gap-3 group cursor-pointer"
              title={`Aller à : ${prevModule.title}`}
            >
              <div className="h-9 w-9 rounded-lg bg-slate-100 group-hover:bg-emerald-100 text-slate-500 group-hover:text-emerald-700 flex items-center justify-center shrink-0 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 group-hover:text-emerald-600">
                  {PrevIcon && <PrevIcon className="w-3 h-3" />}
                  <span>Leçon précédente</span>
                </div>
                <p className="text-xs font-bold text-slate-800 truncate leading-snug mt-0.5">
                  {prevModule.title}
                </p>
              </div>
            </button>
          ) : (
            <div className="hidden lg:block text-[11px] text-slate-400 font-medium px-2 italic">
              Début du plan d'apprentissage
            </div>
          )}
        </div>

        {/* Central Completion Action */}
        <div className="flex items-center justify-center shrink-0">
          {isCompleted ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Chapitre validé
              </span>
              <button
                type="button"
                disabled={isPending}
                onClick={() => onToggleCompleted(false)}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                title="Annuler la validation de ce chapitre"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={() => onToggleCompleted(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-sm shadow-emerald-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement…</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>{completionLabel || "Valider et terminer le chapitre"}</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Next Module CTA */}
        <div className="flex-1 min-w-0">
          {nextModule ? (
            <button
              type="button"
              onClick={() => onSelectModule(nextModule)}
              className={`w-full text-right p-3.5 rounded-xl border transition-all flex items-center justify-end gap-3 group cursor-pointer ${
                isCompleted
                  ? "border-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 shadow-xs"
                  : "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30"
              }`}
              title={`Continuer vers : ${nextModule.title}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-end gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">
                  <span>{isCompleted ? "Continuer la suite" : "Leçon suivante"}</span>
                  {NextIcon && <NextIcon className="w-3 h-3" />}
                </div>
                <p className="text-xs font-bold text-slate-800 truncate leading-snug mt-0.5">
                  {nextModule.title}
                </p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-emerald-600 group-hover:bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs transition-colors">
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          ) : (
            <div className="text-right text-[11px] text-emerald-700 font-extrabold px-2">
              🎉 Dernier chapitre du cours
            </div>
          )}
        </div>
      </div>

      {/* Helpful keyboard shortcut hints */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-medium">
        <span>Raccourcis : Utilisez les flèches du clavier [←] et [→] pour naviguer</span>
        <span className="font-mono text-slate-500">
          {currentIndex + 1} sur {modules.length} modules
        </span>
      </div>
    </nav>
  );
});
