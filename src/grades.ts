export interface GradeEnrollmentInput {
  user: {
    id: string;
    fullName: string;
    enrollments?: { courseId: number }[];
    enrolledCoursesCount?: number;
  };
}

export interface GradeAttemptInput {
  userId: string;
  quizId: string;
  scoreOutOf20: number;
  createdAt: Date;
}

export interface CourseGradeRow {
  studentId: string;
  studentName: string;
  enrolledCoursesCount: number;
  completedQuizzesCount: number;
  averageScoreOutOf20: number | null;
}

function roundToTwoDecimals(score: number) {
  return Math.round(score * 100) / 100;
}

export function buildCourseGradeRows(
  enrollments: GradeEnrollmentInput[],
  attempts: GradeAttemptInput[],
): CourseGradeRow[] {
  const latestAttemptByStudentQuiz = new Map<string, GradeAttemptInput>();

  for (const attempt of attempts) {
    const key = `${attempt.userId}:${attempt.quizId}`;
    const current = latestAttemptByStudentQuiz.get(key);
    if (!current || attempt.createdAt > current.createdAt) {
      latestAttemptByStudentQuiz.set(key, attempt);
    }
  }

  const attemptsByStudent = new Map<string, GradeAttemptInput[]>();
  for (const attempt of latestAttemptByStudentQuiz.values()) {
    const current = attemptsByStudent.get(attempt.userId) || [];
    current.push(attempt);
    attemptsByStudent.set(attempt.userId, current);
  }

  return enrollments.map((enrollment) => {
    const studentAttempts = attemptsByStudent.get(enrollment.user.id) || [];
    const average = studentAttempts.length
      ? roundToTwoDecimals(
          studentAttempts.reduce((sum, attempt) => sum + attempt.scoreOutOf20, 0) / studentAttempts.length,
        )
      : null;

    return {
      studentId: enrollment.user.id,
      studentName: enrollment.user.fullName,
      enrolledCoursesCount:
        enrollment.user.enrolledCoursesCount ?? enrollment.user.enrollments?.length ?? 0,
      completedQuizzesCount: studentAttempts.length,
      averageScoreOutOf20: average,
    };
  });
}
