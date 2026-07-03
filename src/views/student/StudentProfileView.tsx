import { useMemo } from "react";
import { Award, BookOpen, CheckCircle2, CreditCard, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import ProfileAvatarUpload from "../../components/ProfileAvatarUpload";
import type { AppUser } from "../../components/AuthScreen";
import type { Course, Invoice } from "../../types";
import { formatCredits, formatMad } from "../../utils/morocco-locale";
import { formatInvoiceReference } from "../../utils/user-facing-labels";

interface StudentProfileViewProps {
  currentUser: AppUser | null;
  enrolledCourses: number[];
  courses: Course[];
  invoices: Invoice[];
  avatarStatusMsg: string;
  handleUploadAvatarFile: (file: File) => void | Promise<void>;
  handleDeleteAvatar: () => void | Promise<void>;
}

function getInitials(name: string) {
  if (!name) return "PA";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function StudentProfileView({
  currentUser,
  enrolledCourses,
  courses,
  invoices,
  avatarStatusMsg,
  handleUploadAvatarFile,
  handleDeleteAvatar,
}: StudentProfileViewProps) {
  const enrolledList = useMemo(
    () => courses.filter((course) => enrolledCourses.includes(course.id)),
    [courses, enrolledCourses],
  );

  const stats = useMemo(() => {
    const totalCredits = enrolledList.reduce((sum, course) => sum + course.credits, 0);
    const completedQuizzes = enrolledList.reduce(
      (sum, course) => sum + course.modules.filter((m) => m.type === "quiz" && m.completed).length,
      0,
    );
    const validatedModules = enrolledList.reduce(
      (sum, course) => sum + course.modules.filter((m) => m.completed).length,
      0,
    );
    const avgProgress =
      enrolledList.length > 0
        ? Math.round(enrolledList.reduce((sum, c) => sum + c.progress, 0) / enrolledList.length)
        : 0;

    return {
      totalCredits,
      completedQuizzes,
      validatedModules,
      avgProgress,
      enrolledCount: enrolledList.length,
    };
  }, [enrolledList]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-indigo-900 to-slate-900 text-white shadow-xl border border-emerald-950/50">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-teal-500/10 blur-2xl" />

        <div className="relative z-10 p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-end">
                <ProfileAvatarUpload
                  avatarUrl={currentUser?.avatarUrl}
                  initials={currentUser ? getInitials(currentUser.fullName) : "PA"}
                  statusMsg=""
                  accent="indigo"
                  layout="hero"
                  previewSize={112}
                  onUpload={handleUploadAvatarFile}
                  onDelete={handleDeleteAvatar}
                />

                <div className="space-y-2 text-center sm:text-left">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-200">
                    <GraduationCap className="h-3 w-3" />
                    Profil Étudiant
                  </span>
                  <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                    {currentUser?.fullName || "Étudiant Performance Académique"}
                  </h1>
                  <p className="text-sm font-medium text-emerald-200/90">
                    {currentUser?.levelOrTitle || "Licence 3 Informatique"} · Performance Académique
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                      <ShieldCheck className="h-3 w-3" />
                      Compte actif
                    </span>
                  </div>
                </div>
              </div>

              {avatarStatusMsg && (
                <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-center text-xs font-semibold text-emerald-100 sm:text-left">
                  {avatarStatusMsg}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm lg:min-w-[220px]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/80">Compte</p>
              <p className="mt-1 text-sm font-bold text-white">{currentUser?.fullName || "—"}</p>
              <p className="mt-2 truncate text-xs font-medium text-emerald-200/80">{currentUser?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "Crédits",
            value: stats.totalCredits,
            suffix: "/ 30",
            icon: Sparkles,
            accent: "from-emerald-500 to-emerald-600",
          },
          {
            label: "Modules inscrits",
            value: stats.enrolledCount,
            suffix: " actifs",
            icon: BookOpen,
            accent: "from-teal-500 to-teal-600",
          },
          {
            label: "Progression moy.",
            value: stats.avgProgress,
            suffix: "%",
            icon: Award,
            accent: "from-emerald-500 to-teal-600",
          },
          {
            label: "Quiz complétés",
            value: stats.completedQuizzes,
            suffix: "",
            icon: CheckCircle2,
            accent: "from-lime-500 to-orange-600",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div
              className={`absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br ${item.accent} opacity-10 transition-opacity group-hover:opacity-20`}
            />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {item.value}
                  <span className="text-sm font-semibold text-slate-400">{item.suffix}</span>
                </p>
              </div>
              <div className={`rounded-xl bg-gradient-to-br ${item.accent} p-2.5 text-white shadow-sm`}>
                <item.icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
          {/* Progression */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:col-span-12">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 md:px-8">
              <div>
                <h2 className="text-lg font-black text-slate-900">Progression académique</h2>
                <p className="mt-0.5 text-xs text-slate-500">Suivi de vos modules inscrits</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>

            <div className="space-y-4 p-6 md:p-8">
              {enrolledList.length > 0 ? (
                enrolledList.map((course) => (
                  <div key={course.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800">{course.title}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          {formatCredits(course.credits)} · {course.level}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-xs font-black text-emerald-700 shadow-sm">
                        {course.progress}%
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                  <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-600">Aucun module inscrit</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Parcourez le catalogue pour débloquer vos premiers modules.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
          {/* Invoices */}
          <section className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:col-span-8">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 md:px-8">
              <div>
                <h2 className="text-lg font-black text-slate-900">Historique des paiements</h2>
                <p className="mt-0.5 text-xs text-slate-500">Reçus et transactions de vos inscriptions</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>

            {invoices.length > 0 ? (
              <>
                <div className="hidden flex-1 overflow-x-auto md:block">
                  <table className="w-full border-collapse text-left text-xs text-slate-600">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <th className="px-6 py-4">Référence</th>
                        <th className="px-4 py-4">Date</th>
                        <th className="px-4 py-4">Module</th>
                        <th className="px-4 py-4 text-right">Montant</th>
                        <th className="px-6 py-4 text-center">État</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr
                          key={inv.id}
                          className="border-b border-slate-50 transition-colors last:border-none hover:bg-slate-50/80"
                        >
                          <td className="px-6 py-4 font-semibold text-slate-800">{formatInvoiceReference(inv.id)}</td>
                          <td className="px-4 py-4">{inv.date}</td>
                          <td className="px-4 py-4 font-semibold text-slate-900">{inv.courseTitle}</td>
                          <td className="px-4 py-4 text-right font-mono font-bold text-emerald-700">
                            {formatMad(inv.amount)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex-1 space-y-3 p-4 md:hidden">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{inv.courseTitle}</p>
                          <p className="mt-0.5 text-[10px] text-slate-400">{formatInvoiceReference(inv.id)}</p>
                        </div>
                        <span className="rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-700">
                          {inv.status}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-slate-500">{inv.date}</span>
                        <span className="font-mono font-black text-emerald-700">{formatMad(inv.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center md:px-8">
                <CreditCard className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-600">Aucun paiement enregistré</p>
                <p className="mt-1 text-xs text-slate-400">Vos reçus apparaîtront ici après inscription.</p>
              </div>
            )}
          </section>

          {/* Academic status */}
          <section className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:col-span-4">
            <div className="border-b border-slate-100 px-6 py-5">
              <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Award className="h-4 w-4 text-lime-500" />
                Statut académique
              </h3>
            </div>
            <div className="flex flex-1 flex-col justify-center space-y-3 p-6">
              {[
                {
                  value: stats.validatedModules,
                  title: "Modules validés",
                  desc: "Leçons marquées comme terminées",
                  color: "bg-lime-50 text-lime-700 border-lime-100",
                },
                {
                  value: stats.completedQuizzes,
                  title: "Quiz complétés",
                  desc: "Évaluations réussies ou soumises",
                  color: "bg-emerald-50 text-emerald-700 border-emerald-100",
                },
                {
                  value: stats.enrolledCount,
                  title: "Modules actifs",
                  desc: "Inscriptions en cours sur votre compte",
                  color: "bg-emerald-50 text-emerald-700 border-emerald-100",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm font-black ${item.color}`}
                  >
                    {item.value}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
