import { usePlatformNavigation, usePlatformSession } from "./platform-app-slices";
import { PERFORMANCE_ACADEMIQUE_ADDRESS } from "../utils/institution-location";

export function AppFooter() {
  const session = usePlatformSession();
  const navigation = usePlatformNavigation();
  const { role } = session;
  const { navigateTo, handleTeacherViewChange } = navigation;

  return (
    <footer className="shrink-0 border-t border-slate-800 bg-slate-950 py-10 px-4 sm:px-6 transition-colors">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-slate-100 font-extrabold text-sm">
            <img src="/performance-logo-e6657b8a.png" className="w-6 h-6 object-contain" alt="Performance Académique" />
            <span>Performance Académique</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Plateforme académique de formation, progression et réussite.
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">{PERFORMANCE_ACADEMIQUE_ADDRESS}</p>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Apprendre • Progresser • Réussir
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
              aria-label="Aller à la page à propos"
              onClick={() => navigateTo("about")}
              className="kbd-nav-focus block hover:text-white"
            >
              À propos
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
        © 2026 Performance Académique. Tous droits réservés.
      </div>
    </footer>
  );
}
