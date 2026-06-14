import { scrollToSupportReportForm } from "../components/SupportView";
import { usePlatformAppContext } from "./platform-app-context";

export function AppFooter() {
  const platform = usePlatformAppContext();
  const { role, navigateTo, handleTeacherViewChange, currentView } = platform;

  return (
    <footer className="shrink-0 border-t border-slate-800 bg-slate-950 py-10 px-4 sm:px-6 transition-colors">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-slate-100 font-extrabold text-sm">
            <img src="/logo.png" className="w-6 h-6 object-contain" alt="Axelmond Research Labs" />
            <span>Axelmond Research Labs</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Plateforme Académique de Recherche, Formation et Innovation.
          </p>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Research • Innovation • Education
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-black text-slate-200 uppercase tracking-widest">Navigation</h4>
          <div className="space-y-2 text-xs text-slate-400">
            <button
              type="button"
              aria-label="Aller à l'accueil"
              onClick={() => {
                if (role === "student") navigateTo("dashboard");
                else handleTeacherViewChange("dashboard");
              }}
              className="kbd-nav-focus block hover:text-white"
            >
              Accueil
            </button>
            <button
              type="button"
              aria-label="Aller au catalogue"
              onClick={() => {
                if (role === "student") navigateTo("catalog");
                else handleTeacherViewChange("curriculum");
              }}
              className="kbd-nav-focus block hover:text-white"
            >
              Catalogue
            </button>
            <button
              type="button"
              aria-label="Aller à la recherche"
              onClick={() => navigateTo("research")}
              className="kbd-nav-focus block hover:text-white"
            >
              Recherche
            </button>
            <button
              type="button"
              aria-label="Aller aux publications"
              onClick={() => navigateTo("publications")}
              className="kbd-nav-focus block hover:text-white"
            >
              Publications
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-black text-slate-200 uppercase tracking-widest">Support</h4>
          <div className="space-y-2 text-xs text-slate-400">
            <button
              type="button"
              aria-label="Aller au centre d'aide"
              onClick={() => navigateTo("support")}
              className="kbd-nav-focus block hover:text-white"
            >
              Centre d'aide
            </button>
            <button
              type="button"
              aria-label="Aller à la page contact"
              onClick={() => navigateTo("contact")}
              className="kbd-nav-focus block hover:text-white"
            >
              Contact
            </button>
            <button
              type="button"
              aria-label="Signaler un problème"
              onClick={() => {
                if (currentView !== "support") {
                  navigateTo("support");
                  window.history.replaceState(null, "", "/support#report");
                } else {
                  window.history.replaceState(null, "", "/support#report");
                  scrollToSupportReportForm();
                }
              }}
              className="kbd-nav-focus block hover:text-white"
            >
              Signaler un problème
            </button>
            <button
              type="button"
              aria-label="Aller à la page à propos"
              onClick={() => navigateTo("about")}
              className="kbd-nav-focus block hover:text-white"
            >
              À propos
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-black text-slate-200 uppercase tracking-widest">Légal</h4>
          <div className="space-y-2 text-xs text-slate-400">
            <button
              type="button"
              aria-label="Politique de confidentialité"
              onClick={() => navigateTo("privacy")}
              className="kbd-nav-focus block hover:text-white"
            >
              Politique de confidentialité
            </button>
            <button
              type="button"
              aria-label="Conditions d'utilisation"
              onClick={() => navigateTo("terms")}
              className="kbd-nav-focus block hover:text-white"
            >
              Conditions d'utilisation
            </button>
            <button
              type="button"
              aria-label="Politique des cookies"
              onClick={() => navigateTo("cookies")}
              className="kbd-nav-focus block hover:text-white"
            >
              Politique des cookies
            </button>
            <button
              type="button"
              aria-label="Mentions légales"
              onClick={() => navigateTo("legal")}
              className="kbd-nav-focus block hover:text-white"
            >
              Mentions légales
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto border-t border-slate-800 mt-8 pt-5 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
        © 2026 Axelmond Research Labs. Tous droits réservés.
      </div>
    </footer>
  );
}
