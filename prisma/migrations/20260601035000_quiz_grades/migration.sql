CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "courseId" INTEGER NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "answer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "courseId" INTEGER NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "scoreOutOf20" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuizAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT,
    "selectedAnswer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,

    CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Quiz_courseId_moduleId_key" ON "Quiz"("courseId", "moduleId");
CREATE INDEX "Quiz_courseId_idx" ON "Quiz"("courseId");
CREATE INDEX "QuizQuestion_quizId_order_idx" ON "QuizQuestion"("quizId", "order");
CREATE INDEX "QuizAttempt_courseId_userId_createdAt_idx" ON "QuizAttempt"("courseId", "userId", "createdAt");
CREATE INDEX "QuizAttempt_quizId_userId_createdAt_idx" ON "QuizAttempt"("quizId", "userId", "createdAt");
CREATE INDEX "QuizAnswer_attemptId_idx" ON "QuizAnswer"("attemptId");

ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
