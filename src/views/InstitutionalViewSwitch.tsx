import { Suspense, type ReactNode } from "react";
import type { AppUser } from "../components/AuthScreen";
import type { Course } from "../types";
import {
  LazyAboutView,
  LazyContactView,
  LazyCookiesView,
  LazyLegalView,
  LazyPrivacyView,
  LazySupportView,
  LazyTermsView,
  RouteChunkFallback,
} from "../lazyViews";

type NavigateTo = (view: string, targetCourse?: Course | null) => void;

interface InstitutionalViewSwitchProps {
  currentView: string;
  currentUser?: AppUser;
  navigateTo: NavigateTo;
}

function withInstitutionalSuspense(label: string, node: ReactNode) {
  return <Suspense fallback={<RouteChunkFallback label={label} />}>{node}</Suspense>;
}

export default function InstitutionalViewSwitch({
  currentView,
  currentUser,
  navigateTo,
}: InstitutionalViewSwitchProps) {
  if (currentView === "contact") {
    return withInstitutionalSuspense(
      "Chargement du contact…",
      <LazyContactView currentUser={currentUser} navigateTo={navigateTo} />,
    );
  }
  if (currentView === "support") {
    return withInstitutionalSuspense("Chargement du support…", <LazySupportView navigateTo={navigateTo} />);
  }
  if (currentView === "about") return withInstitutionalSuspense("Chargement…", <LazyAboutView />);
  if (currentView === "privacy") return withInstitutionalSuspense("Chargement…", <LazyPrivacyView />);
  if (currentView === "terms") return withInstitutionalSuspense("Chargement…", <LazyTermsView />);
  if (currentView === "cookies") return withInstitutionalSuspense("Chargement…", <LazyCookiesView />);
  if (currentView === "legal") return withInstitutionalSuspense("Chargement…", <LazyLegalView />);
  return (
    <div className="mx-auto max-w-xl p-8 text-center text-slate-300">
      <p className="text-sm font-semibold">Page introuvable.</p>
      <button
        type="button"
        onClick={() => navigateTo("dashboard")}
        className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
      >
        Retour à l&apos;accueil
      </button>
    </div>
  );
}
