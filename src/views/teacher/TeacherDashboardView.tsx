import type { FormEvent } from "react";
import {
  Activity,
  BarChart,
  BookOpen,
  Database,
  DollarSign,
  GraduationCap,
  Mail,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import type { AppUser } from "../../components/AuthScreen";
import type { Course, CourseGrade } from "../../types";

type TeacherChartTab = "revenue" | "engagement";

interface TeacherDashboardViewProps {
  currentUser: AppUser;
  emailDeliverySummary: any | null;
  formatEmailLogDate: (value?: string) => string;
  emailDeliveryStatusMsg: string;
  handleSendTestEmail: (e: FormEvent) => void | Promise<void>;
  testEmailTo: string;
  setTestEmailTo: (value: string) => void;
  isSendingTestEmail: boolean;
  testEmailStatusMsg: string;
  teacherChartTab: TeacherChartTab;
  setTeacherChartTab: (tab: TeacherChartTab) => void;
  managedCourses: Course[];
  courses: Course[];
  handleUpdateCoursePrice: (id: number, newPrice: number) => void | Promise<void>;
  handleToggleCourseLive: (id: number) => void | Promise<void>;
  gradesCourseId: number;
  setGradesCourseId: (id: number) => void;
  selectedGradesCourse: Course | null;
  gradesStatusMsg: string;
  courseGrades: CourseGrade[];
  getInitials: (name: string) => string;
  getGradeBadgeClass: (score: number | null) => string;
}

export default function TeacherDashboardView({
  currentUser,
  emailDeliverySummary,
  formatEmailLogDate,
  emailDeliveryStatusMsg,
  handleSendTestEmail,
  testEmailTo,
  setTestEmailTo,
  isSendingTestEmail,
  testEmailStatusMsg,
  teacherChartTab,
  setTeacherChartTab,
  managedCourses,
  courses,
  handleUpdateCoursePrice,
  handleToggleCourseLive,
  gradesCourseId,
  setGradesCourseId,
  selectedGradesCourse,
  gradesStatusMsg,
  courseGrades,
  getInitials,
  getGradeBadgeClass,
}: TeacherDashboardViewProps) {
  return (
    <div className="space-y-8">
                  {/* Header Welcome Card */}
                  <div className="bg-gradient-to-r from-pink-900 via-purple-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg border border-pink-950">
                    <div className="absolute right-0 top-0 w-1/3 h-full opacity-10 pointer-events-none">
                      <GraduationCap className="w-full h-full text-white" />
                    </div>
                    <div className="relative z-10 max-w-2xl space-y-3">
                      <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block">
                        Espace Enseignant
                      </span>
                      <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
                        Ravi de vous revoir, {currentUser.fullName.split(" ")[0]}.
                      </h1>
                      <p className="text-pink-100 text-sm md:text-base leading-relaxed">
                      Gérez le cursus académique, ajustez les informations tarifaires, ajoutez des modules ou des examens d'évaluation et suivez la progression en temps réel de votre promotion d'étudiants.
                      </p>
                    </div>
                  </div>

                  {currentUser.role === "ADMIN" && (
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-5">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100">
                        <div>
                          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <Mail className="w-5 h-5 text-pink-600" />
                            Diagnostic SMTP Hostinger
                          </h3>
                          <p className="text-xs text-slate-400">Contrôlez la délivrabilité depuis verification@axelmond.com</p>
                        </div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-pink-700 bg-pink-50 border border-pink-100 px-3 py-1 rounded-full">
                          Administrateur
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 border-y border-slate-100 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        <div className="py-4 md:px-4 first:md:pl-0 space-y-1">
                          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">SMTP</p>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${emailDeliverySummary?.smtpConfigured ? "bg-emerald-500" : "bg-red-500"}`}></span>
                            <p className={`text-sm font-black ${emailDeliverySummary?.smtpConfigured ? "text-emerald-700" : "text-red-700"}`}>
                              {emailDeliverySummary?.smtpConfigured ? "Configuré" : "Non configuré"}
                            </p>
                          </div>
                        </div>
                        <div className="py-4 md:px-4 space-y-1">
                          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Dernier e-mail</p>
                          <p className="text-sm font-black text-slate-800">
                            {formatEmailLogDate(emailDeliverySummary?.lastEmailSent?.createdAt)}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-400 truncate">
                            {emailDeliverySummary?.lastEmailSent?.response || "Aucun message enregistré"}
                          </p>
                        </div>
                        <div className="py-4 md:px-4 space-y-1">
                          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Envoyés aujourd'hui</p>
                          <p className="text-2xl font-black text-slate-900">{emailDeliverySummary?.emailsSentToday ?? 0}</p>
                        </div>
                        <div className="py-4 md:px-4 last:md:pr-0 space-y-1">
                          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Dernière erreur</p>
                          <p className={`text-sm font-black ${emailDeliverySummary?.lastSmtpError ? "text-red-700" : "text-emerald-700"}`}>
                            {emailDeliverySummary?.lastSmtpError ? emailDeliverySummary.lastSmtpError.providerStatus : "Aucune erreur"}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-400 truncate">
                            {emailDeliverySummary?.lastSmtpError?.response || "Aucun reject/deferred/bounce enregistré"}
                          </p>
                        </div>
                      </div>

                      {emailDeliveryStatusMsg && (
                        <p className="text-xs font-semibold text-red-500">{emailDeliveryStatusMsg}</p>
                      )}

                      <form onSubmit={handleSendTestEmail} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                        <input
                          type="email"
                          required
                          placeholder="adresse.personnelle@example.com"
                          value={testEmailTo}
                          onChange={(e) => setTestEmailTo(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                        <button
                          type="submit"
                          disabled={isSendingTestEmail}
                          className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-3 px-6 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                        >
                          {isSendingTestEmail ? "Envoi..." : "Envoyer le diagnostic"}
                        </button>
                      </form>

                      {testEmailStatusMsg && (
                        <p className="text-xs font-semibold text-slate-500">{testEmailStatusMsg}</p>
                      )}
                    </div>
                  )}

                  {/* DIAGNOSTIC ANALYTICS PANEL FOR TEACHER */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                          <BarChart className="w-5 h-5 text-pink-600" />
                          Tableau de Bord & Indicateurs de Performance
                        </h3>
                        <p className="text-xs text-slate-400">Analyses visuelles d'activité de la chaire pour l'année universitaire 2026</p>
                      </div>
                      <div className="flex bg-slate-100 p-1 rounded-xl gap-1 max-w-fit">
                        <button
                          onClick={() => setTeacherChartTab("revenue")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            teacherChartTab === "revenue"
                              ? "bg-white text-pink-700 shadow-sm"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
                          Inscriptions (€)
                        </button>
                        <button
                          onClick={() => setTeacherChartTab("engagement")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            teacherChartTab === "engagement"
                              ? "bg-white text-purple-700 shadow-sm"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <Activity className="w-3.5 h-3.5 inline mr-1" />
                          Engagement (%)
                        </button>
                      </div>
                    </div>

                    {teacherChartTab === "revenue" ? (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        {/* High fidelity SVG line chart for Revenue */}
                        <div className="relative">
                          {/* Y-axis metrics */}
                          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] font-mono font-bold text-slate-400 pb-6">
                            <span>2500€</span>
                            <span>1500€</span>
                            <span>500€</span>
                            <span>0€</span>
                          </div>
                          
                          {/* Visual Grid and Graph line */}
                          <div className="pl-14 h-48 w-full relative">
                            {/* Horizontal guide lines */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                              <div className="border-b border-dashed border-slate-100 w-full h-0"></div>
                              <div className="border-b border-dashed border-slate-100 w-full h-0"></div>
                              <div className="border-b border-dashed border-slate-100 w-full h-0"></div>
                              <div className="border-b border-dashed border-slate-200 w-full h-0"></div>
                            </div>

                            {/* Actual SVG line */}
                            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 130" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#ec4899" stopOpacity="0.25" />
                                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
                                </linearGradient>
                              </defs>
                              {/* Grid Area Path */}
                              <path 
                                d="M 0 100 Q 100 80 150 50 T 300 30 T 450 15 L 450 130 L 0 130 Z" 
                                fill="url(#revenueGrad)"
                              />
                              {/* Stroke line */}
                              <path 
                                d="M 0 100 Q 100 80 150 50 T 300 30 T 450 15" 
                                fill="none" 
                                stroke="#db2777" 
                                strokeWidth="3.5" 
                                strokeLinecap="round"
                              />
                              {/* Dots for metrics */}
                              <circle cx="0" cy="100" r="5" fill="#db2777" stroke="#ffffff" strokeWidth="2" />
                              <circle cx="125" cy="65" r="5" fill="#db2777" stroke="#ffffff" strokeWidth="2" />
                              <circle cx="250" cy="40" r="5" fill="#db2777" stroke="#ffffff" strokeWidth="2" />
                              <circle cx="375" cy="22" r="5" fill="#db2777" stroke="#ffffff" strokeWidth="2" />
                              <circle cx="450" cy="15" r="6" fill="#db2777" stroke="#ffffff" strokeWidth="2" />
                            </svg>
                          </div>
                          
                          {/* X-axis labels */}
                          <div className="pl-14 flex justify-between text-[11px] font-bold text-slate-400 uppercase pt-2 font-sans font-extrabold">
                            <span>Janvier</span>
                            <span>Février</span>
                            <span>Mars</span>
                            <span>Avril</span>
                            <span>Mai (Courant)</span>
                          </div>
                        </div>

                        {/* Chart feedback detail overlay */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
                          <div className="p-3 bg-slate-50 rounded-xl">
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Modules publiés</span>
                            <p className="text-sm font-bold text-slate-800 mt-1">{managedCourses.filter(c => c.published).length} matière{managedCourses.filter(c => c.published).length !== 1 ? 's' : ''} active{managedCourses.filter(c => c.published).length !== 1 ? 's' : ''}</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl">
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Chapitres au total</span>
                            <p className="text-sm font-bold text-slate-800 mt-1">{managedCourses.reduce((sum, c) => sum + c.modules.length, 0)} chapitres</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl">
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Paiements validés</span>
                            <p className="text-sm font-bold text-emerald-700 mt-1">{managedCourses.filter(c => c.price > 0 && c.published).length} modules payants publiés</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        {/* High fidelity SVG bar chart for Student engagement */}
                        <div className="relative">
                          {/* Y-axis metrics */}
                          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] font-mono font-bold text-slate-400 pb-6">
                            <span>100%</span>
                            <span>60%</span>
                            <span>30%</span>
                            <span>0%</span>
                          </div>

                          <div className="pl-14 h-48 w-full relative flex items-end justify-around pb-6 pt-4">
                            {/* Horizontal guide lines */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                              <div className="border-b border-dashed border-slate-100 w-full h-0"></div>
                              <div className="border-b border-dashed border-slate-100 w-full h-0"></div>
                              <div className="border-b border-dashed border-slate-100 w-full h-0"></div>
                              <div className="border-b border-dashed border-slate-200 w-full h-0"></div>
                            </div>

                            {/* Course stats bars */}
                            {courses.map((c, idx) => {
                              const engagements = [92, 86, 74, 98];
                              const rate = engagements[idx % engagements.length];
                              return (
                                <div key={c.id} className="flex flex-col items-center gap-1 w-1/5 group relative z-10">
                                  {/* Tooltip on hover */}
                                  <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg pointer-events-none whitespace-nowrap shadow-md">
                                    {rate}% Engagement
                                  </div>
                                  <div className="w-12 bg-slate-100 rounded-lg h-32 flex items-end overflow-hidden border border-slate-100">
                                    <div 
                                      className={`w-full rounded-b-md bg-gradient-to-t ${
                                        idx % 2 === 0 ? "from-purple-600 to-indigo-500" : "from-pink-600 to-rose-500"
                                      } transition-all duration-1000`} 
                                      style={{ height: `${rate}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-[10px] font-black text-slate-700 truncate w-full text-center mt-1">
                                    {c.title.split(" ")[0]}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Chart feedback detailed metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
                          <div className="p-3 bg-slate-50 rounded-xl">
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Modules actifs</span>
                            <p className="text-sm font-bold text-slate-800 mt-1">{managedCourses.filter(c => c.published).length} modules publiés</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl">
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Quiz disponibles</span>
                            <p className="text-sm font-bold text-purple-700 mt-1">{managedCourses.reduce((sum, c) => sum + c.modules.filter(m => m.type === 'quiz').length, 0)} quiz au programme</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl">
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Modules en live</span>
                            <p className="text-sm font-bold text-pink-700 mt-1">{managedCourses.filter(c => c.isLiveNow).length} en diffusion</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Operational KPI Indicators Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* StatCard 1: PayPal Revenue */}
                    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-center gap-4 hover:border-pink-300 transition-colors">
                      <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Inscriptions Facturées</span>
                        <h4 className="text-xl font-black text-slate-800 font-mono mt-0.5">
                          {(managedCourses.reduce((sum, c) => sum + c.price, 0)).toFixed(2)} €
                        </h4>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded-md mt-1 inline-block">
                          Paiements Actifs
                        </span>
                      </div>
                    </div>

                    {/* StatCard 2: Registered Students */}
                    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-center gap-4 hover:border-pink-300 transition-colors">
                      <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Promotion Active</span>
                        <h4 className="text-xl font-black text-slate-800 mt-0.5 font-sans">— Étudiants</h4>
                        <span className="text-[10px] text-slate-400 mt-1 inline-block">Inscrits à vos modules</span>
                      </div>
                    </div>

                    {/* StatCard 3: Managed Modules Count */}
                    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-center gap-4 hover:border-pink-300 transition-colors">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                        <Database className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">Syllabus Complet</span>
                        <h4 className="text-xl font-black text-slate-800 mt-0.5 font-mono">
                          {managedCourses.reduce((sum, c) => sum + c.modules.length, 0)} Chapitres
                        </h4>
                        <span className="text-[10px] text-indigo-600 font-bold mt-1 inline-block">Chapitres publiés</span>
                      </div>
                    </div>

                    {/* StatCard 4: Direct Live status */}
                    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-center gap-4 hover:border-pink-300 transition-colors">
                      <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                        <Video className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Diffusion live</span>
                        <h4 className="text-xl font-black text-slate-800 mt-0.5 font-sans">
                          {managedCourses.some(c => c.isLiveNow) ? "En Direct" : "Hors Ligne"}
                        </h4>
                        <span className="text-[10px] text-red-500 font-semibold mt-1 inline-block">
                          {managedCourses.some(c => c.isLiveNow) ? "● Interactivité Active" : "Aucun live stream actif"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Grid Layout: Courses Price & Live management vs Student Roster list */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* LHS: Program and Tariffs customization */}
                    <div className="lg:col-span-7 bg-white border border-slate-200 p-6 md:p-8 rounded-3xl space-y-6 shadow-sm">
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div>
                          <h3 className="text-lg font-black text-slate-800">Gestion des Tarifs & Séminaires</h3>
                          <p className="text-xs text-slate-400">Modifiez instantanément les frais d'accès et d'interactivité</p>
                        </div>
                        <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-full">
                          {managedCourses.length} matière{managedCourses.length !== 1 ? 's' : ''} gérables
                        </span>
                      </div>

                      <div className="space-y-6">
                        {managedCourses.length === 0 ? (
                          <div className="text-center p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs text-slate-400 font-semibold">Aucun module créé. Utilisez l'onglet Curriculum pour créer votre premier module.</p>
                          </div>
                        ) : managedCourses.map((course) => (
                          <div key={course.id} className="p-5 border border-slate-100 rounded-2xl hover:bg-slate-50/75 transition-all space-y-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{course.title}</h4>
                                <p className="text-xs text-slate-500 mt-0.5">{course.credits} ECTS • {course.duration}</p>
                              </div>
                              <span className="font-mono font-black text-xs text-pink-700 bg-pink-50 px-2.5 py-1 rounded-lg">
                                {course.price.toFixed(2)} €
                              </span>
                            </div>

                            {/* Slider control to change price in React state */}
                            <div className="space-y-1.5 pt-1">
                              <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase">
                                <span>Frais d'inscription</span>
                                <span className="text-slate-800 font-mono font-bold">{course.price.toFixed(2)} €</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="49"
                                step="0.5"
                                value={course.price}
                                onChange={(e) => handleUpdateCoursePrice(course.id, parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-600"
                              />
                            </div>

                            {/* Active live setup toggle switch */}
                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                              <div className="flex items-center gap-2">
                                <span className="flex h-2 w-2 relative">
                                  {course.isLiveNow && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>}
                                  <span className={`relative inline-flex rounded-full h-2 w-2 ${course.isLiveNow ? "bg-red-500" : "bg-slate-300"}`}></span>
                                </span>
                                <span className="text-xs font-bold text-slate-700">Séminaire Virtuel Live</span>
                              </div>

                              <button
                                onClick={() => handleToggleCourseLive(course.id)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  course.isLiveNow
                                    ? "bg-red-600 text-white hover:bg-red-700 shadow-sm"
                                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                }`}
                              >
                                {course.isLiveNow ? "Couper le Live" : "Lancer le Live"}
                              </button>
                            </div>
                            
                            {course.isLiveNow && (
                              <div className="bg-red-50/50 border border-red-100 p-3 rounded-xl text-xs space-y-1 text-red-800">
                                <p className="font-bold">Actuellement en cours :</p>
                                <p className="text-red-700 italic font-medium">"{course.liveSubject}"</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                    </div>

                    {/* RHS: Interactive student roster scores */}
                    <div className="lg:col-span-5 bg-white border border-slate-200 p-6 md:p-8 rounded-3xl space-y-6 shadow-sm">
                      <div>
                        <h3 className="text-lg font-black text-slate-800">Suivi & Notes de la Promotion</h3>
                        <p className="text-xs text-slate-400 md:max-w-sm">Étudiants inscrits au module sélectionné et moyennes réelles des quiz.</p>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-2">
                        <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Module analysé</label>
                        <select
                          value={gradesCourseId}
                          onChange={(e) => setGradesCourseId(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {managedCourses.map((course) => (
                              <option key={course.id} value={course.id}>{course.title}</option>
                            ))}
                        </select>
                        {selectedGradesCourse && (
                          <p className="text-[10px] text-slate-400 font-semibold">Module #{selectedGradesCourse.id} · {selectedGradesCourse.instructor}</p>
                        )}
                      </div>

                      <div className="space-y-4">
                        {gradesStatusMsg && (
                          <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50 text-xs font-bold text-slate-500">
                            {gradesStatusMsg}
                          </div>
                        )}

                        {courseGrades.map((grade) => (
                          <div key={grade.studentId} className="flex items-center justify-between gap-3 p-4 border border-slate-100 rounded-2xl hover:bg-slate-50/50">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {getInitials(grade.studentName)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-800 leading-tight truncate">{grade.studentName}</h4>
                                <p className="text-[10px] text-slate-400 uppercase font-semibold">
                                  Inscrit à {grade.enrolledCoursesCount} module{grade.enrolledCoursesCount > 1 ? "s" : ""} · {grade.completedQuizzesCount} quiz terminé{grade.completedQuizzesCount > 1 ? "s" : ""}
                                </p>
                              </div>
                            </div>
                            <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg whitespace-nowrap ${getGradeBadgeClass(grade.averageScoreOutOf20)}`}>
                              {grade.averageScoreOutOf20 === null ? "Aucune note" : `Moyenne: ${grade.averageScoreOutOf20}/20`}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl text-slate-500 text-[11px] leading-relaxed">
                        Les notes proviennent des tentatives de quiz enregistrées en base. Un étudiant sans tentative terminée reste affiché avec "Aucune note".
                      </div>
                    </div>
                  </div>
    </div>
  );
}
