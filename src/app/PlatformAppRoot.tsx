import { Suspense, useRef } from "react";

import { LazyAuthScreen } from "../lazyViews";

import { PlatformAppProvider } from "./platform-app-context";

import { PlatformNotificationProvider } from "./platform-notification-context";

import { usePlatformApp } from "./usePlatformApp";

import { AuthenticatedPlatformLayout } from "./AuthenticatedPlatformLayout";

function PlatformLoadingScreen() {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#011713] px-5 py-10 text-white"
      role="status"
      aria-label="Préparation de votre espace académique"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 35%, rgba(16, 185, 129, 0.18), transparent 28%), radial-gradient(circle at 8% 12%, rgba(45, 212, 191, 0.09), transparent 25%), radial-gradient(circle at 92% 88%, rgba(16, 185, 129, 0.08), transparent 24%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(110, 231, 183, 0.32) 1px, transparent 1px), linear-gradient(90deg, rgba(110, 231, 183, 0.32) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(circle at center, black, transparent 72%)",
        }}
      />

      <div aria-hidden="true" className="absolute left-7 top-7 hidden items-center gap-3 sm:flex">
        <span className="h-px w-10 bg-emerald-400/55" />
        <span className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-200/50">
          Portail académique
        </span>
      </div>
      <div aria-hidden="true" className="absolute bottom-7 right-7 hidden items-center gap-3 sm:flex">
        <span className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-200/40">
          Apprendre · Progresser · Réussir
        </span>
        <span className="h-px w-10 bg-emerald-400/45" />
      </div>

      <main className="relative z-10 w-full max-w-[34rem] text-center">
        <section className="relative overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-[#03241e]/80 px-6 py-8 shadow-[0_28px_100px_rgba(0,0,0,0.48),0_0_70px_rgba(16,185,129,0.08)] backdrop-blur-xl sm:px-12 sm:py-10">
          <div
            aria-hidden="true"
            className="absolute inset-x-14 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent"
          />
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-20 h-52 w-52 rounded-full border border-emerald-300/10"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-24 -left-24 h-60 w-60 rounded-full border border-emerald-300/10"
          />

          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-emerald-300/70 sm:text-[11px]">
            Performance Académique
          </p>

          <div className="relative mx-auto mt-6 flex h-40 w-40 items-center justify-center sm:h-44 sm:w-44">
            <div aria-hidden="true" className="absolute inset-3 rounded-full bg-emerald-400/10 blur-2xl" />
            <div aria-hidden="true" className="absolute inset-5 rounded-full border border-emerald-300/15" />
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
            <div className="relative h-24 w-24 overflow-hidden rounded-[1.7rem] border border-emerald-200/25 bg-[#042c25] p-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.48),0_0_24px_rgba(52,211,153,0.16)] sm:h-28 sm:w-28">
              <img
                src="/performance-logo-e6657b8a.png"
                alt=""
                className="h-full w-full rounded-[1.35rem] object-cover"
              />
            </div>
            <span
              aria-hidden="true"
              className="absolute right-[0.48rem] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-[#03241e] bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.95)]"
            />
          </div>

          <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
            L’excellence est en mouvement
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-emerald-100/65 sm:text-base">
            Préparation de votre espace académique personnalisé.
          </p>

          <div aria-hidden="true" className="mx-auto mt-7 flex max-w-xs items-center gap-2">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-emerald-300/35" />
            <span className="h-1.5 w-1.5 rotate-45 border border-emerald-300/70 bg-emerald-400/20" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-emerald-300/35" />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-200/45 sm:text-[10px]">
            <span>Session sécurisée</span>
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-emerald-400/50" />
            <span>Données synchronisées</span>
          </div>
        </section>

        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.32em] text-emerald-200/35">
          Une expérience pensée pour votre réussite
        </p>
      </main>
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
  const isInitialAuthenticatedDataLoading = Boolean(
    session.currentUser &&
    !hasRenderedAuthenticatedApp.current &&
    (catalog.isLoading ||
      session.isLoginDataLoading ||
      session.isEnrolledCatalogSyncing ||
      session.isInitialViewLoading),
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

  if (session.catalogError && !session.catalogHasData) {
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
        <AuthenticatedPlatformLayout />
      </PlatformAppProvider>
    </PlatformNotificationProvider>
  );
}
