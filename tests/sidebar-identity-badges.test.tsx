/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { act } from "react";
import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Sidebar from "../src/components/Sidebar";
import type { AppUser } from "../src/shared/app-user";
import type { Course } from "../src/types";

if (typeof React.act !== "function") {
  (React as typeof React & { act: typeof act }).act = act;
}
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const courses = [
  { id: 1, credits: 5 },
  { id: 2, credits: 10 },
] as Course[];

function renderSidebar(role: "student" | "teacher", currentUser: AppUser, enrolledCourses: number[] = []) {
  return render(
    <Sidebar
      currentView="dashboard"
      enrolledCourses={enrolledCourses}
      isMobileMenuOpen={false}
      courses={courses}
      setIsMobileMenuOpen={vi.fn()}
      navigateTo={vi.fn()}
      role={role}
      teacherView="dashboard"
      setTeacherView={vi.fn()}
      currentUser={currentUser}
      onLogout={vi.fn()}
    />,
  );
}

afterEach(() => cleanup());

describe("Sidebar authenticated identity badges", () => {
  it("shows the student role and enrolled academic points together", () => {
    renderSidebar("student", baseUser, [1, 2]);

    const badgeGroup = screen.getByTestId("sidebar-identity-badges");
    expect(badgeGroup).toHaveTextContent("Étudiant");
    expect(badgeGroup).toHaveTextContent("15 PA");
    expect(screen.getByLabelText("15 PA de progression académique")).toBeInTheDocument();
  });

  it("shows the professor role and academic title without student points", () => {
    renderSidebar("teacher", {
      ...baseUser,
      role: "PROFESSOR",
      levelOrTitle: "Maître de conférences",
    });

    const badgeGroup = screen.getByTestId("sidebar-identity-badges");
    expect(badgeGroup).toHaveTextContent("Professeur");
    expect(badgeGroup).toHaveTextContent("Maître de conférences");
    expect(screen.getByLabelText("Titre académique : Maître de conférences")).toBeInTheDocument();
    expect(badgeGroup).not.toHaveTextContent("PA");
  });
});
