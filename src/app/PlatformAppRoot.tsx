import { Suspense } from "react";

import { LazyAuthScreen } from "../lazyViews";

import { PlatformAppProvider } from "./platform-app-context";

import { PlatformNotificationProvider } from "./platform-notification-context";

import { usePlatformApp } from "./usePlatformApp";

import { AuthenticatedPlatformLayout } from "./AuthenticatedPlatformLayout";

function PlatformLoadingScreen() {
  return (
    <div className="min-h-screen bg-[var(--pa-site-background)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-semibold">Chargement des données académiques...</p>
      </div>
    </div>
  );
}

function PlatformCatalogErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-[var(--pa-site-background)] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-emerald-500/30 bg-slate-950/80 p-8 text-center shadow-xl">
        <p className="text-emerald-300 text-sm font-black uppercase tracking-wider">Données académiques indisponibles</p>
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
