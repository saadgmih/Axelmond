/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { act } from "react";
import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Sidebar from "../src/components/Sidebar";
import type { AppUser } from "../src/shared/app-user";
import { AccessibilityPreferencesProvider } from "../src/hooks/useAccessibilityPreferences";
import { UserProfileViewerProvider } from "../src/components/UserProfileViewer";

if (typeof React.act !== "function") {
  (React as typeof React & { act: typeof act }).act = act;
}
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
});

vi.mock("../src/hooks/useSidebarLayout", () => ({
  useSidebarLayout: () => ({ isDocked: true, isDrawer: false }),
}));

vi.mock("../src/hooks/useSidebarConversations", () => ({
  useSidebarConversations: () => [],
}));

vi.mock("../src/hooks/useTvNavigation", () => ({
  useTvNavigation: () => undefined,
}));

const baseUser: AppUser = {
  id: "user-1",
  email: "utilisateur@example.test",
  fullName: "Utilisateur Test",
  role: "STUDENT",
  emailVerified: true,
  levelOrTitle: "Licence",
  enrolledCourses: [],
  invoices: [],
};

function renderSidebar(role: "student" | "teacher", currentUser: AppUser) {
  return render(
    <AccessibilityPreferencesProvider>
      <UserProfileViewerProvider>
        <Sidebar
          currentView="dashboard"
          isMobileMenuOpen={false}
          setIsMobileMenuOpen={vi.fn()}
          navigateTo={vi.fn()}
          role={role}
          teacherView="dashboard"
          setTeacherView={vi.fn()}
          currentUser={currentUser}
          onLogout={vi.fn()}
        />
      </UserProfileViewerProvider>
    </AccessibilityPreferencesProvider>,
  );
}

afterEach(() => cleanup());

describe("Sidebar authenticated identity", () => {
  it("shows the student only in the current-user footer", () => {
    renderSidebar("student", baseUser);

    expect(screen.getByText("Utilisateur actuel")).toBeInTheDocument();
    expect(screen.getByText("Accès étudiant")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Consulter le profil de Utilisateur Test" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Options d'accessibilité" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Préférences" }));
    expect(screen.getByRole("button", { name: "Options d'accessibilité" })).toHaveTextContent("Paramètres");
    expect(screen.queryByText("Rôle authentifié")).not.toBeInTheDocument();
    expect(screen.queryByText(/\bPA\b/)).not.toBeInTheDocument();
  });

  it("keeps every section private until its category is opened and only expands one at a time", () => {
    renderSidebar("student", baseUser);

    expect(screen.getByRole("button", { name: "Études" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Mon compte" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Communication" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Préférences" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Catalogue des Modules")).not.toBeInTheDocument();
    expect(screen.queryByText("Mon Profil Étudiant")).not.toBeInTheDocument();
    expect(screen.queryByText("Messages")).not.toBeInTheDocument();
    expect(screen.queryByText("Paramètres")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Études" }));
    expect(screen.getByText("Catalogue des Modules")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Études" })).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "Mon compte" }));
    expect(screen.getByText("Mon Profil Étudiant")).toBeInTheDocument();
    expect(screen.queryByText("Catalogue des Modules")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Études" })).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(screen.getByRole("button", { name: "Communication" }));
    expect(screen.getByText("Messages")).toBeInTheDocument();
    expect(screen.queryByText("Mon Profil Étudiant")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Préférences" }));
    expect(screen.getByText("Paramètres")).toBeInTheDocument();
    expect(screen.queryByText("Messages")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Préférences" }));
    expect(screen.queryByText("Paramètres")).not.toBeInTheDocument();
  });

  it("shows the professor only in the current-user footer", () => {
    renderSidebar("teacher", {
      ...baseUser,
      role: "PROFESSOR",
      levelOrTitle: "Maître de conférences",
    });

    expect(screen.getByText("Accès professeur")).toBeInTheDocument();
    expect(screen.queryByText("Rôle authentifié")).not.toBeInTheDocument();
    expect(screen.queryByText("Maître de conférences")).not.toBeInTheDocument();
  });
});
