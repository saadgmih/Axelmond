import type { Express } from "express";
import { getAuthUser } from "../server/route-types";
import type { RouteContext } from "../server/route-context";
import * as api from "../server/route-deps";

export function registerQuizRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireRbac, validateBody } = ctx.middleware;

  // GET /api/courses/:courseId/quizzes/:moduleId

  app.get("/api/courses/:courseId/quizzes/:moduleId", requireAuth, async (req, res) => {
    const authUser = getAuthUser(req);

    const courseId = parseInt(req.params.courseId);
    const moduleId = parseInt(req.params.moduleId);

    if (!Number.isFinite(courseId) || !Number.isFinite(moduleId)) {
      res.status(400).json({ error: api.PUBLIC_API_ERRORS.quizNotFound });
      return;
    }

    const quiz = await api.prisma.quiz.findFirst({
      where: { courseId, moduleId },

      include: { questions: { orderBy: { order: "asc" } } },
    });

    if (quiz) {
      if (authUser.role === "STUDENT" && !authUser.enrolledCourses.includes(courseId)) {
        res.status(403).json({ error: "Inscription requise pour consulter ce quiz" });

        return;
      }

      if (authUser.role !== "STUDENT" && !(await api.verifyCourseAccess(authUser, courseId))) {
        res.status(403).json({ error: "Accès refusé pour consulter ce quiz" });

        return;
      }

      if (authUser.role === "STUDENT" && !quiz.published) {
        res.status(404).json({ error: api.PUBLIC_API_ERRORS.quizNotFound });

        return;
      }

      if (authUser.role === "STUDENT") {
        res.json(quiz.questions.map(({ answer, explanation, ...question }) => question));

        return;
      }

      res.json(
        quiz.questions.map((question) => ({
          id: question.id,

          question: question.question,

          options: question.options,

          answer: question.answer,

          explanation: question.explanation,
        })),
      );

      return;
    }

    const data = api.quizzes[moduleId];

    if (!data) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.quizNotFound });
      return;
    }

    const seedCourseId = api.seedQuizModuleCourseMap[moduleId];

    if (!seedCourseId || seedCourseId !== courseId) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.quizNotFound });

      return;
    }

    if (authUser.role === "STUDENT" && !authUser.enrolledCourses.includes(seedCourseId)) {
      res.status(403).json({ error: "Inscription requise pour consulter ce quiz" });

      return;
    }

    if (authUser.role !== "STUDENT" && !(await api.verifyCourseAccess(authUser, seedCourseId))) {
      res.status(403).json({ error: "Accès refusé pour consulter ce quiz" });

      return;
    }

    if (authUser.role === "STUDENT") {
      res.json(data.map(({ answer, explanation, ...question }) => question));

      return;
    }

    res.json(data);
  });

  // POST /api/courses/:courseId/modules/:moduleId/quiz-attempts

  app.post("/api/courses/:courseId/modules/:moduleId/quiz-attempts", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);

    const courseId = parseInt(req.params.courseId);

    const moduleId = parseInt(req.params.moduleId);

    const answers = req.body?.answers;

    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      res.status(400).json({ error: api.PUBLIC_API_ERRORS.answersObjectRequired });

      return;
    }

    if (!authUser.enrolledCourses.includes(courseId)) {
      res.status(403).json({ error: "Inscription requise pour soumettre ce quiz" });

      return;
    }

    const course = await api.findCourse(courseId);

    if (!course) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.courseNotFound });
      return;
    }

    const module = course.modules.find((item) => item.id === moduleId && item.type === "quiz");

    if (!module) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.quizModuleNotFound });
      return;
    }

    const quiz = await api.findQuizWithQuestions(course.id, module.id);

    if (!quiz || quiz.questions.length === 0) {
      res.status(404).json({ error: "Aucun quiz n'est modélisé pour ce module" });

      return;
    }

    if (authUser.role === "STUDENT" && !quiz.published) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.quizNotFound });
      return;
    }

    let score = 0;

    const gradedAnswers = quiz.questions.map((question, index) => {
      const selectedAnswer = String(answers[question.id] ?? answers[index] ?? "").trim();

      const isCorrect = selectedAnswer === question.answer;

      if (isCorrect) score += 1;

      return { question, selectedAnswer, isCorrect };
    });

    const total = quiz.questions.length;

    const scoreOutOf20 = total ? Number(((score / total) * 20).toFixed(2)) : 0;

    const attempt = await api.prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,

        courseId: course.id,

        moduleId: module.id,

        userId: authUser.id,

        score,

        total,

        scoreOutOf20,

        answers: {
          create: gradedAnswers.map((answer) => ({
            questionId: answer.question.id,

            selectedAnswer: answer.selectedAnswer,

            isCorrect: answer.isCorrect,
          })),
        },
      },
    });

    await api.setStudentModuleCompletion({
      userId: authUser.id,
      courseId: course.id,
      module,
      completed: true,
    });

    api.logDb("INFO", "Quiz attempt recorded", {
      courseId: course.id,
      moduleId: module.id,
      userId: authUser.id,
      score,
      total,
      scoreOutOf20,
    });

    res.status(201).json({
      attemptId: attempt.id,

      score,

      total,

      scoreOutOf20,

      questions: gradedAnswers.map((answer) => ({
        id: answer.question.id,

        question: answer.question.question,

        answer: answer.question.answer,

        explanation: answer.question.explanation,

        selectedAnswer: answer.selectedAnswer,

        isCorrect: answer.isCorrect,
      })),
    });
  });

  // POST /api/quizzes/:quizId/attempts

  app.post("/api/quizzes/:quizId/attempts", requireAuth, validateBody(api.quizAttemptSchema), async (req, res) => {
    const authUser = getAuthUser(req);

    if (authUser.role !== "STUDENT") {
      res.status(403).json({ error: "Seuls les étudiants peuvent soumettre un quiz" });

      return;
    }

    const quiz = await api.prisma.quiz.findFirst({
      where: { id: req.params.quizId, published: true },

      include: { questions: { orderBy: { order: "asc" } } },
    });

    if (!quiz) {
      res.status(404).json({ error: "Quiz publié introuvable" });
      return;
    }

    if (!authUser.enrolledCourses.includes(quiz.courseId)) {
      res.status(403).json({ error: "Inscription requise pour soumettre ce quiz" });

      return;
    }

    if (quiz.questions.length === 0) {
      res.status(400).json({ error: "Ce quiz ne contient aucune question" });

      return;
    }

    let score = 0;

    const answers = req.body.answers as Record<string, string>;

    const gradedAnswers = quiz.questions.map((question, index) => {
      const selectedAnswer = String(answers[question.id] ?? answers[index] ?? "").trim();

      const isCorrect = selectedAnswer === question.answer;

      if (isCorrect) score += 1;

      return { question, selectedAnswer, isCorrect };
    });

    const total = quiz.questions.length;

    const scoreOutOf20 = Number(((score / total) * 20).toFixed(2));

    const attempt = await api.prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,

        courseId: quiz.courseId,

        moduleId: quiz.moduleId,

        userId: authUser.id,

        score,

        total,

        scoreOutOf20,

        answers: {
          create: gradedAnswers.map((answer) => ({
            questionId: answer.question.id,

            selectedAnswer: answer.selectedAnswer,

            isCorrect: answer.isCorrect,
          })),
        },
      },
    });

    if (quiz.moduleId) {
      const module = await api.prisma.courseModule.findUnique({
        where: { courseId_id: { courseId: quiz.courseId, id: quiz.moduleId } },
      });

      if (module) {
        await api.setStudentModuleCompletion({
          userId: authUser.id,
          courseId: quiz.courseId,
          module,
          completed: true,
        });
      }
    }

    api.logDb("INFO", "Flexible quiz attempt recorded", {
      quizId: quiz.id,
      courseId: quiz.courseId,
      userId: authUser.id,
      score,
      total,
      scoreOutOf20,
    });

    res.status(201).json({
      attemptId: attempt.id,

      score,

      total,

      scoreOutOf20,

      questions: gradedAnswers.map((answer) => ({
        id: answer.question.id,

        question: answer.question.question,

        answer: answer.question.answer,

        explanation: answer.question.explanation,

        selectedAnswer: answer.selectedAnswer,

        isCorrect: answer.isCorrect,
      })),
    });
  });

  // GET /api/quizzes/:quizId — détail d'un quiz (questions incluses)

  app.get("/api/quizzes/:quizId", requireAuth, async (req, res) => {
    const authUser = getAuthUser(req);

    if (!(await api.verifyQuizAccess(authUser, req.params.quizId))) {
      res.status(403).json({ error: "Accès refusé pour consulter ce quiz" });
      return;
    }

    const quiz = await api.prisma.quiz.findUnique({
      where: { id: req.params.quizId },
      include: {
        section: { select: { id: true, title: true, parentId: true, chapterId: true } },
        questions: { orderBy: { order: "asc" } },
      },
    });

    if (!quiz) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.quizNotFound });
      return;
    }

    if (authUser.role === "STUDENT" && !quiz.published) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.quizNotFound });
      return;
    }

    if (authUser.role === "STUDENT") {
      res.json({
        ...quiz,
        questions: quiz.questions.map(({ answer, explanation, ...question }) => question),
      });
      return;
    }

    res.json(quiz);
  });

  // GET /api/courses/:courseId/quizzes — liste les quiz du module

  app.get("/api/courses/:courseId/quizzes", requireAuth, async (req, res) => {
    const authUser = getAuthUser(req);

    const courseId = parseInt(req.params.courseId);

    const course = await api.prisma.course.findUnique({ where: { id: courseId } });

    if (!course) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.courseNotFound });
      return;
    }

    if (authUser.role === "STUDENT" && !authUser.enrolledCourses.includes(courseId)) {
      res.status(403).json({ error: "Inscription requise pour consulter ces quiz" });

      return;
    }

    if (authUser.role !== "STUDENT" && !(await api.verifyCourseAccess(authUser, courseId))) {
      res.status(403).json({ error: "Accès refusé pour consulter ces quiz" });

      return;
    }

    const quizList = await api.prisma.quiz.findMany({
      where: {
        courseId,
        ...(authUser.role === "STUDENT" ? { published: true } : {}),
      },
      include: {
        section: { select: { id: true, title: true, parentId: true, chapterId: true } },
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const summarizeQuiz = (quiz: (typeof quizList)[number]) => {
      const { _count, ...rest } = quiz;
      return {
        ...rest,
        questionCount: _count.questions,
        questions: [] as never[],
      };
    };

    api.logDb("INFO", "Quiz list fetched", {
      courseId,
      count: quizList.length,
      userId: authUser.id,
      role: authUser.role,
    });

    if (authUser.role === "STUDENT") {
      res.json(quizList.map(summarizeQuiz));
      return;
    }

    res.json(quizList.map(summarizeQuiz));
  });

  // POST /api/courses/:courseId/quizzes — créer un quiz sur le module ou une section

  app.post(
    "/api/courses/:courseId/quizzes",
    requireAuth,
    requireRbac,
    validateBody(api.quizSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);

      const courseId = parseInt(req.params.courseId);

      if (!(await api.verifyCourseAccess(authUser, courseId))) {
        res.status(403).json({ error: "Accès refusé pour modifier ce module" });

        return;
      }

      const { moduleId, sectionId, title, published } = req.body;

      const course = await api.prisma.course.findUnique({ where: { id: courseId } });

      if (!course) {
        res.status(404).json({ error: api.PUBLIC_API_ERRORS.courseNotFound });
        return;
      }

      if (sectionId) {
        const section = await api.prisma.contentSection.findFirst({ where: { id: String(sectionId), courseId } });

        if (!section) {
          res.status(404).json({ error: "Section de module introuvable" });
          return;
        }
      }

      let quiz = await api.prisma.quiz.create({
        data: {
          courseId,

          moduleId: moduleId ? Number(moduleId) : null,

          sectionId: sectionId || null,

          title: String(title).trim(),

          published: Boolean(published),
        },

        include: {
          section: { select: { id: true, title: true, parentId: true, chapterId: true } },

          questions: true,
        },
      });

      api.logDb("INFO", "Quiz created", {
        quizId: quiz.id,
        courseId,
        moduleId: quiz.moduleId,
        sectionId: quiz.sectionId,
        userId: authUser.id,
      });

      if (quiz.published) {
        await api.syncPublishedLessonModules(courseId);
        quiz =
          (await api.prisma.quiz.findUnique({
            where: { id: quiz.id },
            include: {
              section: { select: { id: true, title: true, parentId: true, chapterId: true } },

              questions: true,
            },
          })) ?? quiz;

        await api
          .notifyEnrolledStudentsForCourse(courseId, {
            type: "NEW_QUIZ",

            title: "Nouveau quiz disponible",

            body: `${quiz.title} a été publié dans ${course.title}`,

            actionUrl: "/student/course",

            metadata: { courseId, quizId: quiz.id },
          })
          .catch(() => undefined);
      }

      res.status(201).json(quiz);
    },
  );

  // PATCH /api/quizzes/:quizId

  app.patch("/api/quizzes/:quizId", requireAuth, requireRbac, validateBody(api.quizPatchSchema), async (req, res) => {
    const authUser = getAuthUser(req);

    if (!(await api.verifyQuizAccess(authUser, req.params.quizId))) {
      res.status(403).json({ error: "Accès refusé pour modifier ce quiz" });

      return;
    }

    const existingQuiz = await api.prisma.quiz.findUnique({ where: { id: req.params.quizId } });

    if (!existingQuiz) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.quizNotFound });
      return;
    }

    const quiz = await api.prisma.quiz
      .update({
        where: { id: req.params.quizId },

        data: req.body,

        include: {
          section: { select: { id: true, title: true, parentId: true, chapterId: true } },

          questions: { orderBy: { order: "asc" } },
        },
      })
      .catch(() => null);

    if (!quiz) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.quizNotFound });
      return;
    }

    api.logDb("INFO", "Quiz updated", { quizId: quiz.id, published: quiz.published, userId: authUser.id });

    await api.syncPublishedLessonModules(quiz.courseId);

    if (quiz.published && !existingQuiz.published) {
      const course = await api.prisma.course.findUnique({ where: { id: quiz.courseId }, select: { title: true } });

      await api
        .notifyEnrolledStudentsForCourse(quiz.courseId, {
          type: "NEW_QUIZ",

          title: "Nouveau quiz disponible",

          body: `${quiz.title} a été publié${course ? ` dans ${course.title}` : ""}`,

          actionUrl: "/student/course",

          metadata: { courseId: quiz.courseId, quizId: quiz.id },
        })
        .catch(() => undefined);
    }

    res.json(quiz);
  });

  // DELETE /api/quizzes/:quizId

  app.delete("/api/quizzes/:quizId", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);

    if (!(await api.verifyQuizAccess(authUser, req.params.quizId))) {
      res.status(403).json({ error: "Accès refusé pour supprimer ce quiz" });

      return;
    }

    const quiz = await api.prisma.quiz.delete({ where: { id: req.params.quizId } }).catch(() => null);

    if (!quiz) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.quizNotFound });
      return;
    }

    api.logDb("INFO", "Quiz deleted", { quizId: quiz.id, courseId: quiz.courseId, userId: authUser.id });

    await api.syncPublishedLessonModules(quiz.courseId);

    res.json({ ok: true, deletedId: quiz.id });
  });

  // POST /api/quizzes/:quizId/questions — ajouter une question à un quiz

  app.post(
    "/api/quizzes/:quizId/questions",
    requireAuth,
    requireRbac,
    validateBody(api.quizQuestionSchema),
    async (req, res) => {
      const authUser = getAuthUser(req);

      if (!(await api.verifyQuizAccess(authUser, req.params.quizId))) {
        res.status(403).json({ error: "Accès refusé pour modifier ce quiz" });

        return;
      }

      const { question, options, answer, explanation } = req.body;

      if (!question || !Array.isArray(options) || options.length < 2 || !answer || !explanation) {
        res.status(400).json({ error: api.PUBLIC_API_ERRORS.quizQuestionFieldsRequired });
        return;
      }

      const quiz = await api.prisma.quiz.findUnique({ where: { id: req.params.quizId } });

      if (!quiz) {
        res.status(404).json({ error: api.PUBLIC_API_ERRORS.quizNotFound });
        return;
      }

      const order = await api.prisma.quizQuestion.count({ where: { quizId: quiz.id } });

      const q = await api.prisma.quizQuestion.create({
        data: {
          quizId: quiz.id,

          question: String(question).trim(),

          options: options as string[],

          answer: String(answer).trim(),

          explanation: String(explanation).trim(),

          order,
        },
      });

      api.logDb("INFO", "Quiz question added", { questionId: q.id, quizId: quiz.id, userId: authUser.id });

      res.status(201).json(q);
    },
  );

  // DELETE /api/quiz-questions/:id — supprimer une question de quiz

  app.delete("/api/quiz-questions/:id", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);

    if (!(await api.verifyQuizQuestionAccess(authUser, req.params.id))) {
      res.status(403).json({ error: "Accès refusé pour modifier ce quiz" });

      return;
    }

    const q = await api.prisma.quizQuestion.findUnique({ where: { id: req.params.id } });

    if (!q) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.questionNotFound });
      return;
    }

    await api.prisma.quizQuestion.delete({ where: { id: q.id } });

    api.logDb("INFO", "Quiz question deleted", { questionId: q.id, quizId: q.quizId, userId: authUser.id });

    res.json({ ok: true, deletedId: q.id });
  });
}
