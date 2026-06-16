import type { ModuleType } from "./types";

export const LESSON_MODULE_LINK_PREFIX = "lesson:";

export function lessonContentLinkKey(contentId: string): string {
  return `${LESSON_MODULE_LINK_PREFIX}${contentId}`;
}

export function isLessonModuleLink(sectionId: string | null | undefined): boolean {
  return Boolean(sectionId?.startsWith(LESSON_MODULE_LINK_PREFIX));
}

export function lessonContentIdFromModule(sectionId: string | null | undefined): string | null {
  if (!sectionId?.startsWith(LESSON_MODULE_LINK_PREFIX)) return null;
  const contentId = sectionId.slice(LESSON_MODULE_LINK_PREFIX.length);
  return contentId.length > 0 ? contentId : null;
}

export function mapLessonTypeToModuleType(type: string): ModuleType {
  switch (type) {
    case "VIDEO":
      return "video";
    case "PDF":
      return "pdf";
    case "IMAGE":
      return "image";
    case "TEXT":
      return "pdf";
    default:
      return "pdf";
  }
}
