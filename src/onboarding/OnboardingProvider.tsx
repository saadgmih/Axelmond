import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "../api";
import { getOnboardingSteps, type OnboardingStep } from "./onboarding-config";
import {
  getOnboardingFlow,
  ONBOARDING_VERSION,
  type OnboardingSnapshot,
  type OnboardingStatus,
  type OnboardingUpdate,
} from "./onboarding-types";

interface StoredOnboardingState {
  status: OnboardingStatus;
  currentStep: number;
}

interface OnboardingContextValue {
  isOpen: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  next: () => void;
  previous: () => void;
  skip: () => void;
  quit: () => void;
  restart: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function storageKey(userId: string, flow: string) {
  return `pa_onboarding:${userId}:${flow}:v${ONBOARDING_VERSION}`;
}

function readStoredState(key: string): StoredOnboardingState | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    if (!parsed || typeof parsed.currentStep !== "number" || typeof parsed.status !== "string") return null;
    return parsed as StoredOnboardingState;
  } catch {
    return null;
  }
}

function storeState(key: string, state: StoredOnboardingState) {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // The server remains authoritative when browser storage is unavailable.
  }
}

function isTerminal(status: OnboardingStatus) {
  return status === "COMPLETED" || status === "DISMISSED";
}

export function OnboardingProvider({ userId, role, children }: { userId: string; role: string; children: ReactNode }) {
  const flow = getOnboardingFlow(role);
  const steps = useMemo(() => getOnboardingSteps(flow), [flow]);
  const key = useMemo(() => storageKey(userId, flow), [flow, userId]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const writeQueue = useRef<Promise<unknown>>(Promise.resolve());

  const clampStep = useCallback((step: number) => Math.min(Math.max(0, step), steps.length - 1), [steps.length]);

  const enqueue = useCallback((request: () => Promise<unknown>) => {
    writeQueue.current = writeQueue.current
      .catch(() => undefined)
      .then(request)
      .catch((error) => console.warn("[onboarding] Impossible de synchroniser l'état", error));
  }, []);

  const persist = useCallback(
    (update: OnboardingUpdate) => {
      storeState(key, update);
      enqueue(() => api.updateOnboarding(update));
    },
    [enqueue, key],
  );

  useEffect(() => {
    let active = true;
    setIsOpen(false);
    setCurrentStep(0);

    const openFromState = (state: StoredOnboardingState) => {
      if (!active || isTerminal(state.status)) return;
      const step = clampStep(state.currentStep);
      setCurrentStep(step);
      setIsOpen(true);
      if (state.status === "NOT_STARTED") {
        const started: OnboardingUpdate = { status: "IN_PROGRESS", currentStep: step };
        storeState(key, started);
        enqueue(() => api.updateOnboarding(started));
      }
    };

    const load = async () => {
      const local = readStoredState(key);
      try {
        const remote: OnboardingSnapshot = await api.getOnboarding();
        if (!active) return;

        if (!isTerminal(remote.status) && local && isTerminal(local.status)) {
          storeState(key, local);
          enqueue(() =>
            api.updateOnboarding({
              status: local.status as OnboardingUpdate["status"],
              currentStep: clampStep(local.currentStep),
            }),
          );
          return;
        }

        storeState(key, { status: remote.status, currentStep: remote.currentStep });
        if (remote.shouldAutoStart) openFromState(remote);
      } catch (error) {
        console.warn("[onboarding] Lecture du statut serveur indisponible", error);
        openFromState(local || { status: "NOT_STARTED", currentStep: 0 });
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [clampStep, enqueue, key]);

  const finish = useCallback(() => {
    const lastStep = Math.max(0, steps.length - 1);
    setCurrentStep(lastStep);
    setIsOpen(false);
    persist({ status: "COMPLETED", currentStep: lastStep });
  }, [persist, steps.length]);

  const next = useCallback(() => {
    if (currentStep >= steps.length - 1) {
      finish();
      return;
    }
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    persist({ status: "IN_PROGRESS", currentStep: nextStep });
  }, [currentStep, finish, persist, steps.length]);

  const previous = useCallback(() => {
    const previousStep = Math.max(0, currentStep - 1);
    setCurrentStep(previousStep);
    persist({ status: "IN_PROGRESS", currentStep: previousStep });
  }, [currentStep, persist]);

  const quit = useCallback(() => {
    setIsOpen(false);
    persist({ status: "DISMISSED", currentStep });
  }, [currentStep, persist]);

  const restart = useCallback(() => {
    const restarted: OnboardingUpdate = { status: "IN_PROGRESS", currentStep: 0 };
    storeState(key, restarted);
    setCurrentStep(0);
    setIsOpen(true);
    enqueue(() => api.restartOnboarding());
  }, [enqueue, key]);

  const value = useMemo<OnboardingContextValue>(
    () => ({ isOpen, currentStep, steps, next, previous, skip: next, quit, restart }),
    [currentStep, isOpen, next, previous, quit, restart, steps],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error("useOnboarding must be used within OnboardingProvider");
  return value;
}
