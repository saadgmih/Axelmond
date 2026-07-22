/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { act } from "react";
import * as React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SuccessCoachPanel, {
  buildSuccessCoachPlan,
  buildSuccessCoachSnapshot,
} from "../src/components/SuccessCoachPanel";
import StudentCourseView from "../src/views/student/StudentCourseView";
import type { Course, CourseModule } from "../src/types";

if (typeof React.act !== "function") {
  (React as typeof React & { act: typeof act }).act = act;
}
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const lessonModule: CourseModule = {
  id: 10,
  title: "Chapitre 1 : Introduction",
  type: "video",
  duration: "20 min",
  completed: false,
  published: true,
  sectionId: "sec-1",
};

const quizModule: CourseModule = {
  id: 11,
  title: "Examen blanc : fondamentaux",
  type: "quiz",
  duration: "15 min",
  completed: true,
  published: true,
  score: "1/4",
};

const mockCourse: Course = {
  id: 1,
  title: "Programmation C",
  level: "Débutant",
  credits: 4,
  duration: "4 semaines",
  category: "Informatique",
  disciplineId: 1,
  price: 120,
  iconName: "Code",
  color: "emerald",
  instructor: "Professeur Ousman",
  description: "Cours de programmation",
  progress: 50,
  modules: [lessonModule, quizModule],
  isLiveNow: false,
  published: true,
};

describe("Success Coach recommendations", () => {
  it("calculates readiness from real completion and quiz mastery", () => {
    const snapshot = buildSuccessCoachSnapshot(mockCourse);

    expect(snapshot.completionPercent).toBe(50);
    expect(snapshot.masteryPercent).toBe(25);
    expect(snapshot.readinessPercent).toBe(41);
  });

  it("prioritizes a low-scoring exam before an unfinished lesson", () => {
    const plan = buildSuccessCoachPlan(mockCourse);

    expect(plan[0].module.id).toBe(quizModule.id);
    expect(plan[0].priority).toBe("urgent");
    expect(plan.some((action) => action.module.id === lessonModule.id)).toBe(true);
  });

  it("opens an exam and closes with Escape", () => {
    const onClose = vi.fn();
    const onSelectModule = vi.fn();
    render(
      <SuccessCoachPanel
        course={mockCourse}
        selectedModuleId={lessonModule.id}
        onSelectModule={onSelectModule}
        onResetQuiz={vi.fn()}
        onClose={onClose}
      />,
    );

    expect(screen.getByLabelText("Coach de réussite")).toBeInTheDocument();
    expect(screen.getByText("41%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Examens" }));
    fireEvent.click(screen.getByRole("button", { name: "Recommencer l'examen" }));
    expect(onSelectModule).toHaveBeenCalledWith(quizModule);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape", code: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("StudentCourseView integration with Success Coach", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query.includes("min-width: 1440px") ? false : true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  const renderCourse = (showSuccessCoach: boolean, setShowSuccessCoach = vi.fn()) =>
    render(
      <StudentCourseView
        selectedCourse={mockCourse}
        selectedModule={lessonModule}
        courseContentSections={[]}
        moduleRootContents={[]}
        selectedLessonContent={null}
        showSuccessCoach={showSuccessCoach}
        quizQuestions={null}
        quizAnswers={{}}
        quizSubmitted={false}
        quizScore={null}
        quizSubmitError=""
        moduleProgressPendingId={null}
        moduleProgressError=""
        navigateTo={vi.fn()}
        onModuleSelect={vi.fn()}
        setShowSuccessCoach={setShowSuccessCoach}
        markModuleCompleted={vi.fn()}
        handleQuizAnswerSelect={vi.fn()}
        handleQuizSubmit={vi.fn()}
        resetQuiz={vi.fn()}
      />,
    );

  it("renders the coach in a responsive drawer", () => {
    renderCourse(true);

    expect(screen.getByLabelText("Fermer le coach de réussite")).toBeInTheDocument();
    expect(document.querySelector(".success-coach-drawer-backdrop")).toBeInTheDocument();
    expect(document.querySelector(".success-coach-layout-sidebar")).toBeInTheDocument();
  });

  it("locks background scrolling on smaller screens while the coach is open", () => {
    const { container } = renderCourse(true);
    const mainContentArea = container.querySelector(".flex-1.bg-white.flex");

    expect(mainContentArea).toHaveClass("overflow-hidden");
    expect(mainContentArea).not.toHaveClass("overflow-y-auto");
  });

  it("keeps background scrolling available on large screens", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes("min-width: 1440px"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const { container } = renderCourse(true);
    const mainContentArea = container.querySelector(".flex-1.bg-white.flex");

    expect(mainContentArea).toHaveClass("overflow-y-auto");
    expect(mainContentArea).not.toHaveClass("overflow-hidden");
  });

  it("returns focus to the plan button when the coach closes", async () => {
    const setShowSuccessCoach = vi.fn();
    const { rerender } = renderCourse(true, setShowSuccessCoach);
    expect(screen.getByRole("button", { name: "Masquer mon coach" })).toBeInTheDocument();

    rerender(
      <StudentCourseView
        selectedCourse={mockCourse}
        selectedModule={lessonModule}
        courseContentSections={[]}
        moduleRootContents={[]}
        selectedLessonContent={null}
        showSuccessCoach={false}
        quizQuestions={null}
        quizAnswers={{}}
        quizSubmitted={false}
        quizScore={null}
        quizSubmitError=""
        moduleProgressPendingId={null}
        moduleProgressError=""
        navigateTo={vi.fn()}
        onModuleSelect={vi.fn()}
        setShowSuccessCoach={setShowSuccessCoach}
        markModuleCompleted={vi.fn()}
        handleQuizAnswerSelect={vi.fn()}
        handleQuizSubmit={vi.fn()}
        resetQuiz={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "Mon plan de réussite" })).toHaveFocus());
  });
});
