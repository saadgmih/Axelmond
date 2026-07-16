export default function PageNotFound({ isAuthenticated }: { isAuthenticated: boolean }) {
  const destination = isAuthenticated ? "/student/dashboard" : "/";
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#011713] p-6 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-emerald-300/20 bg-[#052820] p-10 text-center shadow-2xl">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">Erreur 404</p>
        <h1 className="mt-4 text-3xl font-black">Page introuvable</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          L’adresse demandée n’existe pas ou n’est plus disponible.
        </p>
        <a
          href={destination}
          className="mt-7 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
        >
          {isAuthenticated ? "Retour au tableau de bord" : "Retour à l’accueil"}
        </a>
      </section>
    </main>
  );
}
