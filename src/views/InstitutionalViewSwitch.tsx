import ContactView from "../components/ContactView";
import SupportView from "../components/SupportView";
import AboutView from "../components/AboutView";
import PrivacyView from "../components/PrivacyView";
import TermsView from "../components/TermsView";
import CookiesView from "../components/CookiesView";
import LegalView from "../components/LegalView";
import ResearchView from "../components/ResearchView";
import PublicationsView from "../components/PublicationsView";
import type { AppUser } from "../components/AuthScreen";
import type { Course } from "../types";

type NavigateTo = (view: string, targetCourse?: Course | null) => void;

interface InstitutionalViewSwitchProps {
  currentView: string;
  currentUser: AppUser;
  navigateTo: NavigateTo;
}

export default function InstitutionalViewSwitch({ currentView, currentUser, navigateTo }: InstitutionalViewSwitchProps) {
  if (currentView === "contact") return <ContactView currentUser={currentUser} navigateTo={navigateTo} />;
  if (currentView === "support") return <SupportView currentUser={currentUser} navigateTo={navigateTo} />;
  if (currentView === "about") return <AboutView />;
  if (currentView === "privacy") return <PrivacyView />;
  if (currentView === "terms") return <TermsView />;
  if (currentView === "cookies") return <CookiesView />;
  if (currentView === "legal") return <LegalView />;
  if (currentView === "research") return <ResearchView />;
  if (currentView === "publications") return <PublicationsView />;
  return (
    <div className="mx-auto max-w-xl p-8 text-center text-slate-300">
      <p className="text-sm font-semibold">Page introuvable.</p>
      <button type="button" onClick={() => navigateTo("dashboard")} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">
        Retour à l&apos;accueil
      </button>
    </div>
  );
}
