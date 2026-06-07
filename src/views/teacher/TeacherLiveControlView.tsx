import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { Course } from "../../types";

export interface TeacherLiveControlViewProps {
  courses: Course[];
  liveCourseId: number;
  setLiveCourseId: (id: number) => void;
  setCourses: Dispatch<SetStateAction<Course[]>>;
  handleUpdateCourseLiveSubject: (courseId: number, subject: string) => void | Promise<void>;
  handleToggleCourseLive: (id: number) => void | Promise<void>;
  joinTeacherLiveRoom: () => void | Promise<void>;
  activeLiveCourse: Course | null;
  renderTeacherLiveRoom: () => ReactNode;
}

export default function TeacherLiveControlView({
  courses,
  liveCourseId,
  setLiveCourseId,
  setCourses,
  handleUpdateCourseLiveSubject,
  handleToggleCourseLive,
  joinTeacherLiveRoom,
  activeLiveCourse,
  renderTeacherLiveRoom,
}: TeacherLiveControlViewProps) {
  const selectedCourse = courses.find((course) => course.id === liveCourseId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 animate-in duration-200">
      <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl space-y-6 shadow-sm">
        <div>
          <h3 className="text-xl font-black text-slate-800">Console de visioconférence Axelmond Research Labs</h3>
          <p className="text-xs text-slate-400">Configurez et pilotez vos sessions de visioconférence académique</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase">Module Académique en Direct</label>
            <select
              value={liveCourseId}
              onChange={(e) => setLiveCourseId(parseInt(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase">Sujet de Révision Actif</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="ex: Résolution par pivot de Gauss..."
                value={selectedCourse?.liveSubject || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setCourses((prev) =>
                    prev.map((course) => (course.id === liveCourseId ? { ...course, liveSubject: value } : course)),
                  );
                }}
                onBlur={(e) => handleUpdateCourseLiveSubject(liveCourseId, e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <p className="text-[10px] text-slate-400">Ce message se synchronise instantanément sur l'écran des étudiants inscrits.</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-800">État de la Diffusion en Direct</p>
              <p className="text-[11px] text-slate-400">
                {selectedCourse?.isLiveNow ? "Transmission active sur le flux WebRTC" : "Hors ligne"}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => handleToggleCourseLive(liveCourseId)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-colors cursor-pointer ${
                  selectedCourse?.isLiveNow
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-pink-600 hover:bg-pink-700 text-white"
                }`}
              >
                {selectedCourse?.isLiveNow ? "Éteindre le signal" : "Lancer la session live"}
              </button>
              <button
                onClick={joinTeacherLiveRoom}
                className="px-5 py-2.5 rounded-xl text-xs font-black transition-colors cursor-pointer bg-slate-900 text-white hover:bg-slate-800"
              >
                {activeLiveCourse?.id === liveCourseId ? "Salle LiveKit ouverte" : "Entrer dans la salle"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeLiveCourse && (
        <div className="h-[min(100dvh,960px)] min-h-[420px] w-full overflow-hidden rounded-none lg:rounded-2xl border-y lg:border border-slate-800">
          {renderTeacherLiveRoom()}
        </div>
      )}
    </div>
  );
}
