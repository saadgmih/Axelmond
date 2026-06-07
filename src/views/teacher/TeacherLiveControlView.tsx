import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  ChevronDown,
  Code2,
  FileText,
  GraduationCap,
  Pencil,
  Radio,
  Sparkles,
  Square,
  Video,
} from "lucide-react";
import type { Course } from "../../types";
import { liveControlUi } from "./live-control-theme";

export interface TeacherLiveControlViewProps {
  courses: Course[];
  liveCourseId: number;
  setLiveCourseId: (id: number) => void;
  setCourses: Dispatch<SetStateAction<Course[]>>;
  handleUpdateCourseLiveSubject: (courseId: number, subject: string) => void | Promise<void>;
  handleToggleCourseLive: (id: number) => Promise<Course | null>;
  toggleTeacherLiveSession: (courseId: number, toggleCourseLive: (id: number) => Promise<Course | null>) => void | Promise<void>;
  activeLiveCourse: Course | null;
  renderTeacherLiveRoom: () => ReactNode;
}

function WebcamDecor() {
  return (
    <div className={liveControlUi.webcamWrap} aria-hidden="true">
      <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-slate-800 via-slate-950 to-black shadow-2xl shadow-black/60" />
      <div className="absolute left-1/2 top-[38%] h-10 w-10 -translate-x-1/2 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 ring-4 ring-slate-800" />
      <div className="absolute left-1/2 top-[38%] h-5 w-5 -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-900 to-violet-950 ring-2 ring-violet-500/30" />
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
  renderTeacherLiveRoom,
}: TeacherLiveControlViewProps) {
  const selectedCourse = courses.find((course) => course.id === liveCourseId);
  const isLive = Boolean(selectedCourse?.isLiveNow);
  const isRoomOpen = activeLiveCourse?.id === liveCourseId;

  if (isRoomOpen && activeLiveCourse) {
    return (
      <div className="w-full animate-in fade-in duration-200">
        {renderTeacherLiveRoom()}
      </div>
    );
  }

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
              <h1 className={liveControlUi.heroTitle}>Console de visioconférence Axelmond Research Labs</h1>
              <p className={liveControlUi.heroSubtitle}>
                Configurez et pilotez vos sessions de visioconférence académique
              </p>
            </div>
          </div>
          <WebcamDecor />
        </header>

        <div className="relative z-10 mt-6 space-y-4">
          <section className={liveControlUi.section}>
            <div className={liveControlUi.sectionHead}>
              <div className={liveControlUi.sectionIconPink}>
                <GraduationCap className="h-5 w-5 text-pink-400" />
              </div>
              <div>
                <h2 className={liveControlUi.sectionTitle}>Module académique en direct</h2>
                <p className={liveControlUi.sectionDesc}>Sélectionnez le module pour votre visioconférence</p>
              </div>
            </div>
            <div className={liveControlUi.fieldWrap}>
              <Code2 className={liveControlUi.fieldIcon} />
              <select
                value={liveCourseId}
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
                <Pencil className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h2 className={liveControlUi.sectionTitle}>Sujet de révision actif</h2>
                <p className={liveControlUi.sectionDesc}>
                  Définissez le sujet qui sera synchronisé avec les étudiants
                </p>
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
                    prev.map((course) => (course.id === liveCourseId ? { ...course, liveSubject: value } : course)),
                  );
                }}
                onBlur={(e) => handleUpdateCourseLiveSubject(liveCourseId, e.target.value)}
                className={liveControlUi.input}
                aria-label="Sujet de révision actif"
              />
            </div>
            <p className={liveControlUi.syncNote}>
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-400" />
              Ce message se synchronise instantanément sur l&apos;écran des étudiants inscrits.
            </p>
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
                    {isLive ? "Transmission active sur le flux WebRTC" : "Aucune diffusion en cours pour ce module"}
                  </p>
                </div>
              </div>

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

            <div className={`${liveControlUi.actions} mt-5 border-t border-white/[0.06] pt-5`}>
              <button
                type="button"
                onClick={() => toggleTeacherLiveSession(liveCourseId, handleToggleCourseLive)}
                className={isLive && isRoomOpen ? liveControlUi.stopBtn : liveControlUi.startBtn}
              >
                {!isLive ? (
                  <>
                    <Radio className="h-3.5 w-3.5" />
                    Lancer la session live
                  </>
                ) : isRoomOpen ? (
                  <>
                    <Square className="h-3.5 w-3.5 fill-current" />
                    Éteindre le signal
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
    </div>
  );
}
