import type { AcademicProfile, AppUser } from "../../types";
import { apiRequest } from "./client";

export const profileApi = {
  getStudentProfile: () =>
    apiRequest<{ user: AppUser; objectivesSummary: Record<string, number> }>("GET", "/api/mobile/student-profile"),
  getTeacherProfile: () => apiRequest<AcademicProfile>("GET", "/api/me/profile"),
  updateTeacherProfile: (data: Record<string, unknown>) => apiRequest("PUT", "/api/me/profile", data),
  getStudentObjectivesSummary: () => apiRequest<Record<string, number>>("GET", "/api/me/objectives/summary"),
  getStudySchedule: () => apiRequest<any[]>("GET", "/api/me/study-schedule"),
};
