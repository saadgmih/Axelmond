import { scrollToSupportReportForm } from "../components/SupportView";
import { usePlatformNavigation } from "./platform-app-slices";
import { usePlatformSession } from "./platform-app-slices";

export function AppFooter() {
  const session = usePlatformSession();
  const navigation = usePlatformNavigation();
  const { role, currentView } = { role: session.role, currentView: navigation.currentView };
  const { navigateTo, handleTeacherViewChange } = navigation;

  return (
    <footer className="shrink-0 border-t border-slate-800 bg-slate-950 py-10 px-4 sm:px-6 transition-colors">