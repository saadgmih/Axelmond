import { Suspense, useRef } from "react";

import { LazyAuthScreen } from "../lazyViews";

import { INSTITUTIONAL_VIEWS } from "../navigation/platformPaths";

import { PlatformAppProvider } from "./platform-app-context";

import { PlatformNotificationProvider } from "./platform-notification-context";

import { usePlatformApp } from "./usePlatformApp";

import { AuthenticatedPlatformLayout } from "./AuthenticatedPlatformLayout";
import { OnboardingProvider } from "../onboarding/OnboardingProvider";

function PlatformLoadingScreen() {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#011713]"
      role="status"
      aria-label="Préparation de votre espace académique"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle at center, rgba(16, 185, 129, 0.13), transparent 25%)",
        }}
      />

      <div className="relative z-10 flex h-52 w-52 items-center justify-center">
        <div aria-hidden="true" className="absolute inset-4 rounded-full bg-emerald-400/10 blur-2xl" />
        <div aria-hidden="true" className="absolute inset-6 rounded-full border border-emerald-300/15" />
        <svg
          className="absolute inset-0 h-full w-full text-emerald-300"
          data-testid="session-refresh-spinner"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="0.16"
            strokeDasharray="0.6 1.2"
            opacity="0.34"
          />
          <path d="M12 2a10 10 0 0 1 8.66 5" stroke="currentColor" strokeWidth="0.55" strokeLinecap="round">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 12 12"
              to="360 12 12"
              dur="0.45s"
              repeatCount="1"
            />
          </path>
        </svg>
        <div className="relative h-28 w-28 overflow-hidden rounded-[1.7rem] border border-emerald-200/25 bg-[#042c25] p-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.48),0_0_24px_rgba(52,211,153,0.16)]">
          <img
            src="/performance-logo-e6657b8a.png"
            alt=""
            className="h-full w-full translate-y-2 rounded-[1.35rem] object-cover"
          />
        </div>
      </div>
    </div>
  );
}

function PlatformCatalogErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-emerald-500/30 bg-slate-950/80 p-8 text-center shadow-xl">
        <p className="text-emerald-300 text-sm font-black uppercase tracking-wider">
          Données académiques indisponibles
        </p>
        <p className="mt-4 text-slate-300 text-sm leading-relaxed">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

export function PlatformAppRoot() {
  const { session, catalog, navigation, live, bindings, ui, notifications } = usePlatformApp();
  const hasRenderedAuthenticatedApp = useRef(false);
  const isInstitutionalView = INSTITUTIONAL_VIEWS.has(navigation.currentView);
  const isInitialAuthenticatedDataLoading = Boolean(
    session.currentUser &&
    !hasRenderedAuthenticatedApp.current &&
    (session.isLoginDataLoading ||
      session.isInitialViewLoading ||
      (!isInstitutionalView && (catalog.isLoading || session.isEnrolledCatalogSyncing))),
  );

  if (session.isLoading || !session.isAuthReady || isInitialAuthenticatedDataLoading) {
    return <PlatformLoadingScreen />;
  }

  if (!session.currentUser) {
    return (
      <Suspense fallback={<PlatformLoadingScreen />}>
        <LazyAuthScreen onLoginSuccess={session.handleLoginSuccess} />
      </Suspense>
    );
  }

  if (!isInstitutionalView && session.catalogError && !session.catalogHasData) {
    return <PlatformCatalogErrorScreen message={session.catalogError} onRetry={session.retryCatalogLoad} />;
  }

  hasRenderedAuthenticatedApp.current = true;

  return (
    <PlatformNotificationProvider value={notifications}>
      <PlatformAppProvider
        session={session}
        catalog={catalog}
        navigation={navigation}
        live={live}
        bindings={bindings}
        ui={ui}
      >
        <OnboardingProvider userId={session.currentUser.id} role={session.currentUser.role}>
          <AuthenticatedPlatformLayout />
        </OnboardingProvider>
      </PlatformAppProvider>
    </PlatformNotificationProvider>
  );
}
