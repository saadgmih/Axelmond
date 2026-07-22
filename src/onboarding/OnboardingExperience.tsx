import { useEffect, useRef } from "react";
import { useSidebarLayout } from "../hooks/useSidebarLayout";
import { usePlatformNavigation, usePlatformSession, usePlatformUi } from "../app/platform-app-slices";
import { useOnboarding } from "./OnboardingProvider";
import { OnboardingTour } from "./OnboardingTour";

export function OnboardingExperience() {
  const onboarding = useOnboarding();
  const ui = usePlatformUi();
  const navigation = usePlatformNavigation();
  const session = usePlatformSession();
  const { isDrawer } = useSidebarLayout();
  const layoutSnapshot = useRef<{
    sidebar: boolean;
    mobileMenu: boolean;
    currentView: string;
    teacherView: string;
  } | null>(null);
  const wasOpen = useRef(false);
  const appliedStepId = useRef<string | null>(null);
  const step = onboarding.steps[onboarding.currentStep];

  useEffect(() => {
    if (onboarding.isOpen && !wasOpen.current) {
      layoutSnapshot.current = {
        sidebar: ui.isSidebarCollapsed,
        mobileMenu: ui.isMobileMenuOpen,
        currentView: navigation.currentView,
        teacherView: navigation.teacherView,
      };
    }
    if (!onboarding.isOpen && wasOpen.current && layoutSnapshot.current) {
      ui.setIsSidebarCollapsed(layoutSnapshot.current.sidebar);
      ui.setIsMobileMenuOpen(layoutSnapshot.current.mobileMenu);
      if (session.role === "teacher") {
        navigation.handleTeacherViewChange(layoutSnapshot.current.teacherView);
      } else {
        navigation.navigateTo(layoutSnapshot.current.currentView);
      }
      layoutSnapshot.current = null;
    }
    wasOpen.current = onboarding.isOpen;
  }, [navigation, onboarding.isOpen, session.role, ui]);

  useEffect(() => {
    if (!onboarding.isOpen || !step) {
      appliedStepId.current = null;
      return;
    }
    if (appliedStepId.current === step.id) return;
    appliedStepId.current = step.id;
    if (step.view) {
      if (session.role === "teacher") navigation.handleTeacherViewChange(step.view);
      else navigation.navigateTo(step.view);
    }
  }, [navigation, onboarding.isOpen, session.role, step]);

  useEffect(() => {
    if (!onboarding.isOpen || !step) return;
    if (step.requiresSidebar) {
      ui.setIsSidebarCollapsed(false);
      if (isDrawer) ui.setIsMobileMenuOpen(true);
    } else if (isDrawer) {
      ui.setIsMobileMenuOpen(false);
    }
  }, [isDrawer, onboarding.isOpen, step, ui]);

  if (!onboarding.isOpen || !step) return null;
  return (
    <OnboardingTour
      step={step}
      stepIndex={onboarding.currentStep}
      stepCount={onboarding.steps.length}
      onNext={onboarding.next}
      onPrevious={onboarding.previous}
      onSkip={onboarding.skip}
      onQuit={onboarding.quit}
    />
  );
}
