import {
  Activity,
  Award,
  ChevronRight,
  Clock,
  Cpu,
  Layers,
  Radio,
  ShoppingCart,
  Video,
} from "lucide-react";
import type { ReactNode } from "react";
import type { AppUser } from "../../components/AuthScreen";
import type { Course } from "../../types";

type NavigateTo = (view: string, targetCourse?: Course | null) => void;
type StudentChartTab = "hours" | "skills";
type CourseIconRenderer = (iconName: string, colorClass?: string) => ReactNode;

interface StudentDashboardViewProps {
  currentUser: AppUser | null;
  navigateTo: NavigateTo;
  studentChartTab: StudentChartTab;
  setStudentChartTab: (tab: StudentChartTab) => void;
  enrolledCourses: number[];
  courses: Course[];
  getCourseIcon: CourseIconRenderer;
}

export default function StudentDashboardView({
  currentUser,
  navigateTo,
  studentChartTab,
  setStudentChartTab,
  enrolledCourses,
  courses,
  getCourseIcon,
}: StudentDashboardViewProps) {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg border border-indigo-950">
        <div className="absolute right-0 top-0 w-1/3 h-full opacity-10 pointer-events-none">
          <Cpu className="w-full h-full text-white" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block">
            Espace Étudiant Actif
          </span>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
            Bonjour, {currentUser ? currentUser.fullName.split(" ")[0] : "Étudiant"}.
          </h1>
          <p className="text-indigo-200 text-sm md:text-base leading-relaxed">
            Vous êtes inscrit en <strong>{currentUser ? currentUser.levelOrTitle : "Licence 3 d'Informatique"}</strong> d'Axelmond Research Labs. Poursuivez vos modules interactifs de programmation, SQL, architecture d'OS, ou conversez avec votre tuteur IA.
          </p>

          <div className="pt-2 flex flex-wrap gap-4">
            <button
              onClick={() => navigateTo("catalog")}
              className="bg-white text-indigo-900 hover:bg-slate-100 px-5 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm"
            >
              Parcourir le catalogue
            </button>
            <button
              onClick={() => navigateTo("profile")}
              className="bg-indigo-600/50 hover:bg-indigo-600/70 text-white border border-indigo-500/30 px-5 py-2.5 rounded-xl font-bold text-xs transition-colors"
            >
              Consulter mes notes académiques
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              Mon Suivi de Performance Académique
            </h3>
            <p className="text-xs text-slate-400">Progression individuelle et validation des compétences d'ingénierie Logicielle</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 max-w-fit">
            <button
              onClick={() => setStudentChartTab("hours")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                studentChartTab === "hours"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Clock className="w-3.5 h-3.5 inline mr-1" />
              Heures d'Étude
            </button>
            <button
              onClick={() => setStudentChartTab("skills")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                studentChartTab === "skills"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Award className="w-3.5 h-3.5 inline mr-1" />
              Compétences
            </button>
          </div>
        </div>

        {studentChartTab === "hours" ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] font-mono font-bold text-slate-400 pb-6">
                <span>40h</span>
                <span>25h</span>
                <span>10h</span>
                <span>0h</span>
              </div>

              <div className="pl-14 h-48 w-full relative">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                  <div className="border-b border-dashed border-slate-100 w-full h-0"></div>
                  <div className="border-b border-dashed border-slate-100 w-full h-0"></div>
                  <div className="border-b border-dashed border-slate-100 w-full h-0"></div>
                  <div className="border-b border-dashed border-slate-200 w-full h-0"></div>
                </div>

                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 130" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="studentProgressGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 110 L 80 90 L 160 55 L 240 65 L 320 20 L 400 35 L 480 15 L 480 130 L 0 130 Z"
                    fill="url(#studentProgressGrad)"
                  />
                  <path
                    d="M 0 110 L 80 90 L 160 55 L 240 65 L 320 20 L 400 35 L 480 15"
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="0" cy="110" r="4.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="80" cy="90" r="4.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="160" cy="55" r="4.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="240" cy="65" r="4.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="320" cy="20" r="4.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="400" cy="35" r="4.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="480" cy="15" r="5.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                </svg>
              </div>

              <div className="pl-14 flex justify-between text-[11px] font-bold text-slate-400 uppercase pt-2 font-sans font-extrabold">
                <span>Semaine 1</span>
                <span>Semaine 2</span>
                <span>Semaine 3</span>
                <span>Semaine 4</span>
                <span>Semaine 5</span>
                <span>Semaine 6</span>
                <span>Semaine 7</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Modules inscrits</span>
                <p className="text-sm font-bold text-slate-800 mt-1">{enrolledCourses.length} module{enrolledCourses.length !== 1 ? "s" : ""} actif{enrolledCourses.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Chapitres complétés</span>
                <p className="text-sm font-bold text-indigo-700 mt-1">
                  {courses.filter((c) => enrolledCourses.includes(c.id)).reduce((sum, c) => sum + c.modules.filter((m) => m.completed).length, 0)} chapitres validés
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Crédits accumulables</span>
                <p className="text-sm font-bold text-emerald-700 mt-1">
                  {enrolledCourses.reduce((sum, id) => {
                    const found = courses.find((c) => c.id === id);
                    return sum + (found ? found.credits : 0);
                  }, 0)} ECTS visés
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-200">
            <span className="text-xs font-semibold text-slate-500 block mb-1">
              Visualisation de l'acquisition par pile technologique et compétences :
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-slate-100 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">Algorithmes & Structures complexes</span>
                  <span className="text-xs font-bold text-indigo-600">85% acquis</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-600 transition-all duration-1000" style={{ width: "85%" }}></div>
                </div>
              </div>

              <div className="p-4 border border-slate-100 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">Conception de Bases de Données (SQL)</span>
                  <span className="text-xs font-bold text-indigo-600">92% acquis</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-600 transition-all duration-1000" style={{ width: "92%" }}></div>
                </div>
              </div>

              <div className="p-4 border border-slate-100 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">Architecture des Systèmes d'Exploitation (Unix)</span>
                  <span className="text-xs font-bold text-indigo-600">70% acquis</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-600 transition-all duration-1000" style={{ width: "70%" }}></div>
                </div>
              </div>

              <div className="p-4 border border-slate-100 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">Protocoles Réseaux & Sécurité Internet</span>
                  <span className="text-xs font-bold text-indigo-600">95% acquis</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-600 transition-all duration-1000" style={{ width: "95%" }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {courses.filter((c) => enrolledCourses.includes(c.id) && c.isLiveNow).length > 0 && (
        <div className="bg-red-50/70 border border-red-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 relative flex-shrink-0 border border-red-200">
                <Radio className="w-6 h-6 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider bg-red-100 px-2 py-0.5 rounded-md border border-red-200">
                  SÉMINAIRE INTERACTIF EN DIRECT
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-1">
                  {courses.find((c) => c.isLiveNow)?.instructor || "Votre enseignant"} anime une session en direct !
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {courses.find((c) => c.isLiveNow && enrolledCourses.includes(c.id))?.liveSubject
                    ? `Sujet : ${courses.find((c) => c.isLiveNow && enrolledCourses.includes(c.id))!.liveSubject}`
                    : "Rejoignez la salle de classe pour suivre la session en direct."}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const activeCourse = courses.find((c) => c.isLiveNow && enrolledCourses.includes(c.id));
                if (activeCourse) navigateTo("live", activeCourse);
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md shadow-red-100 flex items-center gap-2"
            >
              <Video className="w-4 h-4" /> Rejoindre la salle de classe
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Mes Modules d'Étude Actifs ({enrolledCourses.length})
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            Vos modules en accès
          </span>
        </div>

        {courses.filter((c) => enrolledCourses.includes(c.id)).length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-4 shadow-sm">
            <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800 font-sans">Aucun module actif</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Abonnez-vous aux modules de votre choix à prix abordable dans notre catalogue de formation.
            </p>
            <button
              onClick={() => navigateTo("catalog")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md cursor-pointer"
            >
              Découvrir le catalogue d'Axelmond Research Labs
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses
              .filter((c) => enrolledCourses.includes(c.id))
              .map((course) => {
                const completedChapters = course.modules.filter((m) => m.completed).length;
                const totalChapters = course.modules.length;

                return (
                  <div
                    key={course.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden"
                  >
                    <div className="p-6 flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className={`p-3 rounded-xl ${course.color} text-slate-800`}>
                          {getCourseIcon(course.iconName, "w-6 h-6 text-slate-800")}
                        </div>
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full border border-slate-200">
                          {course.level}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-extrabold text-base text-slate-800 leading-tight truncate">
                          {course.title}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">
                          Par {course.instructor}
                        </p>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>

                      <div className="pt-2 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-semibold">
                            {completedChapters} / {totalChapters} chapitres
                          </span>
                          <span className="text-indigo-600 font-bold font-mono">
                            {course.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              course.progress === 100 ? "bg-emerald-500" : "bg-indigo-600"
                            }`}
                            style={{ width: `${course.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">
                        {course.credits} Crédits ECTS
                      </span>
                      <button
                        onClick={() => navigateTo("course", course)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                      >
                        Étudier le syllabus <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
