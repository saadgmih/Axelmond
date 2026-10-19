import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  Clock,
  Code2,
  Copy,
  FileText,
  GraduationCap,
  Pencil,
  Radio,
  Share2,
  ShieldCheck,
  Sparkles,
  Square,
  Video,
} from "lucide-react";
import type { Course } from "../../types";
import { liveControlUi } from "./live-control-theme";
import { findLiveCourse, resolveLiveCourseId } from "../../utils/live-course-selection";

export interface TeacherLiveControlViewProps {
  courses: Course[];
  liveCourseId: number;
  setLiveCourseId: (id: number) => void;
  setCourses: Dispatch<SetStateAction<Course[]>>;
  handleUpdateCourseLiveSubject: (courseId: number, subject: string) => void | Promise<void>;
  handleToggleCourseLive: (id: number) => Promise<Course | null>;
  toggleTeacherLiveSession: (
    courseId: number,
    toggleCourseLive: (id: number) => Promise<Course | null>,
  ) => Promise<{ ok: true; course: Course } | { ok: false; error: string }>;
  activeLiveCourse: Course | null;
}

const QUICK_SUBJECT_PRESETS = [
  "Séance d'exercices & QCM",
  "Correction approfondie TD",
  "Révision concours & Annales",
  "Démonstration théorique & Synthèse",
] as const;

function formatLiveDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function WebcamDecor() {
  return (
    <div className={liveControlUi.webcamWrap} aria-hidden="true">
      <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-slate-800 via-slate-950 to-black shadow-2xl shadow-black/60" />
      <div className="absolute left-1/2 top-[38%] h-10 w-10 -translate-x-1/2 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 ring-4 ring-slate-800" />
      <div className="absolute left-1/2 top-[38%] h-5 w-5 -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-900 to-teal-950 ring-2 ring-teal-500/30" />
      <div className="absolute bottom-4 left-1/2 h-2 w-12 -translate-x-1/2 rounded-full bg-slate-800" />
      <div className="absolute -right-1 bottom-8 h-8 w-3 rounded-full bg-slate-900" />
    </div>
  );
}

export default function TeacherLiveControlView({
  courses,
  liveCourseId,
  setLiveCourseId,
  setCourses,
  handleUpdateCourseLiveSubject,
  handleToggleCourseLive,
  toggleTeacherLiveSession,
  activeLiveCourse,
}: TeacherLiveControlViewProps) {
  const [liveActionError, setLiveActionError] = useState<string | null>(null);
  const [isLiveActionPending, setIsLiveActionPending] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [liveElapsedSeconds, setLiveElapsedSeconds] = useState(0);

  const resolvedLiveCourseId = resolveLiveCourseId(courses, liveCourseId);
  const selectedCourse = findLiveCourse(courses, liveCourseId);
  const isLive = Boolean(selectedCourse?.isLiveNow);
  const isRoomOpen = activeLiveCourse?.id === resolvedLiveCourseId;

  useEffect(() => {
    if (resolvedLiveCourseId !== liveCourseId) {
      setLiveCourseId(resolvedLiveCourseId);
    }
  }, [resolvedLiveCourseId, liveCourseId, setLiveCourseId]);

  useEffect(() => {
    if (!isLive || !selectedCourse?.liveStartedAt) {
      setLiveElapsedSeconds(0);
      return;
    }
    const startMs = Date.parse(selectedCourse.liveStartedAt);
    if (!Number.isFinite(startMs)) return;

    const tick = () => {
      setLiveElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isLive, selectedCourse?.liveStartedAt]);

  const liveShareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/student/course?courseId=${resolvedLiveCourseId}&live=true`
      : `https://perfacademy.ma/student/course?courseId=${resolvedLiveCourseId}&live=true`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(liveShareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback si clipboard API non disponible
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleLiveAction = async () => {
    setLiveActionError(null);
    setIsLiveActionPending(true);
    try {
      const result = await toggleTeacherLiveSession(resolvedLiveCourseId, handleToggleCourseLive);
      if (result.ok === false) {
        setLiveActionError(result.error);
      }
    } catch (err) {
      setLiveActionError(err instanceof Error ? err.message : "Action live impossible pour le moment.");
    } finally {
      setIsLiveActionPending(false);
    }
  };

  return (
    <div className={liveControlUi.page}>
      <div className={liveControlUi.shell}>
        <div className={liveControlUi.shellGlow} />
        <div className={liveControlUi.shellBorder} />

        <header className={liveControlUi.hero}>
          <div className="flex items-start gap-4">
            <div className={liveControlUi.heroIcon}>
              <Video className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className={liveControlUi.heroTitle}>Console de visioconférence Performance Académique</h1>
              <p className={liveControlUi.heroSubtitle}>
                Configurez et pilotez vos sessions de visioconférence académique
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  LiveKit WebRTC HD
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-medium text-slate-300">
                  Tableau blanc collaboratif
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-medium text-slate-300">
                  Sondages QCM en direct
                </span>
              </div>
            </div>
          </div>
          <WebcamDecor />
        </header>

        <div className="relative z-10 mt-6 space-y-4">
          <section className={liveControlUi.section}>
            <div className={liveControlUi.sectionHead}>
              <div className={liveControlUi.sectionIconPink}>
                <GraduationCap className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h2 className={liveControlUi.sectionTitle}>Module académique en direct</h2>
                <p className={liveControlUi.sectionDesc}>Sélectionnez le module pour votre visioconférence</p>
              </div>
            </div>
            <div className={liveControlUi.fieldWrap}>
              <Code2 className={liveControlUi.fieldIcon} />
              <select
                value={resolvedLiveCourseId || ""}
                onChange={(e) => setLiveCourseId(parseInt(e.target.value, 10))}
                className={liveControlUi.select}
                aria-label="Module académique en direct"
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              <ChevronDown className={liveControlUi.selectChevron} />
            </div>
          </section>

          <section className={liveControlUi.section}>
            <div className={liveControlUi.sectionHead}>
              <div className={liveControlUi.sectionIconPink}>
                <Pencil className="h-5 w-5 text-teal-400" />
              </div>
              <div>
                <h2 className={liveControlUi.sectionTitle}>Sujet de révision actif</h2>
                <p className={liveControlUi.sectionDesc}>Définissez le sujet qui sera synchronisé avec les étudiants</p>
              </div>
            </div>
            <div className={liveControlUi.fieldWrap}>
              <FileText className={liveControlUi.fieldIcon} />
              <input
                type="text"
                placeholder="ex: Rotation d'arbres AVL & complexités algorithmiques"
                value={selectedCourse?.liveSubject || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setCourses((prev) =>
                    prev.map((course) =>
                      course.id === resolvedLiveCourseId ? { ...course, liveSubject: value } : course,
                    ),
                  );
                }}
                onBlur={(e) => handleUpdateCourseLiveSubject(resolvedLiveCourseId, e.target.value)}
                className={liveControlUi.input}
                aria-label="Sujet de révision actif"
              />
            </div>

            {/* Suggestions rapides didactiques */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Suggestions :</span>
              {QUICK_SUBJECT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setCourses((prev) =>
                      prev.map((course) =>
                        course.id === resolvedLiveCourseId ? { ...course, liveSubject: preset } : course,
                      ),
                    );
                    void handleUpdateCourseLiveSubject(resolvedLiveCourseId, preset);
                  }}
                  className="rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-slate-400 transition hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
                >
                  + {preset}
                </button>
              ))}
            </div>

            <p className={liveControlUi.syncNote}>
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-teal-400" />
              Ce message se synchronise instantanément sur l&apos;écran des étudiants inscrits.
            </p>
          </section>

          {/* Lien d'accès direct étudiant */}
          <section className={liveControlUi.section}>
            <div className={liveControlUi.sectionHead}>
              <div className={liveControlUi.sectionIconPink}>
                <Share2 className="h-5 w-5 text-teal-400" />
              </div>
              <div>
                <h2 className={liveControlUi.sectionTitle}>Lien d'accès direct étudiant</h2>
                <p className={liveControlUi.sectionDesc}>Partagez ce lien direct avec vos étudiants inscrits pour qu'ils rejoignent la classe en 1 clic</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex-1 truncate rounded-xl border border-white/[0.08] bg-[#031512] px-3.5 py-2.5 font-mono text-xs text-slate-300 select-all">
                {liveShareUrl}
              </div>
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20 active:scale-95"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Lien copié ! ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copier le lien d'accès</span>
                  </>
                )}
              </button>
            </div>
          </section>

          <section className={liveControlUi.broadcastCard}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className={liveControlUi.sectionHead}>
                <div className={liveControlUi.sectionIconGreen}>
                  <Radio className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className={liveControlUi.sectionTitle}>État de la diffusion en direct</h2>
                  <p className={liveControlUi.sectionDesc}>
                    {isLive ? "Diffusion en cours pour ce module" : "Aucune diffusion en cours pour ce module"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isLive && liveElapsedSeconds > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/40 px-3 py-1 font-mono text-[11px] font-bold text-emerald-300">
                    <Clock className="h-3.5 w-3.5 text-emerald-400" />
                    {formatLiveDuration(liveElapsedSeconds)}
                  </span>
                )}
                {isLive ? (
                  <span className={liveControlUi.liveBadge}>
                    <span className={liveControlUi.liveDot}>
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    En direct
                  </span>
                ) : (
                  <span className={liveControlUi.offlineBadge}>Hors ligne</span>
                )}
              </div>
            </div>

            <div className={`${liveControlUi.actions} mt-5 border-t border-white/[0.06] pt-5`}>
              {liveActionError && (
                <p className="w-full rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-200">
                  {liveActionError}
                </p>
              )}
              <button
                type="button"
                disabled={!selectedCourse || isLiveActionPending}
                onClick={() => void handleLiveAction()}
                className={`${isLive && isRoomOpen ? liveControlUi.stopBtn : liveControlUi.startBtn} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {!isLive ? (
                  <>
                    <Radio className="h-3.5 w-3.5" />
                    {isLiveActionPending ? "Lancement en cours..." : "Lancer la session live"}
                  </>
                ) : isRoomOpen ? (
                  <>
                    <Square className="h-3.5 w-3.5 fill-current" />
                    Éteindre le live
                  </>
                ) : (
                  <>
                    <Radio className="h-3.5 w-3.5" />
                    Rejoindre la session live
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      </div>

      {isRoomOpen && activeLiveCourse && <div id="live-room-portal-target" className={liveControlUi.roomShell} />}
    </div>
  );
}
