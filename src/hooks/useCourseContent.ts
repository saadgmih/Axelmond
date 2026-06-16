import { useCallback, useState } from "react";
import { api } from "../api";
import type { ContentSection, LessonContent } from "../types";

export function flattenSections(sections: ContentSection[], depth = 0): (ContentSection & { depth: number })[] {
  return sections.flatMap((section) => {
    const flatSection: ContentSection & { depth: number } = { ...section, depth };
    return [flatSection, ...flattenSections(section.children || [], depth + 1)];
  });
}

export function flattenContents(sections: ContentSection[]): LessonContent[] {
  return sections.flatMap((section) => [...(section.contents || []), ...flattenContents(section.children || [])]);
}

export function findLessonContent(sections: ContentSection[], contentId: string): LessonContent | null {
  return flattenContents(sections).find((content) => content.id === contentId) ?? null;
}

export function useCourseContent() {
  const [courseContentSections, setCourseContentSections] = useState<ContentSection[]>([]);
  const [selectedLessonContent, setSelectedLessonContent] = useState<LessonContent | null>(null);

  const refreshCourseContent = useCallback(async (courseId: number) => {
    try {
      const sections = await api.getCourseContent(courseId);
      setCourseContentSections(sections);
      const contents = flattenContents(sections);
      setSelectedLessonContent((current) => {
        if (current && contents.some((content) => content.id === current.id)) return current;
        return null;
      });
      return sections;
    } catch (err) {
      console.error("Failed to load course content:", err);
      setCourseContentSections([]);
      setSelectedLessonContent(null);
      return [];
    }
  }, []);

  return {
    courseContentSections,
    setCourseContentSections,
    selectedLessonContent,
    setSelectedLessonContent,
    flattenSections,
    refreshCourseContent,
  };
}
