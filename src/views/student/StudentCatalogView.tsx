import {
  BookOpen,
  CheckCircle,
  ChevronRight,
  Clock,
  Lock,
} from "lucide-react";
import { useRef } from "react";
import type { ReactNode } from "react";
import type { Course, Discipline, FacultyDomain } from "../../types";
import { formatCredits, formatMad } from "../../utils/morocco-locale";
import { useTvNavigation } from "../../hooks/useTvNavigation";

type NavigateTo = (view: string, targetCourse?: Course | null) => void;
type CourseIconRenderer = (iconName: string, colorClass?: string) => ReactNode;
type DomainIconRenderer = (iconName: string, colorClass?: string) => ReactNode;

interface StudentCatalogViewProps {
  domains: FacultyDomain[];
  selectedDomain: FacultyDomain | null;
  selectedDiscipline: Discipline | null;
  catalogCourses: Course[];
  enrolledCourses: number[];
  getCourseIcon: CourseIconRenderer;
  getDomainIcon: DomainIconRenderer;
  navigateTo: NavigateTo;
  setCourseToPurchase: (course: Course) => void;
  setSelectedDomainId: (id: number | null) => void;
  setSelectedDisciplineId: (id: number | null) => void;
  setSearchQuery: (query: string) => void;
}

export default function StudentCatalogView({
  domains,
  selectedDomain,
  selectedDiscipline,
  catalogCourses,
  enrolledCourses,
  getCourseIcon,
  getDomainIcon,
  navigateTo,
  setCourseToPurchase,
  setSelectedDomainId,
  setSelectedDisciplineId,
  setSearchQuery,
}: StudentCatalogViewProps) {
  const catalogGridRef = useRef<HTMLDivElement>(null);
  useTvNavigation(catalogGridRef, true);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="space-y-2">
        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full inline-block">
          Portail académique
        </span>
        <h1 className="text-3xl font-black text-slate-800">
          {selectedDiscipline ? selectedDiscipline.name : selectedDomain ? selectedDomain.name : "Domaines académiques"}
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
          Parcourez les domaines de recherche, choisissez une discipline, puis accédez aux modules publiés.
        </p>
      </div>

      {(selectedDomain || selectedDiscipline) && (
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            data-tv-focusable
            tabIndex={0}
            onClick={() => {
              setSelectedDomainId(null);
              setSelectedDisciplineId(null);
              setSearchQuery("");
            }}
            className="kbd-nav-focus touch-target px-4 py-1.5 rounded-full text-xs font-bold transition-all border bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          >
            Domaines
          </button>
          {selectedDomain && (
            <button
              onClick={() => {
                setSelectedDisciplineId(null);
                setSearchQuery("");
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                selectedDiscipline
                  ? "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  : "bg-indigo-600 text-white border-indigo-700 shadow-sm"
              }`}
            >
              {selectedDomain.name}
            </button>
          )}
          {selectedDiscipline && (
            <span className="px-4 py-1.5 rounded-full text-xs font-bold border bg-indigo-600 text-white border-indigo-700 shadow-sm">
              {selectedDiscipline.name}
            </span>
          )}
        </div>
      )}

      <div ref={catalogGridRef} data-tv-zone="catalog" className="space-y-6">
      {!selectedDomain && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pt-3">
          {domains.map((domain) => (
            <button
              key={domain.id}
              type="button"
              data-tv-focusable
              tabIndex={0}
              onClick={() => {
                setSelectedDomainId(domain.id);
                setSelectedDisciplineId(null);
                setSearchQuery("");
              }}
              className="kbd-nav-focus touch-target text-left bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all overflow-hidden group"
            >
              <div className={`h-2 bg-gradient-to-r ${domain.color}`}></div>
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-r ${domain.color} text-white flex items-center justify-center shadow-sm`}>
                    {getDomainIcon(domain.iconName, "w-6 h-6")}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
                    {domain.disciplines.length} disciplines
                  </span>
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base leading-tight">{domain.name}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mt-2">{domain.description}</p>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                    {domain.courseCount || 0} modules publiés
                  </span>
                  <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                    Explorer <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedDomain && !selectedDiscipline && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-3">
          {selectedDomain.disciplines.map((discipline) => (
            <button
              key={discipline.id}
              type="button"
              data-tv-focusable
              tabIndex={0}
              onClick={() => {
                setSelectedDisciplineId(discipline.id);
                setSearchQuery("");
              }}
              className="kbd-nav-focus touch-target text-left bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-800">{discipline.name}</h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-1">
                    {discipline.courseCount || 0} modules disponibles
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${selectedDomain.color} text-white flex items-center justify-center`}>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedDiscipline && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-3">
          {catalogCourses.length === 0 && (
            <div className="md:col-span-2 lg:col-span-3 bg-white rounded-2xl p-10 border border-slate-200 text-center">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-black text-slate-800 mt-3">Aucun module publié dans cette discipline</h3>
              <p className="text-xs text-slate-500 mt-1">Les professeurs peuvent créer un module dans cette discipline depuis l'espace de gestion des contenus.</p>
            </div>
          )}
          {catalogCourses.map((course) => {
            const isEnrolled = enrolledCourses.includes(course.id);
            return (
              <div
                key={course.id}
                className={`bg-white rounded-2xl border ${
                  isEnrolled ? "border-indigo-200 bg-indigo-50/10 shadow-sm" : "border-slate-200"
                } overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full`}
              >
                <div className="p-6 flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className={`p-3 rounded-xl ${course.color}`}>
                      {getCourseIcon(course.iconName, "w-6 h-6 text-slate-800")}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                        {course.level}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {formatCredits(course.credits)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-extrabold text-base text-slate-800 leading-tight">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Enseignant : {course.instructor}
                    </p>
                    <p className="text-[10px] text-indigo-600 font-black uppercase tracking-wide">
                      {course.discipline?.domain?.name} • {course.discipline?.name || course.category}
                    </p>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                    {course.description}
                  </p>

                  <div className="flex items-center gap-3.5 pt-2 text-xs text-slate-600 font-medium font-sans">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>{course.modules.length} chapitres</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 border-t border-slate-100 flex items-center justify-between">
                  {!isEnrolled ? (
                    <>
                      <div>
                        <span className="text-xs text-slate-500 block leading-none">
                          Abonnement mensuel
                        </span>
                        <span className="text-lg font-black text-indigo-700 font-mono">
                          {formatMad(course.price)}
                        </span>
                      </div>
                      <button
                        type="button"
                        data-tv-focusable
                        tabIndex={0}
                        onClick={() => setCourseToPurchase(course)}
                        className="kbd-nav-focus touch-target bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-1.5 cursor-pointer"
                        aria-label={`S'abonner au module ${course.title}`}
                      >
                        <Lock className="w-3.5 h-3.5" /> S'abonner
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 text-emerald-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs font-bold leading-none">Abonnement Actif</span>
                      </div>
                      <button
                        type="button"
                        data-tv-focusable
                        tabIndex={0}
                        onClick={() => navigateTo("course", course)}
                        className="kbd-nav-focus touch-target border border-indigo-200 text-indigo-700 hover:bg-indigo-50 bg-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                        aria-label={`Accéder au module ${course.title}`}
                      >
                        Accéder au module
                      </button>
                    </>
                  )}
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
