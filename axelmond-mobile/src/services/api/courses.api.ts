import type { Course } from "../../types";
import { apiRequest } from "./client";

export const coursesApi = {
  health: () => apiRequest<{ status: string }>("GET", "/api/health", undefined, false),
  getDomains: () => apiRequest<any[]>("GET", "/api/domains", undefined, false),
  getCourses: (filters?: { domainId?: number; disciplineId?: number }) => {
    const params = new URLSearchParams();
    if (filters?.domainId) params.set("domainId", String(filters.domainId));
    if (filters?.disciplineId) params.set("disciplineId", String(filters.disciplineId));
    const query = params.toString();
    return apiRequest<Course[]>("GET", `/api/courses${query ? `?${query}` : ""}`, undefined, false);
  },
  getCourse: (id: number) => apiRequest<Course>("GET", `/api/courses/${id}`, undefined, false),
  getCourseContent: (id: number) => apiRequest<any[]>("GET", `/api/courses/${id}/content`),
};
