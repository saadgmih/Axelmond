/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { act } from "react";
import * as React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AccessibilityControls from "../src/components/AccessibilityControls";
import { AccessibilityPreferencesProvider } from "../src/hooks/useAccessibilityPreferences";

if (typeof React.act !== "function") {
  (React as typeof React & { act: typeof act }).act = act;
}
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

describe("AccessibilityControls", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function renderControls(props = {}) {
    return render(
      <AccessibilityPreferencesProvider>
        <AccessibilityControls {...props} />
      </AccessibilityPreferencesProvider>,
    );
  }

  it("organizes preferences, shortcuts and keyboard help into distinct sections", async () => {
    renderControls({ onRestartTutorial: vi.fn(), onOpenNotifications: vi.fn(), notificationUnreadCount: 3 });
    fireEvent.click(screen.getByRole("button", { name: "Options d'accessibilité" }));

    expect(await screen.findByRole("dialog", { name: "Accessibilité" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Préférences visuelles" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Accès rapides" })).toBeInTheDocument();
    expect(screen.getByLabelText("Aide à la navigation clavier")).toBeInTheDocument();
    expect(screen.getByLabelText("Aide - Relancer le tutoriel interactif")).toBeInTheDocument();
    expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("exposes both visual preferences as persistent switches", async () => {
    renderControls();
    fireEvent.click(screen.getByRole("button", { name: "Options d'accessibilité" }));

    const contrastSwitch = await screen.findByRole("switch", { name: /Contraste élevé/ });
    const motionSwitch = screen.getByRole("switch", { name: /Réduire les animations/ });
    expect(contrastSwitch).toHaveAttribute("aria-checked", "false");
    expect(motionSwitch).toHaveAttribute("aria-checked", "false");

    fireEvent.click(contrastSwitch);
    fireEvent.click(motionSwitch);
    expect(contrastSwitch).toHaveAttribute("aria-checked", "true");
    expect(motionSwitch).toHaveAttribute("aria-checked", "true");
    await waitFor(() => {
      expect(document.documentElement).toHaveClass("a11y-high-contrast", "a11y-reduce-motion");
    });
    expect(JSON.parse(localStorage.getItem("axelmond-a11y-preferences") ?? "{}")).toEqual({
      highContrast: true,
      reduceMotion: true,
    });
  });

  it("closes with Escape and restores focus to its trigger", async () => {
    renderControls();
    const trigger = screen.getByRole("button", { name: "Options d'accessibilité" });
    fireEvent.click(trigger);
    await screen.findByRole("dialog", { name: "Accessibilité" });

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Accessibilité" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
