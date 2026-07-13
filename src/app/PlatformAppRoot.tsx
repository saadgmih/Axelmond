import { Suspense } from "react";

import { LazyAuthScreen } from "../lazyViews";

import { PlatformAppProvider } from "./platform-app-context";

import { PlatformNotificationProvider } from "./platform-notification-context";

import { usePlatformApp } from "./usePlatformApp";

import { AuthenticatedPlatformLayout } from "./AuthenticatedPlatformLayout";

function PlatformLoadingScreen() {
  return (
    <div
      className="flex min-h-screen overflow-hidden bg-slate-950"
      role="status"
      aria-label="Restauration de la session"
    >
      <aside className="hidden w-80 shrink-0 border-r border-emerald-900/40 bg-emerald-950/50 p-6 md:block">
        <div className="h-14 w-56 animate-pulse rounded-2xl bg-emerald-800/35" />
        <div className="mt-16 space-y-5">
          <div className="h-11 animate-pulse rounded-xl bg-emerald-800/25" />
          <div className="h-11 animate-pulse rounded-xl bg-emerald-900/35" />
          <div className="h-11 animate-pulse rounded-xl bg-emerald-900/35" />
          <div className="h-11 animate-pulse rounded-xl bg-emerald-900/35" />
          <div className="h-11 animate-pulse rounded-xl bg-emerald-900/35" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="h-24 border-b border-emerald-900/30 bg-emerald-950/30 px-6 py-5">
          <div className="h-5 w-48 animate-pulse rounded-full bg-emerald-800/35" />
          <div className="mt-3 h-3 w-72 max-w-full animate-pulse rounded-full bg-emerald-900/40" />
        </header>
        <main className="flex-1 p-6 sm:p-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="h-40 animate-pulse rounded-3xl border border-emerald-900/40 bg-emerald-950/30" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="h-44 animate-pulse rounded-2xl bg-emerald-950/30" />
              <div className="h-44 animate-pulse rounded-2xl bg-emerald-950/30" />
              <div className="h-44 animate-pulse rounded-2xl bg-emerald-950/30" />
            </div>
          </div>
        </main>
        <div className="fixed inset-x-0 bottom-8 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border border-emerald-700/30 bg-slate-950/90 px-5 py-3 shadow-xl">
            <svg
              className="h-5 w-5 text-emerald-400"
              data-testid="session-refresh-spinner"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
              <path
                d="M12 3a9 9 0 0 1 9 9"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 12 12"
                  to="360 12 12"
                  dur="0.7s"
                  repeatCount="indefinite"
                />
              </path>
            </svg>
            <span className="text-sm font-semibold text-emerald-200">Restauration de votre session...</span>
          </div>
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

  if (session.isLoading || !session.isAuthReady) {
    return <PlatformLoadingScreen />;
  }

  if (!session.currentUser) {
    return (
      <Suspense fallback={<PlatformLoadingScreen />}>
        <LazyAuthScreen onLoginSuccess={session.handleLoginSuccess} />
      </Suspense>
    );
  }

  if (session.catalogError && !session.catalogHasData) {
    return <PlatformCatalogErrorScreen message={session.catalogError} onRetry={session.retryCatalogLoad} />;
  }

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
        <AuthenticatedPlatformLayout />
      </PlatformAppProvider>
    </PlatformNotificationProvider>
  );
}
