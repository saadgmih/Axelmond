/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { act } from "react";
import * as React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

if (typeof React.act !== "function") {
  (React as typeof React & { act: typeof act }).act = act;
}
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock the API client
vi.mock("../src/api", () => ({
  api: {
    chatTutor: vi.fn().mockResolvedValue({ text: "Réponse du tuteur" }),
  },
}));

// Mock LatexText since KaTeX rendering is slow and not needed for structure tests
vi.mock("../src/components/LazyLatexText", () => ({
  default: ({ value }: { value: string }) => <span data-testid="mock-latex">{value}</span>,
}));

import AITutorChat from "../src/components/AITutorChat";
import StudentCourseView from "../src/views/student/StudentCourseView";
import { Course, CourseModule } from "../src/types";

const mockCourse: Course = {
  id: 1,
  title: "Programmation C",
  level: "Débutant",
  credits: 4,
  instructor: "Ousman",
  published: true,
  createdAt: "2026-07-18",
  updatedAt: "2026-07-18",
  modules: [],
  isLiveNow: false,
};

const mockModule: CourseModule = {
  id: 10,
  courseId: 1,
  title: "Chapitre 1 : Introduction",
  type: "video",
  duration: "45m",
  completed: false,
  published: true,
  sectionId: "sec-1",
  attachmentUrl: "https://example.com/video.mp4",
};

describe("AITutorChat component behavior", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders welcome messages and suggestions", () => {
    render(
      <AITutorChat
        courseId={1}
        courseTitle="C"
        moduleTitle="Chapitre 1"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/Bonjour ! Je suis l'assistant académique/)).toBeInTheDocument();
    expect(screen.getByText("Suggestions de questions")).toBeInTheDocument();
  });

  it("closes the chat panel when the Escape key is pressed", () => {
    const handleClose = vi.fn();
    render(
      <AITutorChat
        courseId={1}
        courseTitle="C"
        moduleTitle="Chapitre 1"
        onClose={handleClose}
      />
    );

    fireEvent.keyDown(window, { key: "Escape", code: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe("StudentCourseView integration with AI Tutor", () => {
  beforeEach(() => {
    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query.includes("min-width: 1440px") ? false : true, // default to medium screen (mobile/tablet/laptop)
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

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the AI Tutor side-by-side or inside drawer based on screen width", async () => {
    const setShowAITutor = vi.fn();

    const { rerender } = render(
      <StudentCourseView
        selectedCourse={mockCourse}
        selectedModule={mockModule}
        courseContentSections={[]}
        moduleRootContents={[]}
        selectedLessonContent={null}
        showAITutor={true}
        hasAiTutorAccess={true}
        quizQuestions={null}
        quizAnswers={{}}
        quizSubmitted={false}
        quizScore={null}
        quizSubmitError=""
        moduleProgressPendingId={null}
        moduleProgressError=""
        navigateTo={vi.fn()}
        onModuleSelect={vi.fn()}
        setShowAITutor={setShowAITutor}
        markModuleCompleted={vi.fn()}
        handleQuizAnswerSelect={vi.fn()}
        handleQuizSubmit={vi.fn()}
        resetQuiz={vi.fn()}
      />
    );

    // AI Tutor should be rendered
    expect(screen.getByLabelText("Fermer le tuteur académique IA")).toBeInTheDocument();

    // Backdrop should exist since matchMedia returned medium/small screen
    expect(document.querySelector(".tutor-drawer-backdrop")).toBeInTheDocument();
    expect(document.querySelector(".tutor-layout-sidebar")).toBeInTheDocument();
  });

  it("locks background scroll on medium screen when tutor is open", () => {
    const setShowAITutor = vi.fn();

    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false, // medium/small screen
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { container } = render(
      <StudentCourseView
        selectedCourse={mockCourse}
        selectedModule={mockModule}
        courseContentSections={[]}
        moduleRootContents={[]}
        selectedLessonContent={null}
        showAITutor={true}
        hasAiTutorAccess={true}
        quizQuestions={null}
        quizAnswers={{}}
        quizSubmitted={false}
        quizScore={null}
        quizSubmitError=""
        moduleProgressPendingId={null}
        moduleProgressError=""
        navigateTo={vi.fn()}
        onModuleSelect={vi.fn()}
        setShowAITutor={setShowAITutor}
        markModuleCompleted={vi.fn()}
        handleQuizAnswerSelect={vi.fn()}
        handleQuizSubmit={vi.fn()}
        resetQuiz={vi.fn()}
      />
    );

    // Scroll should be locked
    const mainContentArea = container.querySelector(".flex-1.bg-white.flex");
    expect(mainContentArea).toHaveClass("overflow-hidden");
    expect(mainContentArea).not.toHaveClass("overflow-y-auto");
  });

  it("does not lock background scroll on large screen when tutor is open", () => {
    const setShowAITutor = vi.fn();

    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: true, // large screen
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { container } = render(
      <StudentCourseView
        selectedCourse={mockCourse}
        selectedModule={mockModule}
        courseContentSections={[]}
        moduleRootContents={[]}
        selectedLessonContent={null}
        showAITutor={true}
        hasAiTutorAccess={true}
        quizQuestions={null}
        quizAnswers={{}}
        quizSubmitted={false}
        quizScore={null}
        quizSubmitError=""
        moduleProgressPendingId={null}
        moduleProgressError=""
        navigateTo={vi.fn()}
        onModuleSelect={vi.fn()}
        setShowAITutor={setShowAITutor}
        markModuleCompleted={vi.fn()}
        handleQuizAnswerSelect={vi.fn()}
        handleQuizSubmit={vi.fn()}
        resetQuiz={vi.fn()}
      />
    );

    // Scroll should be active on large screen (overflow-y-auto, not overflow-hidden)
    const mainContentArea = container.querySelector(".flex-1.bg-white.flex");
    expect(mainContentArea).toHaveClass("overflow-y-auto");
    expect(mainContentArea).not.toHaveClass("overflow-hidden");
  });

  it("returns focus to the open button when tutor is closed", async () => {
    let showTutor = true;
    const setShowAITutor = vi.fn((val) => {
      showTutor = typeof val === "function" ? val(showTutor) : val;
    });

    const { rerender } = render(
      <StudentCourseView
        selectedCourse={mockCourse}
        selectedModule={mockModule}
        courseContentSections={[]}
        moduleRootContents={[]}
        selectedLessonContent={null}
        showAITutor={showTutor}
        hasAiTutorAccess={true}
        quizQuestions={null}
        quizAnswers={{}}
        quizSubmitted={false}
        quizScore={null}
        quizSubmitError=""
        moduleProgressPendingId={null}
        moduleProgressError=""
        navigateTo={vi.fn()}
        onModuleSelect={vi.fn()}
        setShowAITutor={setShowAITutor}
        markModuleCompleted={vi.fn()}
        handleQuizAnswerSelect={vi.fn()}
        handleQuizSubmit={vi.fn()}
        resetQuiz={vi.fn()}
      />
    );

    const openButton = screen.getByRole("button", { name: "Masquer Tuteur IA" });
    expect(openButton).toBeInTheDocument();

    // Rerender with tutor closed (simulating close)
    rerender(
      <StudentCourseView
        selectedCourse={mockCourse}
        selectedModule={mockModule}
        courseContentSections={[]}
        moduleRootContents={[]}
        selectedLessonContent={null}
        showAITutor={false}
        hasAiTutorAccess={true}
        quizQuestions={null}
        quizAnswers={{}}
        quizSubmitted={false}
        quizScore={null}
        quizSubmitError=""
        moduleProgressPendingId={null}
        moduleProgressError=""
        navigateTo={vi.fn()}
        onModuleSelect={vi.fn()}
        setShowAITutor={setShowAITutor}
        markModuleCompleted={vi.fn()}
        handleQuizAnswerSelect={vi.fn()}
        handleQuizSubmit={vi.fn()}
        resetQuiz={vi.fn()}
      />
    );

    // Wait and check if focus is back on the button
    await waitFor(() => {
      const closedButton = screen.getByRole("button", { name: "Ouvrir Tuteur IA" });
      expect(closedButton).toHaveFocus();
    });
  });
});
