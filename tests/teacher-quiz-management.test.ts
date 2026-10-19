import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("Teacher Quiz Management & QCM Validation", () => {
  const quizSource = fs.readFileSync("src/views/teacher/curriculum-steps/CurriculumQuizStep.tsx", "utf8");
  const curriculumHook = fs.readFileSync("src/hooks/useTeacherCurriculum.tsx", "utf8");

  it("provides direct 1-click correct choice toggle on each option card without hidden dropdowns", () => {
    expect(quizSource).toMatch(/toggleCorrectOption/);
    expect(quizSource).toMatch(/Bonne réponse ✓/);
    expect(quizSource).toMatch(/Définir comme bonne réponse/);
    expect(quizSource).not.toMatch(/isCorrectChoicesOpen/);
  });

  it("keeps didactic explanation always visible and prominent", () => {
    expect(quizSource).toMatch(/Explication didactique académique/);
    expect(quizSource).toMatch(/value=\{newQuestionExplanation\}/);
    expect(quizSource).toMatch(/Aperçu KaTeX de l'explication/);
  });

  it("does not close question creation form when validation or submission fails", () => {
    expect(quizSource).toMatch(/const ok = await handleAddQuestion\(e\);[\s\S]*if \(ok\) \{[\s\S]*setIsCreatingQcm\(false\);/);
    expect(curriculumHook).toMatch(/const handleAddQuestion = async \(e: FormEvent\): Promise<boolean>/);
  });

  it("supports student preview link from quiz studio", () => {
    expect(quizSource).toMatch(/Aperçu étudiant/);
    expect(quizSource).toMatch(/\/student\/course\?courseId=/);
  });

  it("exports and triggers loadSelectedQuizDetail on quiz interaction", () => {
    expect(curriculumHook).toMatch(/loadSelectedQuizDetail/);
    expect(quizSource).toMatch(/loadSelectedQuizDetail\?\.?\(/);
  });
});
