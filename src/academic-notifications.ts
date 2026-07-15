import { prisma } from "./db";
import { isLiveReplayContent } from "./live/live-replay";
import { notifyAllStudents, notifyEnrolledStudentsForCourse } from "./notifications";

type AcademicNotificationContext = Record<string, string | number | boolean | string[] | null | undefined>;

async function deliverAcademicNotification(
  event: string,
  context: AcademicNotificationContext,
  deliver: () => Promise<unknown>,
) {
  try {
    await deliver();
  } catch (err) {
    console.error(
      `[${new Date().toISOString()}] [ERROR] [notifications] ${event} failed ${JSON.stringify({ ...context, error: String(err) })}`,
    );
  }
}

async function getPublishedCourse(courseId: number) {
  return prisma.course.findFirst({
    where: { id: courseId, published: true },
    select: { id: true, title: true },
  });
}

export async function notifyPublishedCourse(
  course: { id: number; title: string },
  actor: { id: string; fullName: string },
) {
  await deliverAcademicNotification("COURSE_PUBLISHED", { courseId: course.id, actorId: actor.id }, () =>
    notifyAllStudents({
      type: "NEW_COURSE",
      title: "Nouveau module académique",
      body: `Le module « ${course.title} » vient d'être publié par ${actor.fullName}.`,
      actionUrl: "/student/catalog",
      metadata: { courseId: course.id, actorId: actor.id, event: "COURSE_PUBLISHED" },
    }),
  );
}

export async function notifyCourseModuleCreated(
  course: { id: number; title: string; published: boolean },
  module: { id: number; title: string; type: string },
  actorId: string,
) {
  if (!course.published) return;
  await deliverAcademicNotification("COURSE_MODULE_CREATED", { courseId: course.id, moduleId: module.id }, () =>
    notifyEnrolledStudentsForCourse(course.id, {
      type: "NEW_MODULE",
      title: "Nouveau contenu dans votre module",
      body: `« ${module.title} » a été ajouté au module ${course.title}.`,
      actionUrl: "/student/course",
      metadata: {
        courseId: course.id,
        moduleId: module.id,
        contentType: module.type,
        actorId,
        event: "COURSE_MODULE_CREATED",
      },
    }),
  );
}

export async function notifyCourseUpdated(
  previous: { id: number; title: string; description: string; instructor: string; duration: string; price: number },
  updated: { title: string; description: string; instructor: string; duration: string; price: number },
  actorId: string,
) {
  const changedFields = [
    previous.title !== updated.title ? "le titre" : null,
    previous.description !== updated.description ? "la description" : null,
    previous.instructor !== updated.instructor ? "l'enseignant" : null,
    previous.duration !== updated.duration ? "la durée" : null,
    previous.price !== updated.price ? "le tarif" : null,
  ].filter((field): field is string => Boolean(field));
  if (changedFields.length === 0) return;
  await deliverAcademicNotification("COURSE_UPDATED", { courseId: previous.id, changedFields }, () =>
    notifyEnrolledStudentsForCourse(previous.id, {
      type: "COURSE_UPDATED",
      title: "Module mis à jour",
      body: `Le module « ${updated.title} » a été actualisé (${changedFields.join(", ")}).`,
      actionUrl: "/student/course",
      metadata: {
        courseId: previous.id,
        changedFields,
        actorId,
        event: "COURSE_UPDATED",
      },
    }),
  );
}

export async function notifyCourseAccessUpdated(course: { id: number; title: string }, actorId: string) {
  await deliverAcademicNotification("COURSE_ACCESS_UPDATED", { courseId: course.id, actorId }, () =>
    notifyEnrolledStudentsForCourse(course.id, {
      type: "COURSE_UPDATED",
      title: "Conditions du module mises à jour",
      body: `Les conditions d'accès au module « ${course.title} » ont été actualisées.`,
      actionUrl: "/student/course",
      metadata: { courseId: course.id, actorId, event: "COURSE_ACCESS_UPDATED" },
    }),
  );
}

export async function notifyLiveStarted(
  course: { id: number; title: string; liveSubject: string | null },
  actorId: string,
) {
  await deliverAcademicNotification("LIVE_STARTED", { courseId: course.id, actorId }, () =>
    notifyEnrolledStudentsForCourse(course.id, {
      type: "LIVE_STARTED",
      title: "Séance live en cours",
      body: `${course.liveSubject || course.title} est en direct`,
      actionUrl: "/student/live",
      metadata: { courseId: course.id, actorId, event: "LIVE_STARTED" },
    }),
  );
}

export async function notifyLiveFinished(course: { id: number; title: string }, actorId: string) {
  await deliverAcademicNotification("LIVE_FINISHED", { courseId: course.id, actorId }, () =>
    notifyEnrolledStudentsForCourse(course.id, {
      type: "LIVE_FINISHED",
      title: "Séance live terminée",
      body: `La séance en direct pour ${course.title} est terminée`,
      actionUrl: "/student/course",
      metadata: { courseId: course.id, actorId, event: "LIVE_FINISHED" },
    }),
  );
}

export async function notifyPublishedChapter(input: {
  chapterId: string;
  courseId: number;
  chapterTitle: string;
  published: boolean;
  actorId: string;
}) {
  if (!input.published) return;
  await deliverAcademicNotification(
    "CHAPTER_PUBLISHED",
    { courseId: input.courseId, chapterId: input.chapterId },
    async () => {
      const course = await getPublishedCourse(input.courseId);
      if (!course) return;
      await notifyEnrolledStudentsForCourse(input.courseId, {
        type: "NEW_CHAPTER",
        title: "Nouveau chapitre publié",
        body: `Le chapitre « ${input.chapterTitle} » est disponible dans ${course.title}.`,
        actionUrl: "/student/course",
        metadata: {
          courseId: input.courseId,
          chapterId: input.chapterId,
          actorId: input.actorId,
          event: "CHAPTER_PUBLISHED",
        },
      });
    },
  );
}

export async function notifyPublishedSection(input: {
  sectionId: string;
  courseId: number;
  sectionTitle: string;
  parentId: string | null;
  published: boolean;
  actorId: string;
}) {
  if (!input.published) return;
  await deliverAcademicNotification(
    "SECTION_PUBLISHED",
    { courseId: input.courseId, sectionId: input.sectionId },
    async () => {
      const course = await getPublishedCourse(input.courseId);
      if (!course) return;
      const sectionKind = input.parentId ? "partie" : "section";
      await notifyEnrolledStudentsForCourse(input.courseId, {
        type: "NEW_SECTION",
        title: `Nouvelle ${sectionKind} publiée`,
        body: `La ${sectionKind} « ${input.sectionTitle} » est disponible dans ${course.title}.`,
        actionUrl: "/student/course",
        metadata: {
          courseId: input.courseId,
          sectionId: input.sectionId,
          actorId: input.actorId,
          event: "SECTION_PUBLISHED",
        },
      });
    },
  );
}

export async function notifyPublishedLessonContent(input: {
  contentId: string;
  courseId: number;
  contentTitle: string;
  contentType: string;
  body?: string | null;
  sectionTitle?: string;
  published: boolean;
  actorId: string;
  sourceEvent?: string;
}) {
  if (!input.published) return;

  const isHomework = /devoir|homework|assignment/i.test(`${input.contentTitle} ${input.sectionTitle || ""}`);
  const isReplay = isLiveReplayContent(input.body);
  const contentSubject =
    input.contentType === "VIDEO"
      ? "La vidéo"
      : input.contentType === "PDF"
        ? "Le document PDF"
        : input.contentType === "IMAGE"
          ? "L'image"
          : "Le contenu";
  const notification = isHomework
    ? { type: "NEW_HOMEWORK", title: "Nouveau devoir publié", subject: "Le devoir" }
    : isReplay
      ? { type: "LIVE_REPLAY_AVAILABLE", title: "Rediffusion disponible", subject: "La rediffusion" }
      : { type: "NEW_CONTENT", title: "Nouveau contenu publié", subject: contentSubject };
  const event = isReplay ? "LIVE_REPLAY_PUBLISHED" : input.sourceEvent || "LESSON_CONTENT_PUBLISHED";

  await deliverAcademicNotification(event, { courseId: input.courseId, contentId: input.contentId }, async () => {
    const course = await getPublishedCourse(input.courseId);
    if (!course) return;
    await notifyEnrolledStudentsForCourse(input.courseId, {
      type: notification.type,
      title: notification.title,
      body: `${notification.subject} « ${input.contentTitle} » est disponible dans ${course.title}.`,
      actionUrl: "/student/course",
      metadata: {
        courseId: input.courseId,
        contentId: input.contentId,
        contentType: input.contentType,
        actorId: input.actorId,
        event,
      },
    });
  });
}
