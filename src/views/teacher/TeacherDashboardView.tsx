import { useEffect, useMemo, useState, memo, type FormEvent } from "react";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Code2,
  CreditCard,
  DollarSign,
  GraduationCap,
  HelpCircle,
  Layers,
  Mail,
  PlayCircle,
  Target,
  Tag,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import { api } from "../../api";
import type { AppUser } from "../../components/AuthScreen";
import CoursePriceSlider from "../../components/CoursePriceSlider";
import type { AcademicProfilePayload, Course, CourseGrade } from "../../types";
import { coerceCoursePrice, formatFreeAccessDurationLabel, isFreeCoursePrice } from "../../utils/course-pricing";
import { formatCredits, formatMad } from "../../utils/morocco-locale";

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
  teacherChartTab?: "revenue" | "engagement";
  setTeacherChartTab?: (tab: "revenue" | "engagement") => void;
  managedCourses: Course[];
  courses: Course[];
  handleUpdateCoursePrice: (id: number, newPrice: number) => void | Promise<void>;
  coursePriceErrors?: Record<number, string>;
  savingCoursePriceIds?: Record<number, boolean>;
  gradesCourseId: number;
  setGradesCourseId: (id: number) => void;
  selectedGradesCourse: Course | null;
  gradesStatusMsg: string;
  gradesRefreshKey: number;
  courseGrades: CourseGrade[];
  removingEnrollmentKey: string | null;
  handleRemoveStudentEnrollment: (courseId: number, studentId: string, studentName: string) => void | Promise<void>;
  getInitials: (name: string) => string;
  getGradeBadgeClass: (score: number | null) => string;
  onTeacherNavigate?: (view: string) => void;
}

function formatActivityDate(value?: string | null) {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "—";
  return new Date(parsed).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

const TeacherKpiCard = memo(function TeacherKpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  id,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Users;
  accent: string;
  id?: string;
}) {
  return (
    <div id={id} className="rounded-2xl border border-white/5 bg-slate-900/70 p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</span>
        <Icon className={`w-4 h-4 shrink-0 ${accent}`} />
      </div>
      <p className="text-lg sm:text-xl font-black text-white truncate">{value}</p>
      <p className="text-[11px] text-slate-400 leading-snug">{hint}</p>
    </div>
  );
});

const TeacherModuleProgressRow = memo(function TeacherModuleProgressRow({
  row,
  onNavigate,
}: {
  row: {
    course: Course;
    students: number;
    publishedCount: number;
    totalModules: number;
    contentProgress: number;
    status: string;
  };
  onNavigate?: (view: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 flex flex-col lg:flex-row lg:items-center gap-4">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-white truncate">{row.course.title}</p>
          <span
            className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
              row.status === "Live actif"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : row.status === "Publié"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-slate-600 bg-slate-800 text-slate-400"
            }`}
          >
            {row.status}
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          {row.students} étudiant{row.students !== 1 ? "s" : ""} · {row.publishedCount}/{row.totalModules} chapitres
          publiés · {formatMad(row.course.price)}
        </p>
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 max-w-xs rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
              style={{ width: `${row.contentProgress}%` }}
            />
          </div>
          <span className="text-[11px] font-bold text-emerald-200 font-mono">{row.contentProgress}%</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onNavigate?.("curriculum")}
        className="self-start lg:self-center inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-100 text-xs font-bold px-4 py-2.5 min-h-[44px] transition-colors"
      >
        Gérer
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
});

const TeacherTariffCard = memo(function TeacherTariffCard({
  course,
  priceError,
  isSaving,
  onSave,
}: {
  course: Course;
  priceError?: string | null;
  isSaving?: boolean;
  onSave: (courseId: number, price: number) => void | Promise<void>;
}) {
  const normalizedPrice = coerceCoursePrice(course.price);
  return (
    <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#031512]/70 p-5 transition-colors hover:border-white/[0.12]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="shrink-0 rounded-xl border border-teal-500/25 bg-teal-600/15 p-2">
            <Code2 className="h-4 w-4 text-teal-400" />
          </div>
          <div className="min-w-0">
            <h4 className="truncate text-sm font-extrabold leading-snug text-white">{course.title}</h4>
            <p className="mt-0.5 text-xs text-slate-500">
              {formatCredits(course.credits)} • {course.duration}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-2.5 py-1 font-mono text-xs font-black text-white">
          {isFreeCoursePrice(normalizedPrice)
            ? formatFreeAccessDurationLabel(course.freeAccessDurationDays, course.freeAccessStartsAt, course.freeAccessEndsAt)
            : formatMad(normalizedPrice)}
        </span>
      </div>
      <CoursePriceSlider
        courseId={course.id}
        price={normalizedPrice}
        freeAccessStartsAt={course.freeAccessStartsAt}
        freeAccessEndsAt={course.freeAccessEndsAt}
        freeAccessDurationDays={course.freeAccessDurationDays}
        courseTitle={course.title}
        onCommit={onSave}
        priceError={priceError}
        isSaving={isSaving}
      />
    </div>
  );
});

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
  managedCourses,
  handleUpdateCoursePrice,
  coursePriceErrors = {},
  savingCoursePriceIds = {},
  gradesCourseId,
  setGradesCourseId,
  selectedGradesCourse,
  gradesStatusMsg,
  gradesRefreshKey,
  courseGrades,
  removingEnrollmentKey,
  handleRemoveStudentEnrollment,
  getInitials,
  getGradeBadgeClass,
  onTeacherNavigate,
}: TeacherDashboardViewProps) {
  const [profileSnapshot, setProfileSnapshot] = useState<AcademicProfilePayload | null>(null);
  const [gradesByCourse, setGradesByCourse] = useState<Record<number, CourseGrade[]>>({});
  const managedCourseIds = managedCourses.map((course) => course.id).join(",");
  const canRemoveEnrollment = currentUser.role === "ADMIN";

  useEffect(() => {
    let disposed = false;
    api
      .getAcademicProfile()
      .then((payload) => {
        if (!disposed) setProfileSnapshot(payload);
      })
      .catch(() => {
        if (!disposed) setProfileSnapshot(null);
      });
    return () => {
      disposed = true;
    };
  }, [currentUser.id]);

  useEffect(() => {
    if (!managedCourses.length) {
      setGradesByCourse({});
      return;
    }
    let disposed = false;
    Promise.all(
      managedCourses.map((course) =>
        api
          .getCourseGrades(course.id)
          .then((grades) => [course.id, grades] as const)
          .catch(() => [course.id, [] as CourseGrade[]] as const),
      ),
    ).then((entries) => {
      if (disposed) return;
      setGradesByCourse(Object.fromEntries(entries));
    });
    return () => {
      disposed = true;
    };
  }, [managedCourseIds, managedCourses.length, gradesRefreshKey]);

  const dashboard = useMemo(() => {
    const publishedModules = managedCourses.filter((course) => course.published).length;
    const publishedChapters = managedCourses.reduce(
      (sum, course) => sum + course.modules.filter((module) => module.published === true).length,
      0,
    );
    const quizzesCreated = managedCourses.reduce(
      (sum, course) => sum + course.modules.filter((module) => module.type === "quiz").length,
      0,
    );
    const liveSessions = profileSnapshot?.lives?.length ?? 0;

    const enrollmentRows = managedCourses.flatMap((course) =>
      (gradesByCourse[course.id] || []).map((grade) => ({ course, grade })),
    );
    const uniqueStudentIds = new Set(enrollmentRows.map((row) => row.grade.studentId));
    const estimatedRevenue = managedCourses.reduce((sum, course) => {
      const enrollments = gradesByCourse[course.id]?.length || 0;
      return sum + course.price * enrollments;
    }, 0);

    const gradedStudents = enrollmentRows
      .map((row) => row.grade.averageScoreOutOf20)
      .filter((score): score is number => score !== null);
    const quizParticipants = enrollmentRows.filter((row) => row.grade.completedQuizzesCount > 0);
    const passedStudents = quizParticipants.filter(
      (row) => row.grade.averageScoreOutOf20 !== null && row.grade.averageScoreOutOf20 >= 10,
    );
    const passRate =
      quizParticipants.length > 0 ? Math.round((passedStudents.length / quizParticipants.length) * 100) : null;
    const averageGrade =
      gradedStudents.length > 0
        ? Math.round((gradedStudents.reduce((sum, score) => sum + score, 0) / gradedStudents.length) * 10) / 10
        : null;

    const contentProgressAverage =
      managedCourses.length > 0
        ? Math.round(
            managedCourses.reduce((sum, course) => {
              if (!course.modules.length) return sum;
              const publishedCount = course.modules.filter((module) => module.published === true).length;
              return sum + (publishedCount / course.modules.length) * 100;
            }, 0) / managedCourses.length,
          )
        : 0;

    const recentEnrollments = [...enrollmentRows]
      .sort((a, b) => a.grade.studentName.localeCompare(b.grade.studentName, "fr"))
      .slice(0, 5);

    const recentPayments = managedCourses
      .map((course) => {
        const enrollments = gradesByCourse[course.id]?.length || 0;
        if (enrollments === 0 || course.price <= 0) return null;
        return {
          id: course.id,
          label: course.title,
          amount: course.price * enrollments,
          detail: `${enrollments} inscription${enrollments > 1 ? "s" : ""} × ${formatMad(course.price)}`,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const recentQuizzes = enrollmentRows
      .filter((row) => row.grade.completedQuizzesCount > 0)
      .sort((a, b) => b.grade.completedQuizzesCount - a.grade.completedQuizzesCount)
      .slice(0, 5);

    const recentLives = (profileSnapshot?.lives || []).slice(0, 5);

    const moduleRows = managedCourses.map((course) => {
      const students = gradesByCourse[course.id]?.length || 0;
      const publishedCount = course.modules.filter((module) => module.published === true).length;
      const totalModules = course.modules.length;
      const contentProgress = totalModules ? Math.round((publishedCount / totalModules) * 100) : 0;
      const status = course.isLiveNow ? "Live actif" : course.published ? "Publié" : "Brouillon";

      return {
        course,
        students,
        publishedCount,
        totalModules,
        contentProgress,
        status,
      };
    });

    return {
      publishedModules,
      publishedChapters,
      publishedContents: profileSnapshot?.publishedContentsCount ?? 0,
      quizzesCreated,
      liveSessions,
      enrolledStudents: uniqueStudentIds.size,
      estimatedRevenue,
      passRate,
      averageGrade,
      contentProgressAverage,
      recentEnrollments,
      recentPayments,
      recentQuizzes,
      recentLives,
      moduleRows,
    };
  }, [managedCourses, gradesByCourse, profileSnapshot]);

  const kpiCards = [
    {
      label: "Étudiants inscrits",
      value: String(dashboard.enrolledStudents),
      hint: "sur vos modules gérés",
      icon: Users,
      accent: "text-teal-300",
    },
    {
      label: "Modules publiés",
      value: String(dashboard.publishedModules),
      hint: `${managedCourses.length} module${managedCourses.length !== 1 ? "s" : ""} au total`,
      icon: BookOpen,
      accent: "text-emerald-300",
    },
    {
      label: "Chapitres publiés",
      value: String(dashboard.publishedChapters),
      hint: `${dashboard.publishedContents} contenu${dashboard.publishedContents !== 1 ? "s" : ""} publié${dashboard.publishedContents !== 1 ? "s" : ""}`,
      icon: Layers,
      accent: "text-teal-300",
    },
    {
      label: "Quiz créés",
      value: String(dashboard.quizzesCreated),
      hint: "dans vos syllabus",
      icon: HelpCircle,
      accent: "text-emerald-300",
    },
    {
      label: "Sessions live",
      value: String(dashboard.liveSessions),
      hint: `${managedCourses.filter((course) => course.isLiveNow).length} active${managedCourses.filter((course) => course.isLiveNow).length !== 1 ? "s" : ""} maintenant`,
      icon: Video,
      accent: "text-red-300",
    },
    {
      label: "Revenus estimés",
      value: formatMad(dashboard.estimatedRevenue),
      hint: "inscriptions × tarif module",
      icon: DollarSign,
      accent: "text-emerald-300",
    },
    {
      label: "Taux de réussite",
      value: dashboard.passRate !== null ? `${dashboard.passRate}%` : "—",
      hint: "quiz ≥ 10/20",
      icon: Target,
      accent: "text-lime-300",
    },
    {
      label: "Note moyenne",
      value: dashboard.averageGrade !== null ? `${dashboard.averageGrade}/20` : "—",
      hint: "moyenne des tentatives enregistrées",
      icon: GraduationCap,
      accent: "text-teal-300",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Welcome Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg border border-emerald-950">
        <div className="absolute right-0 top-0 w-1/3 h-full opacity-10 pointer-events-none">
          <GraduationCap className="w-full h-full text-white" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block">
            Espace Enseignant
          </span>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
            Ravi de vous revoir, {currentUser.fullName.split(" ")[0]}.
          </h1>
          <p className="text-emerald-100 text-sm md:text-base leading-relaxed">
            Gérez le cursus académique, ajustez les informations tarifaires, ajoutez des modules ou des examens
            d'évaluation et suivez la progression en temps réel de votre promotion d'étudiants.
          </p>
        </div>
      </div>

      {currentUser.role === "ADMIN" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-600" />
                Vérification e-mail
              </h3>
              <p className="text-xs text-slate-400">Contrôlez l&apos;envoi des messages de vérification</p>
            </div>
            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
              Administrateur
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 border-y border-slate-100 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="py-4 md:px-4 first:md:pl-0 space-y-1">
              <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Service e-mail</p>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${emailDeliverySummary?.smtpConfigured ? "bg-emerald-500" : "bg-red-500"}`}
                ></span>
                <p
                  className={`text-sm font-black ${emailDeliverySummary?.smtpConfigured ? "text-emerald-700" : "text-red-700"}`}
                >
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
                {emailDeliverySummary?.lastEmailSent ? "Dernier envoi réussi" : "Aucun message envoyé récemment"}
              </p>
            </div>
            <div className="py-4 md:px-4 space-y-1">
              <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Envoyés aujourd'hui</p>
              <p className="text-2xl font-black text-slate-900">{emailDeliverySummary?.emailsSentToday ?? 0}</p>
            </div>
            <div className="py-4 md:px-4 last:md:pr-0 space-y-1">
              <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Dernière erreur</p>
              <p
                className={`text-sm font-black ${emailDeliverySummary?.lastSmtpError ? "text-red-700" : "text-emerald-700"}`}
              >
                {emailDeliverySummary?.lastSmtpError ? "Anomalie détectée" : "Aucune erreur"}
              </p>
              <p className="text-[10px] font-semibold text-slate-400 truncate">
                {emailDeliverySummary?.lastSmtpError ? "Consultez les journaux techniques" : "Aucune anomalie récente"}
              </p>
            </div>
          </div>

          {emailDeliveryStatusMsg && <p className="text-xs font-semibold text-red-500">{emailDeliveryStatusMsg}</p>}

          <form onSubmit={handleSendTestEmail} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <input
              type="email"
              required
              placeholder="adresse.personnelle@example.com"
              value={testEmailTo}
              onChange={(e) => setTestEmailTo(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={isSendingTestEmail}
              className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-3 px-6 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
            >
              {isSendingTestEmail ? "Envoi..." : "Envoyer un e-mail de test"}
            </button>
          </form>

          {testEmailStatusMsg && <p className="text-xs font-semibold text-slate-500">{testEmailStatusMsg}</p>}
        </div>
      )}

      {/* Teacher command center */}
      <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30 p-5 sm:p-6 md:p-8 shadow-xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              Centre de pilotage enseignant
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Indicateurs calculés à partir de vos modules, inscriptions réelles, tentatives de quiz et sessions live
              enregistrées.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-200">
            <TrendingUp className="w-3.5 h-3.5" />
            Données synchronisées
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Publication globale du contenu
              </p>
              <p className="text-2xl sm:text-3xl font-black text-white mt-1">{dashboard.contentProgressAverage}%</p>
            </div>
            <p className="text-xs text-slate-400">
              {dashboard.publishedModules} module{dashboard.publishedModules !== 1 ? "s" : ""} publié
              {dashboard.publishedModules !== 1 ? "s" : ""} · {dashboard.publishedChapters} chapitre
              {dashboard.publishedChapters !== 1 ? "s" : ""} publié{dashboard.publishedChapters !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, dashboard.contentProgressAverage))}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {kpiCards.map((card) => (
            <TeacherKpiCard
              key={card.label}
              {...card}
              id={card.label === "Revenus estimés" ? "teacher-revenue" : undefined}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-12 rounded-2xl border border-white/5 bg-slate-900/60 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-black text-white">Activité récente</h4>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Temps réel plateforme
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> Inscriptions
                </p>
                {dashboard.recentEnrollments.length === 0 ? (
                  <p className="text-xs text-slate-500 rounded-xl border border-dashed border-slate-700 px-3 py-4">
                    Aucune inscription enregistrée.
                  </p>
                ) : (
                  dashboard.recentEnrollments.map(({ course, grade }) => (
                    <div
                      key={`${course.id}-${grade.studentId}`}
                      className="rounded-xl border border-white/5 bg-slate-950/60 px-3 py-2.5"
                    >
                      <p className="text-xs font-bold text-white truncate">{grade.studentName}</p>
                      <p className="text-[11px] text-slate-400 truncate">Inscrit à {course.title}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> Paiements estimés
                </p>
                {dashboard.recentPayments.length === 0 ? (
                  <p className="text-xs text-slate-500 rounded-xl border border-dashed border-slate-700 px-3 py-4">
                    Aucun revenu calculable pour le moment.
                  </p>
                ) : (
                  dashboard.recentPayments.map((payment) => (
                    <div key={payment.id} className="rounded-xl border border-white/5 bg-slate-950/60 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-white truncate">{payment.label}</p>
                        <p className="text-xs font-black text-emerald-300 font-mono">{formatMad(payment.amount)}</p>
                      </div>
                      <p className="text-[11px] text-slate-400">{payment.detail}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" /> Quiz terminés
                </p>
                {dashboard.recentQuizzes.length === 0 ? (
                  <p className="text-xs text-slate-500 rounded-xl border border-dashed border-slate-700 px-3 py-4">
                    Aucun quiz terminé enregistré.
                  </p>
                ) : (
                  dashboard.recentQuizzes.map(({ course, grade }) => (
                    <div
                      key={`quiz-${course.id}-${grade.studentId}`}
                      className="rounded-xl border border-white/5 bg-slate-950/60 px-3 py-2.5"
                    >
                      <p className="text-xs font-bold text-white truncate">{grade.studentName}</p>
                      <p className="text-[11px] text-slate-400">
                        {grade.completedQuizzesCount} quiz · {course.title}
                        {grade.averageScoreOutOf20 !== null ? ` · ${grade.averageScoreOutOf20}/20` : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <PlayCircle className="w-3.5 h-3.5" /> Lives
                </p>
                {dashboard.recentLives.length === 0 ? (
                  <p className="text-xs text-slate-500 rounded-xl border border-dashed border-slate-700 px-3 py-4">
                    Aucune session live enregistrée.
                  </p>
                ) : (
                  dashboard.recentLives.map((live) => (
                    <div key={live.id} className="rounded-xl border border-white/5 bg-slate-950/60 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-white truncate">
                          {live.course?.title || "Module sans titre"}
                        </p>
                        <span
                          className={`text-[10px] font-bold uppercase ${live.active ? "text-red-300" : "text-slate-500"}`}
                        >
                          {live.active ? "Actif" : "Terminé"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{formatActivityDate(live.startedAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-black text-white">Progression des modules</h4>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {dashboard.moduleRows.length} module{dashboard.moduleRows.length !== 1 ? "s" : ""}
            </span>
          </div>

          {dashboard.moduleRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-8 text-center">
              <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">Aucun module géré pour le moment.</p>
              <button
                type="button"
                onClick={() => onTeacherNavigate?.("curriculum")}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 min-h-[44px]"
              >
                Créer un module
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {dashboard.moduleRows.map((row) => (
                <TeacherModuleProgressRow key={row.course.id} row={row} onNavigate={onTeacherNavigate} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Primary Grid Layout: Courses Price & Live management vs Student Roster list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LHS: Program and Tariffs customization */}
        <div
          id="teacher-tariffs"
          className="lg:col-span-7 rounded-3xl border border-emerald-500/20 bg-[#0b241f]/80 p-6 shadow-xl shadow-black/30 backdrop-blur-xl md:p-8 space-y-6"
        >
          <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-600/15 p-2.5">
                <Tag className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Gestion des Tarifs</h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Modifiez instantanément les frais d&apos;accès et d&apos;interactivité
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/50 px-3 py-1.5 text-xs font-bold text-emerald-300">
              <BookOpen className="h-3.5 w-3.5" />
              {managedCourses.length} matière{managedCourses.length !== 1 ? "s" : ""} gérable
              {managedCourses.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-4">
            {managedCourses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-[#031512]/50 p-6 text-center">
                <BookOpen className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                <p className="text-xs font-semibold text-slate-400">
                  Aucun module créé. Utilisez l&apos;onglet Curriculum pour créer votre premier module.
                </p>
              </div>
            ) : (
              managedCourses.map((course) => (
                <TeacherTariffCard
                  key={course.id}
                  course={course}
                  priceError={coursePriceErrors[course.id]}
                  isSaving={Boolean(savingCoursePriceIds[course.id])}
                  onSave={handleUpdateCoursePrice}
                />
              ))
            )}
          </div>
        </div>

        {/* RHS: Interactive student roster scores */}
        <div className="lg:col-span-5 bg-white border border-slate-200 p-6 md:p-8 rounded-3xl space-y-6 shadow-sm">
          <div>
            <h3 className="text-lg font-black text-slate-800">Suivi & Notes de la Promotion</h3>
            <p className="text-xs text-slate-400 md:max-w-sm">
              Étudiants inscrits au module sélectionné et moyennes réelles des quiz.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-2">
            <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Module analysé</label>
            <select
              value={gradesCourseId}
              onChange={(e) => setGradesCourseId(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {managedCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            {selectedGradesCourse && (
              <p className="text-[10px] text-slate-400 font-semibold">
                {selectedGradesCourse.title} · {selectedGradesCourse.instructor}
              </p>
            )}
          </div>

          <div className="space-y-4">
            {gradesStatusMsg && (
              <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50 text-xs font-bold text-slate-500">
                {gradesStatusMsg}
              </div>
            )}

            {courseGrades.map((grade) => {
              const removeKey = `${gradesCourseId}:${grade.studentId}`;
              const isRemoving = removingEnrollmentKey === removeKey;
              return (
                <div
                  key={grade.studentId}
                  className="flex items-center justify-between gap-3 p-4 border border-slate-100 rounded-2xl hover:bg-slate-50/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {getInitials(grade.studentName)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 leading-tight truncate">{grade.studentName}</h4>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">
                        Inscrit à {grade.enrolledCoursesCount} module{grade.enrolledCoursesCount > 1 ? "s" : ""} ·{" "}
                        {grade.completedQuizzesCount} quiz terminé{grade.completedQuizzesCount > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                    <span
                      className={`text-xs font-extrabold px-2.5 py-1 rounded-lg whitespace-nowrap ${getGradeBadgeClass(grade.averageScoreOutOf20)}`}
                    >
                      {grade.averageScoreOutOf20 === null ? "Aucune note" : `Moyenne: ${grade.averageScoreOutOf20}/20`}
                    </span>
                    {canRemoveEnrollment && (
                      <button
                        type="button"
                        disabled={isRemoving}
                        onClick={() =>
                          void handleRemoveStudentEnrollment(gradesCourseId, grade.studentId, grade.studentName)
                        }
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-red-200 transition-colors hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-60"
                        title="Retirer cet étudiant du module"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                        {isRemoving ? "Retrait..." : "Retirer"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl text-slate-500 text-[11px] leading-relaxed">
            Les notes proviennent des tentatives de quiz complétées par vos étudiants. Un étudiant sans tentative
            terminée reste affiché avec "Aucune note".
          </div>
        </div>
      </div>
    </div>
  );
}
