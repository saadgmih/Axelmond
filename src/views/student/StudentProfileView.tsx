import type { FormEvent } from "react";
import { Award, Camera, CreditCard, GraduationCap } from "lucide-react";
import type { AppUser } from "../../components/AuthScreen";
import type { Course, Invoice } from "../../types";

interface StudentProfileViewProps {
  currentUser: AppUser | null;
  enrolledCourses: number[];
  courses: Course[];
  invoices: Invoice[];
  avatarStatusMsg: string;
  handleUploadAvatar: (e: FormEvent) => void | Promise<void>;
  handleDeleteAvatar: () => void | Promise<void>;
  setAvatarFile: (file: File | null) => void;
}

export default function StudentProfileView({
  currentUser,
  enrolledCourses,
  courses,
  invoices,
  avatarStatusMsg,
  handleUploadAvatar,
  handleDeleteAvatar,
  setAvatarFile,
}: StudentProfileViewProps) {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 flex flex-col md:flex-row items-center md:items-end md:justify-between p-6 md:p-8 gap-6">
        <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold font-sans text-3xl text-white shadow-md border-4 border-slate-100 overflow-hidden">
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="Photo de profil" className="w-full h-full object-cover" />
            ) : (
              currentUser ? currentUser.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "AR"
            )}
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 leading-tight">
              {currentUser ? currentUser.fullName : "Axelmond Research Labs"}
            </h1>
            <p className="text-sm font-semibold text-slate-500 flex items-center justify-center md:justify-start gap-1">
              <GraduationCap className="w-4 h-4 text-indigo-500" /> {currentUser ? currentUser.levelOrTitle : "Licence 3 Informatique"} d'Axelmond Research Labs
            </p>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded inline-block">
              Compte Actif
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center md:items-end gap-1 font-mono text-center md:text-right bg-slate-50 border border-slate-200 p-4 rounded-2xl">
          <span className="text-[10px] text-slate-500 uppercase font-bold leading-none">Identifiant Étudiant</span>
          <span className="text-sm font-bold text-slate-800 mt-1">{currentUser ? `ID-${currentUser.id}` : "—"}</span>
          <span className="text-[10px] text-indigo-600 mt-0.5 font-bold">{currentUser?.email || ""}</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-4 shadow-sm">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-base text-slate-800">Photo de profil</h3>
            <p className="text-xs text-slate-500 mt-0.5">Téléversez une image qui sera affichée dans la navigation et votre espace étudiant.</p>
          </div>
          <Camera className="w-5 h-5 text-indigo-600" />
        </div>
        <form onSubmit={handleUploadAvatar} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-center">
          <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white" />
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl text-xs">
            Changer la photo
          </button>
          <button type="button" onClick={handleDeleteAvatar} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-3 rounded-xl text-xs">
            Supprimer
          </button>
        </form>
        {avatarStatusMsg && <p className="text-xs font-semibold text-slate-500">{avatarStatusMsg}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-sm">
            <h3 className="font-extrabold text-base text-slate-800 pb-3 border-b border-slate-100">
              Rapport d'activité & Progression Académique
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold block">Crédits accumulés</span>
                <p className="text-2xl font-black text-slate-800">
                  {enrolledCourses.reduce((sum, id) => {
                    const matched = courses.find((c) => c.id === id);
                    return sum + (matched ? matched.credits : 0);
                  }, 0)}
                  <span className="text-xs text-slate-400 font-medium"> / 30 ECTS</span>
                </p>
              </div>

              <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold block">Modules Débloqués</span>
                <p className="text-2xl font-black text-slate-800">
                  {enrolledCourses.length}
                  <span className="text-xs text-slate-400 font-medium"> sur 4</span>
                </p>
              </div>

              <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold block">Quiz complétés</span>
                <p className="text-2xl font-black text-indigo-700">
                  {courses.filter((c) => enrolledCourses.includes(c.id)).reduce((sum, c) => sum + c.modules.filter((m) => m.type === "quiz" && m.completed).length, 0)}
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Modules suivis</h4>
              {courses.filter((course) => enrolledCourses.includes(course.id)).map((course) => (
                <div key={course.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600">{course.title}</span>
                    <span className="text-slate-800">{course.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${course.progress}%` }}></div>
                  </div>
                </div>
              ))}
              {courses.filter((course) => enrolledCourses.includes(course.id)).length === 0 && (
                <p className="text-xs text-slate-500">Aucun module inscrit pour le moment.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-4 shadow-sm">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-800">Historique des paiements & Reçus</h3>
                <p className="text-xs text-slate-500 mt-0.5">Retrouvez ici vos reçus de paiement.</p>
              </div>
              <CreditCard className="w-5 h-5 text-indigo-600" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black tracking-wider">
                    <th className="py-3 px-4">Référence</th>
                    <th className="py-3 px-4">Date de transaction</th>
                    <th className="py-3 px-4">Services / Modules débloqués</th>
                    <th className="py-3 px-4 text-right">Montant</th>
                    <th className="py-3 px-4 text-center">État</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-50 last:border-none font-sans hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">{inv.id}</td>
                      <td className="py-3 px-4">{inv.date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{inv.courseTitle}</td>
                      <td className="py-3 px-4 text-right font-bold text-indigo-700 font-mono">{inv.amount.toFixed(2)}€</td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <h3 className="font-extrabold text-base text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <Award className="w-5 h-5 text-yellow-500" /> Statut académique
          </h3>

          <div className="space-y-4 pt-1">
            <div className="flex gap-3.5 items-start">
              <div className="w-12 h-12 bg-yellow-100 border border-yellow-200 text-yellow-700 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold shadow-sm">
                {courses.filter((c) => enrolledCourses.includes(c.id)).reduce((sum, course) => sum + course.modules.filter((module) => module.completed).length, 0)}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 leading-tight">Modules validés</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Nombre réel de modules marqués comme terminés dans vos modules inscrits.</p>
              </div>
            </div>

            <div className="flex gap-3.5 items-start">
              <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold shadow-sm">
                {courses.filter((c) => enrolledCourses.includes(c.id)).reduce((sum, course) => sum + course.modules.filter((module) => module.type === "quiz" && module.completed).length, 0)}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 leading-tight">Quiz complétés</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Évaluations terminées dans vos modules actuellement inscrits.</p>
              </div>
            </div>

            <div className="flex gap-3.5 items-start">
              <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold shadow-sm">
                {courses.filter((c) => enrolledCourses.includes(c.id)).length}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 leading-tight">Modules inscrits</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Modules actifs rattachés à votre compte étudiant.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
