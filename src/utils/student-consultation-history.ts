import type { Course, CourseModule } from "../types";

export interface ConsultedElementRecord {
  courseId: number;
  courseTitle: string;
  moduleId: number;
  moduleTitle: string;
  type: "video" | "pdf" | "image" | "quiz" | "text";
  contentTitle?: string;
  timestamp: number;
}

const STORAGE_PREFIX = "axelmond_last_consulted_";

export function getConsultedStorageKey(userId?: string): string {
  return `${STORAGE_PREFIX}${userId ? String(userId).trim() : "default"}`;
}

export function recordConsultedElement(
  userId: string | undefined,
  element: {
    courseId: number;
    courseTitle: string;
    moduleId: number;
    moduleTitle: string;
    type?: string | null;
    contentTitle?: string | null;
  }
): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const rawType = (element.type || "video").toLowerCase();
    let normalizedType: "video" | "pdf" | "image" | "quiz" | "text" = "video";
    if (rawType === "pdf") normalizedType = "pdf";
    else if (rawType === "quiz") normalizedType = "quiz";
    else if (rawType === "image") normalizedType = "image";
    else if (rawType === "text") normalizedType = "text";
    else normalizedType = "video";

    const record: ConsultedElementRecord = {
      courseId: Number(element.courseId),
      courseTitle: element.courseTitle || "",
      moduleId: Number(element.moduleId),
      moduleTitle: element.moduleTitle || "",
      type: normalizedType,
      contentTitle: element.contentTitle || element.moduleTitle || "",
      timestamp: Date.now(),
    };

    const key = getConsultedStorageKey(userId);
    window.localStorage.setItem(key, JSON.stringify(record));
    window.localStorage.setItem(`${STORAGE_PREFIX}default`, JSON.stringify(record));

    window.dispatchEvent(new CustomEvent("axelmond_consultation_updated", { detail: record }));
  } catch (err) {
    console.warn("[consultation-history] Failed to save last consulted element:", err);
  }
}

export function getLastConsultedRecord(userId?: string): ConsultedElementRecord | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const key = getConsultedStorageKey(userId);
    let raw = window.localStorage.getItem(key);
    if (!raw && userId) {
      raw = window.localStorage.getItem(`${STORAGE_PREFIX}default`);
    }
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ConsultedElementRecord>;
    if (!parsed || typeof parsed.courseId !== "number" || typeof parsed.moduleId !== "number") {
      return null;
    }
    return {
      courseId: parsed.courseId,
      courseTitle: parsed.courseTitle || "",
      moduleId: parsed.moduleId,
      moduleTitle: parsed.moduleTitle || "",
      type: parsed.type || "video",
      contentTitle: parsed.contentTitle || parsed.moduleTitle || "",
      timestamp: parsed.timestamp || 0,
    };
  } catch {
    return null;
  }
}

export interface ContinueTargetResult {
  course: Course;
  nextModule: CourseModule | null;
  type: "video" | "pdf" | "image" | "quiz" | "text";
  title: string;
  isLastConsulted: boolean;
}

export function resolveContinueTarget(
  enrolledList: Course[],
  userId?: string
): ContinueTargetResult | null {
  if (enrolledList.length === 0) return null;

  // 1. Check last consulted element from local history
  const lastRecord = getLastConsultedRecord(userId);
  if (lastRecord) {
    const matchedCourse = enrolledList.find((c) => c.id === lastRecord.courseId);
    if (matchedCourse) {
      const matchedModule = matchedCourse.modules?.find((m) => m.id === lastRecord.moduleId) || null;
      if (matchedModule) {
        return {
          course: matchedCourse,
          nextModule: matchedModule,
          type: lastRecord.type || (matchedModule.type as any) || "video",
          title: lastRecord.contentTitle || matchedModule.title,
          isLastConsulted: true,
        };
      }
      return {
        course: matchedCourse,
        nextModule: matchedCourse.modules?.[0] || null,
        type: lastRecord.type || (matchedCourse.modules?.[0]?.type as any) || "video",
        title: lastRecord.contentTitle || matchedCourse.title,
        isLastConsulted: true,
      };
    }
  }

  // 2. Fallback: Find course with progress < 100% or highest progress
  const sorted = [...enrolledList].sort((a, b) => {
    if (a.progress >= 100 && b.progress < 100) return 1;
    if (b.progress >= 100 && a.progress < 100) return -1;
    return b.progress - a.progress;
  });

  const course = sorted.find((item) => item.progress < 100) || sorted[0];
  const nextModule = course.modules.find((module) => !module.completed) || course.modules[0] || null;

  const rawType = ((nextModule?.type as any) || "video").toLowerCase();
  const type = rawType === "pdf" || rawType === "quiz" || rawType === "image" || rawType === "text" ? rawType : "video";

  return {
    course,
    nextModule,
    type,
    title: nextModule ? nextModule.title : course.title,
    isLastConsulted: false,
  };
}

export function resolveLastActivity(
  enrolledList: Course[],
  userId?: string
): { courseTitle: string; moduleTitle: string; type?: string } | null {
  const lastRecord = getLastConsultedRecord(userId);
  if (lastRecord) {
    const matchedCourse = enrolledList.find((c) => c.id === lastRecord.courseId);
    if (matchedCourse) {
      return {
        courseTitle: matchedCourse.title,
        moduleTitle: lastRecord.contentTitle || lastRecord.moduleTitle,
        type: lastRecord.type,
      };
    }
  }

  // Fallback to last completed module
  for (const course of enrolledList) {
    for (const module of course.modules) {
      if (module.completed) {
        return { courseTitle: course.title, moduleTitle: module.title, type: module.type };
      }
    }
  }

  return null;
}
