import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  ListChecks,
  Pause,
  Play,
  RefreshCcw,
  Target,
  Trophy,
  X,
} from "lucide-react";
import type { Course, CourseModule } from "../types";

type CoachTab = "overview" | "plan" | "exam";

export interface SuccessCoachSnapshot {
  completionPercent: number;
  masteryPercent: number | null;
  readinessPercent: number;
  completedModules: number;
  totalModules: number;
  quizModules: CourseModule[];
}

export interface SuccessCoachAction {
  module: CourseModule;
  label: string;
  reason: string;
  estimatedMinutes: number;
  priority: "urgent" | "next" | "review";
}

interface SuccessCoachPanelProps {
  course: Course;
  selectedModuleId: number;
  onSelectModule: (module: CourseModule) => void;
  onResetQuiz: () => void;
  onClose: () => void;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function parseModuleScore(score?: string): number | null {
  if (!score) return null;
  const match = score.trim().match(/^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/);
  if (!match) return null;
  const earned = Number(match[1].replace(",", "."));
  const total = Number(match[2].replace(",", "."));
  if (!Number.isFinite(earned) || !Number.isFinite(total) || total <= 0) return null;
  return clampPercent((earned / total) * 100);
}

export function estimateModuleMinutes(module: CourseModule): number {
  const duration = module.duration?.toLowerCase() || "";
  const hours = Number(duration.match(/(\d+(?:[.,]\d+)?)\s*h/)?.[1]?.replace(",", ".") || 0);
  const minutes = Number(duration.match(/(\d+(?:[.,]\d+)?)\s*(?:min|m\b)/)?.[1]?.replace(",", ".") || 0);
  const parsed = Math.round(hours * 60 + minutes);
  if (parsed > 0) return Math.min(parsed, 90);
  if (module.type === "quiz") return 15;
  if (module.type === "video") return 20;
  return 12;
}

export function buildSuccessCoachSnapshot(course: Course): SuccessCoachSnapshot {
  const modules = course.modules.filter((module) => module.published !== false);
  const totalModules = modules.length;
  const completedModules = modules.filter((module) => module.completed).length;
  const completionPercent = totalModules ? clampPercent((completedModules / totalModules) * 100) : 0;
  const quizModules = modules.filter((module) => module.type === "quiz");
  const quizScores = quizModules
    .map((module) => parseModuleScore(module.score))
    .filter((score): score is number => score !== null);
  const masteryPercent = quizScores.length
    ? clampPercent(quizScores.reduce((total, score) => total + score, 0) / quizScores.length)
    : null;
  const readinessPercent =
    masteryPercent === null ? completionPercent : clampPercent(completionPercent * 0.65 + masteryPercent * 0.35);

  return {
    completionPercent,
    masteryPercent,
    readinessPercent,
    completedModules,
    totalModules,
    quizModules,
  };
}

export function buildSuccessCoachPlan(course: Course): SuccessCoachAction[] {
  const modules = course.modules.filter((module) => module.published !== false);
  const lowScoreQuizzes = modules.filter((module) => {
    const score = parseModuleScore(module.score);
    return module.type === "quiz" && score !== null && score < 70;
  });
  const incompleteLessons = modules.filter((module) => module.type !== "quiz" && !module.completed);
  const incompleteQuizzes = modules.filter((module) => module.type === "quiz" && !module.completed);
  const reviewModules = modules.filter(
    (module) => module.completed && !lowScoreQuizzes.some((quiz) => quiz.id === module.id),
  );
  const seen = new Set<number>();
  const actions: SuccessCoachAction[] = [];

  const append = (
    candidates: CourseModule[],
    label: string,
    reason: string,
    priority: SuccessCoachAction["priority"],
  ) => {
    for (const module of candidates) {
      if (seen.has(module.id) || actions.length >= 4) continue;
      seen.add(module.id);
      actions.push({ module, label, reason, priority, estimatedMinutes: estimateModuleMinutes(module) });
    }
  };

  append(lowScoreQuizzes, "Renforcer cette notion", "Votre dernier résultat mérite une nouvelle tentative.", "urgent");
  append(incompleteLessons, "Continuer le module", "C'est la prochaine étape non terminée de votre parcours.", "next");
  append(incompleteQuizzes, "Tester vos acquis", "Validez vos connaissances avec cet examen blanc.", "next");
  append(reviewModules, "Révision express", "Consolidez une notion déjà étudiée.", "review");

  return actions;
}

function readinessLabel(readiness: number): string {
  if (readiness >= 85) return "Prêt pour l'évaluation";
  if (readiness >= 65) return "Bonne progression";
  if (readiness >= 35) return "En consolidation";
  return "Parcours à démarrer";
}

function formatTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export default function SuccessCoachPanel({
  course,
  selectedModuleId,
  onSelectModule,
  onResetQuiz,
  onClose,
}: SuccessCoachPanelProps) {
  const [activeTab, setActiveTab] = useState<CoachTab>("overview");
  const [sessionMinutes, setSessionMinutes] = useState(15);
  const [remainingSeconds, setRemainingSeconds] = useState(15 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const snapshot = useMemo(() => buildSuccessCoachSnapshot(course), [course]);
  const plan = useMemo(() => buildSuccessCoachPlan(course), [course]);
  const primaryAction = plan[0] ?? null;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!timerRunning) return;
    if (remainingSeconds <= 0) {
      setTimerRunning(false);
      return;
    }
    const interval = window.setInterval(() => setRemainingSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(interval);
  }, [remainingSeconds, timerRunning]);

  const changeSessionDuration = (minutes: number) => {
    setSessionMinutes(minutes);
    setRemainingSeconds(minutes * 60);
    setTimerRunning(false);
  };

  const openModule = (module: CourseModule, restartQuiz = false) => {
    if (restartQuiz && module.id === selectedModuleId) onResetQuiz();
    onSelectModule(module);
    onClose();
  };

  const tabs: Array<{ id: CoachTab; label: string }> = [
    { id: "overview", label: "Synthèse" },
    { id: "plan", label: "Mon plan" },
    { id: "exam", label: "Examens" },
  ];

  return (
    <aside
      aria-label="Coach de réussite"
      className="flex h-full min-h-0 w-full flex-col overflow-hidden border-l border-emerald-400/15 bg-slate-950 text-slate-100 shadow-2xl shadow-black/30"
    >
      <header className="border-b border-white/10 bg-gradient-to-br from-emerald-500/15 via-slate-950 to-slate-950 px-5 pb-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
              <Target className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400">Plan personnalisé</p>
              <h2 className="truncate text-base font-black text-white">Coach de réussite</h2>
              <p className="truncate text-[11px] text-slate-400">{course.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le coach de réussite"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 rounded-xl border border-white/10 bg-black/20 p-1" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-2 py-2 text-[11px] font-bold transition ${
                activeTab === tab.id ? "bg-emerald-500 text-emerald-950" : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
        {activeTab === "overview" && (
          <div className="space-y-5">
            <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
              <div className="flex items-center gap-4">
                <div
                  className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(rgb(52 211 153) ${snapshot.readinessPercent}%, rgb(30 41 59) 0)`,
                  }}
                  aria-label={`Préparation ${snapshot.readinessPercent} %`}
                >
                  <div className="flex h-[78px] w-[78px] flex-col items-center justify-center rounded-full bg-slate-950">
                    <span className="text-2xl font-black text-white">{snapshot.readinessPercent}%</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">Préparation</span>
                  </div>
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-black text-white">{readinessLabel(snapshot.readinessPercent)}</p>
                  <p className="text-xs leading-relaxed text-slate-400">
                    Calculé à partir de votre progression et de vos résultats aux QCM.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Progression</p>
                  <p className="mt-1 text-lg font-black text-white">{snapshot.completionPercent}%</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Maîtrise QCM</p>
                  <p className="mt-1 text-lg font-black text-white">
                    {snapshot.masteryPercent === null ? "À mesurer" : `${snapshot.masteryPercent}%`}
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-300">
                <Trophy className="h-4 w-4 text-amber-300" /> Prochaine meilleure action
              </div>
              {primaryAction ? (
                <button
                  type="button"
                  onClick={() => openModule(primaryAction.module, primaryAction.module.type === "quiz")}
                  className="group w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-emerald-400/35 hover:bg-emerald-400/[0.08]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                        {primaryAction.label} · {primaryAction.estimatedMinutes} min
                      </p>
                      <p className="mt-1 truncate text-sm font-black text-white">{primaryAction.module.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">{primaryAction.reason}</p>
                    </div>
                    <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-slate-500 transition group-hover:translate-x-1 group-hover:text-emerald-300" />
                  </div>
                </button>
              ) : (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-sm text-emerald-100">
                  Tout le parcours est terminé. Lancez une révision libre pour consolider vos acquis.
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black text-white">
                    <Clock3 className="h-4 w-4 text-emerald-400" /> Séance de concentration
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Travaillez sans interruption sur l'action recommandée.
                  </p>
                </div>
                <span className="font-mono text-xl font-black tabular-nums text-emerald-300">
                  {formatTimer(remainingSeconds)}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {[15, 25, 45].map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => changeSessionDuration(minutes)}
                    className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition ${
                      sessionMinutes === minutes
                        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                        : "border-white/10 text-slate-500 hover:text-white"
                    }`}
                  >
                    {minutes} min
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setTimerRunning((running) => !running)}
                  className="ml-auto flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-[10px] font-black text-emerald-950"
                >
                  {timerRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {timerRunning ? "Pause" : "Démarrer"}
                </button>
              </div>
            </section>
          </div>
        )}

        {activeTab === "plan" && (
          <section className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-white">
                <ListChecks className="h-4 w-4 text-emerald-400" /> Plan recommandé
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Priorités calculées automatiquement à partir des modules non terminés et des QCM à renforcer.
              </p>
            </div>
            <div className="space-y-3">
              {plan.map((action, index) => (
                <button
                  key={action.module.id}
                  type="button"
                  onClick={() => openModule(action.module, action.module.type === "quiz")}
                  className="group flex w-full items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.06]"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                      action.priority === "urgent"
                        ? "bg-amber-400/15 text-amber-300"
                        : "bg-emerald-400/10 text-emerald-300"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-400">
                      {action.label} · {action.estimatedMinutes} min
                    </span>
                    <span className="mt-1 block truncate text-sm font-bold text-white">{action.module.title}</span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">{action.reason}</span>
                  </span>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-1 group-hover:text-emerald-300" />
                </button>
              ))}
              {plan.length === 0 && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
                  <p className="mt-3 text-sm font-black text-white">Plan entièrement terminé</p>
                  <p className="mt-1 text-xs text-slate-400">Votre parcours ne contient plus d'action en attente.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "exam" && (
          <section className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-white">
                <BarChart3 className="h-4 w-4 text-emerald-400" /> Simulateur d'examen
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Lancez un QCM en conditions d'examen. Une nouvelle tentative remplace uniquement l'affichage courant.
              </p>
            </div>
            <div className="space-y-3">
              {snapshot.quizModules.map((module) => {
                const score = parseModuleScore(module.score);
                return (
                  <div key={module.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{module.title}</p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {score === null ? "Aucune tentative enregistrée" : `Dernier niveau de maîtrise : ${score}%`}
                        </p>
                      </div>
                      {score !== null && (
                        <span
                          className={`rounded-lg px-2 py-1 text-[10px] font-black ${
                            score >= 70 ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"
                          }`}
                        >
                          {score}%
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => openModule(module, true)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-emerald-950 transition hover:bg-emerald-400"
                    >
                      {score === null ? <Play className="h-4 w-4" /> : <RefreshCcw className="h-4 w-4" />}
                      {score === null ? "Lancer l'examen blanc" : "Recommencer l'examen"}
                    </button>
                  </div>
                );
              })}
              {snapshot.quizModules.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center">
                  <BarChart3 className="mx-auto h-8 w-8 text-slate-600" />
                  <p className="mt-3 text-sm font-bold text-slate-300">Aucun QCM publié</p>
                  <p className="mt-1 text-xs text-slate-500">Les examens blancs apparaîtront ici après publication.</p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      <footer className="border-t border-white/10 px-5 py-3 text-center text-[10px] text-slate-500">
        Recommandations calculées localement à partir de votre progression — aucune réponse générée par IA.
      </footer>
    </aside>
  );
}
