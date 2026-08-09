import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { api } from "../../api";
import { getClientErrorMessage } from "../../client-errors";
import { AdminAccessCodes } from "../../components/AdminAccessCodes";

interface Course {
  id: number;
  title: string;
  price: number;
}

export default function AdminAccessCodesView() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    api
      .getAdminPromoOptions()
      .then((opts) => {
        setCourses(opts.courses);
        if (opts.courses.length > 0 && opts.courses[0]) {
          setSelectedCourseId(opts.courses[0].id);
        }
      })
      .catch((err) => setLoadError(getClientErrorMessage(err, "Impossible de charger les modules.")));
  }, []);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) ?? null;

  return (
    <main className="space-y-5 p-4 md:p-6" aria-labelledby="admin-access-codes-title">
      <header className="rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 to-slate-950/20 p-6">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
          <ShieldCheck className="h-4 w-4" /> Administration
        </p>
        <h1 id="admin-access-codes-title" className="mt-2 text-2xl font-black text-white md:text-3xl">
          Codes d&apos;accès aux modules
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Générez des codes à usage unique permettant à un étudiant d&apos;accéder à un module pendant 30 jours, sans
          paiement. Transmettez le code directement à l&apos;étudiant.
        </p>
      </header>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
        <div className="space-y-1">
          <label htmlFor="module-select" className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Sélectionner un module
          </label>
          {loadError ? (
            <p className="text-xs font-medium text-red-400">{loadError}</p>
          ) : (
            <select
              id="module-select"
              value={selectedCourseId ?? ""}
              onChange={(e) => setSelectedCourseId(Number(e.target.value) || null)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/50"
            >
              <option value="">-- Choisir un module --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedCourse ? (
          <div className="border-t border-white/[0.06] pt-4">
            <AdminAccessCodes courseId={selectedCourse.id} courseTitle={selectedCourse.title} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/10 ring-1 ring-violet-400/20">
              <KeyRound className="h-7 w-7 text-violet-300/60" />
            </div>
            <p className="text-sm text-slate-500">Sélectionnez un module pour gérer ses codes d&apos;accès.</p>
          </div>
        )}
      </div>
    </main>
  );
}
