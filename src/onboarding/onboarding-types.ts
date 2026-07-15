export const ONBOARDING_VERSION = 1;

export type OnboardingFlow = "STUDENT" | "TEACHER" | "ADMIN";
export type OnboardingStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "DISMISSED";

export interface OnboardingSnapshot {
  flow: OnboardingFlow;
  version: number;
  status: OnboardingStatus;
  currentStep: number;
  completedAt: string | null;
  dismissedAt: string | null;
  shouldAutoStart: boolean;
}

export interface OnboardingUpdate {
  status: Exclude<OnboardingStatus, "NOT_STARTED">;
  currentStep: number;
}

export function getOnboardingFlow(role: unknown): OnboardingFlow {
  if (role === "ADMIN" || role === "admin") return "ADMIN";
  if (role === "STUDENT" || role === "student") return "STUDENT";
  return "TEACHER";
}
