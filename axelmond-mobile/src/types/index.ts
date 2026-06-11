export type UserRole = "STUDENT" | "PROFESSOR" | "RESEARCHER" | "ADMIN";

export interface Invoice {
  id: string;
  courseId: number;
  courseTitle: string;
  amount: number;
  status: string;
  date: string;
}

export interface CourseModule {
  id: number;
  title: string;
  type: "video" | "pdf" | "quiz" | "image";
  duration: string;
  completed: boolean;
  score?: string;
  contentMarkdown?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  published?: boolean;
}

export interface Course {
  id: number;
  title: string;
  level: string;
  credits: number;
  duration: string;
  category: string;
  disciplineId: number;
  price: number;
  iconName?: string;
  color?: string;
  instructor: string;
  description: string;
  progress: number;
  isLiveNow: boolean;
  liveSubject?: string;
  liveStartedAt?: string | null;
  modules: CourseModule[];
  published?: boolean;
}

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  emailVerified?: boolean;
  levelOrTitle: string;
  filiere?: string;
  avatarUrl?: string;
  enrolledCourses: number[];
  invoices: Invoice[];
}

export interface AuthSession {
  user: AppUser;
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}

export interface LiveKitSession {
  url: string;
  token: string;
  roomName: string;
  participantName: string;
  startedAt: string;
}

export interface LiveMessage {
  id: string | number;
  sender: string;
  text: string;
  time: string;
  isMe: boolean;
}

export interface AcademicProfile {
  title?: string;
  department?: string;
  lab?: string;
  speciality?: string;
  teachingDomains?: string[];
  researchDomains?: string[];
  bio?: string;
  avatarUrl?: string;
  links?: Record<string, string>;
}

export interface StudentObjectivesSummary {
  total: number;
  completed: number;
  inProgress: number;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  verificationRequired?: boolean;
  email?: string;
  isRateLimit?: boolean;
  retryAfter?: number;
}
