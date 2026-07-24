import fs from "node:fs";
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

  it("uses six administrator steps and manages chapters without subdivisions", () => {
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

  it("keeps content management limited to modules and chapters", () => {
    const chaptersSource = fs.readFileSync("src/views/teacher/curriculum-steps/CurriculumChaptersStep.tsx", "utf8");
    const mediaSource = fs.readFileSync("src/views/teacher/curriculum-steps/CurriculumMediaStep.tsx", "utf8");
    const quizSource = fs.readFileSync("src/views/teacher/curriculum-steps/CurriculumQuizStep.tsx", "utf8");
    const curriculumHook = fs.readFileSync("src/hooks/useTeacherCurriculum.tsx", "utf8");

    expect(fs.existsSync("src/views/teacher/curriculum-steps/CurriculumOutlineStep.tsx")).toBe(false);
    expect(chaptersSource).not.toMatch(/Ajouter partie|sous-partie/i);
    expect(mediaSource).toMatch(/Chapitre cible/);
    expect(mediaSource).not.toMatch(/Section cible|managedSections\.map/);
    expect(quizSource).toMatch(/Chapitre de rattachement/);
    expect(quizSource).not.toMatch(/Section de rattachement|managedSections\.map/);
    expect(curriculumHook).toMatch(/const handleCreateChapter[\s\S]*const result = await api\.createChapter/);
    expect(curriculumHook).not.toMatch(/api\.createSection/);
    expect(curriculumHook).not.toMatch(
      /selectedPartieId|newSectionMode|uploadPartId|uploadSubpartId|quizPartId|quizSubpartId/,
    );
  });
});
