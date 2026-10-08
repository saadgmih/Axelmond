import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
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
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAdminPromoOptions()
      .then((opts) => {
        setCourses(opts.courses);
      })
      .catch((err) => setLoadError(getClientErrorMessage(err, "Impossible de charger les modules.")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="space-y-5 p-4 md:p-6" aria-labelledby="admin-access-codes-title">
      <header className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-950/40 to-slate-950/20 p-6">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
          <ShieldCheck className="h-4 w-4" /> Administration
        </p>
        <h1 id="admin-access-codes-title" className="mt-2 text-2xl font-black text-white md:text-3xl">
          Codes d&apos;accès aux modules
        </h1>
        <p className="mt-2 text-sm text-slate-300 max-w-3xl leading-relaxed">
          Générez des codes à usage unique permettant à un étudiant d&apos;accéder à un ou plusieurs modules pendant
          une période définie, sans paiement. Un même code peut couvrir plusieurs modules tout en étant réservé à{" "}
          <strong>un seul étudiant</strong>.
        </p>
      </header>

      {loadError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-semibold text-red-300">
          {loadError}
        </div>
      ) : (
        <AdminAccessCodes courses={courses} loadingCourses={loading} />
      )}
    </main>
  );
}
