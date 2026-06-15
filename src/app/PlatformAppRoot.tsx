import AuthScreen from "../components/AuthScreen";
import { PlatformAppProvider } from "./platform-app-context";
import { usePlatformApp } from "./usePlatformApp";
import { AuthenticatedPlatformLayout } from "./AuthenticatedPlatformLayout";

function PlatformLoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-semibold">Chargement des données académiques...</p>
      </div>
    </div>
  );
}

export function PlatformAppRoot() {
  const platform = usePlatformApp();

  if (platform.isLoading || !platform.isAuthReady) {
    return <PlatformLoadingScreen />;
  }

  if (!platform.currentUser) {
    return <AuthScreen onLoginSuccess={platform.handleLoginSuccess} />;
  }

  return (
    <PlatformAppProvider value={platform}>
      <AuthenticatedPlatformLayout />
    </PlatformAppProvider>
  );
}
