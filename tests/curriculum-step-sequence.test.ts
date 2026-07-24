import { describe, expect, it } from "vitest";
import {
  ADMIN_CURRICULUM_STEPS,
  CURRICULUM_STEPS,
  getChaptersStep,
  getMediaStep,
  getQuizStep,
} from "../src/views/teacher/curriculum-theme";

describe("curriculum step sequence", () => {
  it("uses four teacher steps without a separate structure step", () => {
    expect(CURRICULUM_STEPS.map(({ step, label }) => ({ step, label }))).toEqual([
      { step: 1, label: "Modules" },
      { step: 2, label: "Chapitres" },
      { step: 3, label: "Médias" },
      { step: 4, label: "Quiz" },
    ]);
    expect(CURRICULUM_STEPS.some(({ label }) => label === "Structure" || label === "Syllabus")).toBe(false);
  });

  it("uses six administrator steps and keeps chapter structure inside chapters", () => {
    expect(ADMIN_CURRICULUM_STEPS.map(({ step, label }) => ({ step, label }))).toEqual([
      { step: 1, label: "Domaines" },
      { step: 2, label: "Sous-domaines" },
      { step: 3, label: "Modules" },
      { step: 4, label: "Chapitres" },
      { step: 5, label: "Médias" },
      { step: 6, label: "Quiz" },
    ]);
    expect(getChaptersStep(true)).toBe(4);
    expect(getMediaStep(true)).toBe(5);
    expect(getQuizStep(true)).toBe(6);
    expect(getChaptersStep(false)).toBe(2);
    expect(getMediaStep(false)).toBe(3);
    expect(getQuizStep(false)).toBe(4);
  });
});
