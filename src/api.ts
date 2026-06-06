const BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL || "").replace(/\/$/, "");
const ACCESS_TOKEN_KEY = "axelmond_session_token";
const REFRESH_TOKEN_KEY = "axelmond_refresh_token";
const AUTH_PATHS_WITHOUT_REFRESH = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/verify-email",
  "/api/auth/resend-verification-code",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/refresh",
  "/api/auth/logout",
]);
let refreshPromise: Promise<string | null> | null = null;
let sessionExpiredNotified = false;

function buildApiErrorMessage(method: string, path: string, status: number, payload: any, fallback: string) {
  return payload?.error || payload?.message || fallback;
}

function buildRequestOptions(method: string, body: unknown, token: string | null): RequestInit {
  const opts: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  return opts;
}

function notifySessionExpired() {
  if (sessionExpiredNotified) return;
  sessionExpiredNotified = true;
  window.dispatchEvent(new CustomEvent("axelmond:session-expired"));
}

function clearSessionTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function performSessionRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    clearSessionTokens();
    notifySessionExpired();
    return null;
  }

  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, buildRequestOptions("POST", { refreshToken }, null));
    if (!res.ok) throw new Error("Refresh token rejected");
    const payload = await res.json();
    if (!payload?.token) throw new Error("Refresh token response missing access token");
    localStorage.setItem(ACCESS_TOKEN_KEY, payload.token);
    if (payload.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
    sessionExpiredNotified = false;
    return payload.token;
  } catch (err) {
    console.warn("[auth] Session refresh failed", err);
    clearSessionTokens();
    notifySessionExpired();
    return null;
  }
}

export async function refreshSessionToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performSessionRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function isAccessTokenFresh(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp !== "number" || payload.exp > Math.floor(Date.now() / 1000) + 30;
  } catch {
    return false;
  }
}

export async function getFreshSessionToken(): Promise<string | null> {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token && isAccessTokenFresh(token)) return token;
  return refreshSessionToken();
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const url = `${BASE_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, buildRequestOptions(method, body, token));
    if (res.status === 401 && !AUTH_PATHS_WITHOUT_REFRESH.has(path)) {
      token = await refreshSessionToken();
      if (token) res = await fetch(url, buildRequestOptions(method, body, token));
    }
  } catch (err: any) {
    const error = new Error(
      `Erreur de connexion au serveur. Veuillez vérifier votre connexion internet et réessayer.`
    ) as Error & Record<string, unknown>;
    Object.assign(error, { status: 0, method, path, url, cause: err });
    throw error;
  }
  if (!res.ok) {
    const text = await res.text();
    let err: any;
    try {
      err = text ? JSON.parse(text) : { error: res.statusText };
    } catch {
      err = { error: text || res.statusText };
    }
    const error = new Error(buildApiErrorMessage(method, path, res.status, err, res.statusText)) as Error & Record<string, unknown>;
    Object.assign(error, err, { status: res.status, method, path, url, response: text });
    // Attach rate-limit metadata so the UI can show a precise countdown
    if (res.status === 429) {
      const retryAfterHeader = res.headers.get("Retry-After");
      const resetHeader = res.headers.get("RateLimit-Reset") || res.headers.get("X-RateLimit-Reset");
      let retryAfterSeconds: number | undefined;
      if (retryAfterHeader) {
        retryAfterSeconds = parseInt(retryAfterHeader, 10);
      } else if (resetHeader) {
        // RateLimit-Reset is Unix timestamp in seconds
        const resetTimestamp = parseInt(resetHeader, 10);
        if (!isNaN(resetTimestamp)) {
          retryAfterSeconds = Math.max(0, resetTimestamp - Math.floor(Date.now() / 1000));
        }
      }
      Object.assign(error, { isRateLimit: true, retryAfter: retryAfterSeconds });
    }
    throw error;
  }
  return res.json();
}

export const api = {
  getDomains: () => request<any[]>("GET", "/api/domains"),
  getCourses: (filters?: { domainId?: number; disciplineId?: number }) => {
    const params = new URLSearchParams();
    if (filters?.domainId) params.set("domainId", String(filters.domainId));
    if (filters?.disciplineId) params.set("disciplineId", String(filters.disciplineId));
    const query = params.toString();
    return request<any[]>("GET", `/api/courses${query ? `?${query}` : ""}`);
  },
  getCourse: (id: number) => request<any>("GET", `/api/courses/${id}`),
  getCourseContent: (id: number) => request<any[]>("GET", `/api/courses/${id}/content`),
  getModuleContents: (id: number) => request<any[]>("GET", `/api/courses/${id}/module-contents`),
  createCourse: (data: { title: string; level: string; credits: number; duration: string; category?: string; disciplineId: number; price: number; instructor?: string; description: string; published: boolean }) =>
    request<any>("POST", "/api/courses", data),
  updateCourseDetails: (courseId: number, data: { title?: string; description?: string; level?: string; credits?: number; duration?: string; disciplineId?: number; price?: number; published?: boolean }) =>
    request<any>("PUT", `/api/courses/${courseId}`, data),
  deleteCourse: (courseId: number) =>
    request<any>("DELETE", `/api/courses/${courseId}`),
  getChapters: (courseId: number) =>
    request<any[]>("GET", `/api/courses/${courseId}/chapters`),
  createChapter: (courseId: number, data: { title: string; description?: string; published: boolean }) =>
    request<any>("POST", `/api/courses/${courseId}/chapters`, data),
  updateChapter: (chapterId: string, data: { title?: string; description?: string | null; published?: boolean; order?: number }) =>
    request<any>("PUT", `/api/chapters/${chapterId}`, data),
  publishChapter: (chapterId: string, published: boolean) =>
    request<any>("PATCH", `/api/chapters/${chapterId}`, { published }),
  deleteChapter: (chapterId: string) =>
    request<any>("DELETE", `/api/chapters/${chapterId}`),
  createSection: (courseId: number, data: { title: string; description?: string; parentId?: string; chapterId?: string; published: boolean }) =>
    request<any>("POST", `/api/courses/${courseId}/sections`, data),
  createTextContent: (sectionId: string, data: { title: string; body: string; published: boolean }) =>
    request<any>("POST", `/api/content-sections/${sectionId}/contents`, data),
  putContentSection: (sectionId: string, data: { title?: string; description?: string | null; published?: boolean; order?: number }) =>
    request<any>("PUT", `/api/content-sections/${sectionId}`, data),
  updateContentSection: (sectionId: string, data: { title?: string; description?: string | null; published?: boolean }) =>
    request<any>("PATCH", `/api/content-sections/${sectionId}`, data),
  deleteContentSection: (sectionId: string) =>
    request<any>("DELETE", `/api/content-sections/${sectionId}`),
  putLessonContent: (contentId: string, data: { title?: string; body?: string | null; published?: boolean }) =>
    request<any>("PUT", `/api/lesson-contents/${contentId}`, data),
  updateLessonContent: (contentId: string, data: { title?: string; body?: string | null; published?: boolean }) =>
    request<any>("PATCH", `/api/lesson-contents/${contentId}`, data),
  deleteLessonContent: (contentId: string) =>
    request<any>("DELETE", `/api/lesson-contents/${contentId}`),
  getQuiz: (moduleId: number) => request<any[]>("GET", `/api/quizzes/${moduleId}`),
  submitQuizAttempt: (courseId: number, moduleId: number, answers: Record<string, string>) =>
    request<any>("POST", `/api/courses/${courseId}/modules/${moduleId}/quiz-attempts`, { answers }),
  getCourseGrades: (courseId: number) =>
    request<any[]>("GET", `/api/courses/${courseId}/grades`),
  completeModule: (courseId: number, moduleId: number) =>
    request<any>("POST", `/api/courses/${courseId}/modules/${moduleId}/complete`),
  addModule: (courseId: number, data: { title: string; type: string; duration: string; contentMarkdown?: string }) =>
    request<any>("POST", `/api/courses/${courseId}/modules`, data),
  updateCourse: (courseId: number, data: { price?: number; isLiveNow?: boolean; liveSubject?: string | null; published?: boolean }) =>
    request<any>("PATCH", `/api/courses/${courseId}`, data),
  enrollMock: (courseId: number) =>
    request<any>("POST", "/api/payments/enroll-mock", { courseId }),
  createCheckoutSession: (courseId: number) =>
    request<{ url: string }>("POST", "/api/payments/create-checkout-session", { courseId }),
  login: (email: string, password: string, role: string) =>
    request<any>("POST", "/api/auth/login", { email, password, role }),
  register: (data: { email: string; password: string; fullName: string; role: string; levelOrTitle?: string; filiere?: string; professorInviteCode?: string }) =>
    request<any>("POST", "/api/auth/register", data),
  verifyEmail: (email: string, code: string) =>
    request<any>("POST", "/api/auth/verify-email", { email, code }),
  resendVerificationCode: (email: string) =>
    request<any>("POST", "/api/auth/resend-verification-code", { email }),
  forgotPassword: (email: string) =>
    request<any>("POST", "/api/auth/forgot-password", { email }),
  resetPassword: (email: string, code: string, newPassword: string) =>
    request<any>("POST", "/api/auth/reset-password", { email, code, newPassword }),
  sendTestEmail: (to: string) =>
    request<any>("POST", "/api/test-email", { to }),
  getEmailDeliverySummary: () =>
    request<any>("GET", "/api/admin/email-delivery-summary"),
  getEmailDeliveryLogs: () =>
    request<any[]>("GET", "/api/admin/email-delivery-logs"),
  getProfessorInvites: () =>
    request<any[]>("GET", "/api/admin/professor-invites"),
  createProfessorInvite: (data?: { code?: string }) =>
    request<any>("POST", "/api/admin/professor-invites", data),
  deleteProfessorInvite: (code: string) =>
    request<any>("DELETE", `/api/admin/professor-invites/${code}`),
  getAcademicProfile: () =>
    request<any>("GET", "/api/me/profile"),
  updateAcademicProfile: (data: { title?: string; department?: string; lab?: string; speciality?: string; teachingDomains?: string[]; researchDomains?: string[]; bio?: string; avatarUrl?: string; links?: Record<string, string> }) =>
    request<any>("PUT", "/api/me/profile", data),
  updateAcademicAvatar: (avatarUrl: string) =>
    request<any>("POST", "/api/me/avatar", { avatarUrl }),
  deleteAvatar: () =>
    request<any>("DELETE", "/api/me/avatar"),
  changeAcademicPassword: (currentPassword: string, newPassword: string) =>
    request<any>("POST", "/api/me/password", { currentPassword, newPassword }),
  logout: (refreshToken: string) =>
    request<any>("POST", "/api/auth/logout", { refreshToken }),
  getAdminAcademicProfiles: () =>
    request<any[]>("GET", "/api/admin/academic-profiles"),
  me: () => request<any>("GET", "/api/auth/me"),
  getLiveKitToken: (courseId: number) =>
    request<any>("POST", "/api/livekit/token", { courseId }),
  getLiveMessages: (courseId: number) =>
    request<any[]>("GET", `/api/livekit/messages/${courseId}`),
  saveLiveMessage: (courseId: number, message: { id: string | number; text: string }) =>
    request<any>("POST", "/api/livekit/messages", { courseId, messageId: message.id, text: message.text }),
  leaveLiveAttendance: (courseId: number) =>
    request<any>("POST", "/api/livekit/attendance/leave", { courseId }),
  getLiveAttendance: (courseId: number) =>
    request<any>("GET", `/api/livekit/attendance/${courseId}`),
  logLiveEvent: (data: { courseId: number; action: string; targetIdentity?: string | null; targetName?: string | null; details?: Record<string, unknown> }) =>
    request<any>("POST", "/api/livekit/events", data),
  moderateLiveParticipant: (data: { courseId: number; action: string; targetIdentity: string; targetName?: string | null; trackSid?: string | null }) =>
    request<any>("POST", "/api/livekit/moderation", data),
  syncUser: (data: { id: string; enrolledCourses?: number[]; invoices?: any[] }) =>
    request<any>("PUT", "/api/users/sync", data),
  getUser: (id: string) => request<any>("GET", `/api/users/${id}`),
  getCourseQuizzes: (courseId: number) =>
    request<any[]>("GET", `/api/courses/${courseId}/quizzes`),
  createCourseQuiz: (courseId: number, data: { moduleId?: number | null; sectionId?: string | null; title: string; published: boolean }) =>
    request<any>("POST", `/api/courses/${courseId}/quizzes`, data),
  updateQuiz: (quizId: string, data: { title?: string; published?: boolean }) =>
    request<any>("PATCH", `/api/quizzes/${quizId}`, data),
  deleteQuiz: (quizId: string) =>
    request<any>("DELETE", `/api/quizzes/${quizId}`),
  submitQuizAttemptById: (quizId: string, answers: Record<string, string>) =>
    request<any>("POST", `/api/quizzes/${quizId}/attempts`, { answers }),
  addQuizQuestion: (quizId: string, data: { question: string; options: string[]; answer: string; explanation: string }) =>
    request<any>("POST", `/api/quizzes/${quizId}/questions`, data),
  deleteQuizQuestion: (questionId: string) =>
    request<any>("DELETE", `/api/quiz-questions/${questionId}`),
  submitContact: (data: { name: string; email: string; subject: string; category: string; message: string }) =>
    request<any>("POST", "/api/contact", data),
  createSupportTicket: (data: { subject: string; category: string; description: string; screenshotUrl?: string | null }) =>
    request<any>("POST", "/api/support/tickets", data),
};

export function setSessionToken(token: string | undefined, refreshToken?: string) {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    sessionExpiredNotified = false;
  } else {
    clearSessionTokens();
  }
}
