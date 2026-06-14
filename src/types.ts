export type ModuleType = "video" | "pdf" | "quiz" | "image";

export const DEFAULT_MODULE_CLASSIFICATION = "Module académique";
export const DEFAULT_STUDENT_LABEL = "Étudiant";

export interface CourseModule {
  id: number;
  title: string;
  type: ModuleType;
  duration: string;
  completed: boolean;
  score?: string;
  contentMarkdown?: string; // Styled academic notes
  attachmentUrl?: string;
  attachmentName?: string;
  sectionId?: string;
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
  discipline?: Discipline;
  price: number;
  iconName: "Code" | "Database" | "Terminal" | "Brain";
  color: string;
  instructor: string;
  description: string;
  progress: number;
  isLiveNow: boolean;
  liveSubject?: string;
  liveStartedAt?: string | null;
  modules: CourseModule[];
  published?: boolean;
  createdById?: string | null;
}

export interface FacultyDomain {
  id: number;
  name: string;
  slug: string;
  iconName: string;
  color: string;
  description: string;
  order: number;
  disciplines: Discipline[];
  courseCount?: number;
}

export interface Discipline {
  id: number;
  domainId: number;
  name: string;
  slug: string;
  order: number;
  domain?: Omit<FacultyDomain, "disciplines">;
  courseCount?: number;
}

export type LessonContentType = "VIDEO" | "PDF" | "IMAGE" | "TEXT";

export interface ContentAttachment {
  id: string;
  type: "VIDEO" | "PDF" | "IMAGE" | "FILE";
  fileName: string;
  fileKey: string;
  url: string;
  mimeType?: string;
  size: number;
}

export interface LessonContent {
  id: string;
  courseId: number;
  sectionId?: string;
  type: LessonContentType;
  title: string;
  body?: string;
  published: boolean;
  attachments: ContentAttachment[];
}

export interface ContentSection {
  id: string;
  courseId: number;
  chapterId?: string;
  parentId?: string;
  title: string;
  description?: string;
  order: number;
  published: boolean;
  contents: LessonContent[];
  children: ContentSection[];
}

export interface ChatMessage {
  id: string | number;
  user: string;
  text: string;
  time: string;
  isInstructor?: boolean;
  isMe?: boolean;
}

export interface Invoice {
  id: string;
  date: string;
  courseTitle: string;
  amount: number;
  status: "Payé" | "Remboursé";
}

export interface CourseGrade {
  studentId: string;
  studentName: string;
  enrolledCoursesCount: number;
  completedQuizzesCount: number;
  averageScoreOutOf20: number | null;
}

export interface AcademicProfile {
  id: string;
  userId: string;
  title: string;
  department: string;
  lab: string;
  speciality: string;
  teachingDomains: string[];
  researchDomains: string[];
  bio: string;
  avatarUrl: string;
  links: {
    linkedIn?: string;
    orcid?: string;
    googleScholar?: string;
    website?: string;
  };
}

export interface AcademicProfilePayload {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  profile: AcademicProfile;
  courses: { id: number; title: string; published: boolean; liveSubject?: string | null }[];
  lives: {
    id: string;
    roomName: string;
    courseId: number;
    active: boolean;
    startedAt: string;
    endedAt?: string | null;
    course?: { title: string };
  }[];
  publishedContentsCount: number;
  message?: string;
}
