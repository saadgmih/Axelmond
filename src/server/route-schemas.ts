import express from "express";
import { z } from "zod";
import { DEFAULT_MODULE_CLASSIFICATION } from "../types";
import {
  CHAT_TUTOR_MAX_HISTORY_MESSAGES,
  CHAT_TUTOR_MAX_PROMPT_CHARS,
  trimChatTutorHistory,
} from "../security-hardening";
import { strongPasswordField } from "../password-policy";

// ─── Input Validation (Zod only — no global HTML entity encoding on req.body) ─

export function validateBody(schema: z.ZodType<any>) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const result = await schema.safeParseAsync(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Données d'entrée invalides",
        details: result.error.issues.map((e) => ({ field: e.path.join("."), message: e.message })),
        code: "VALIDATION_ERROR",
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export const registerSchema = z.object({
  email: z.string().email("Adresse email invalide").trim().toLowerCase().max(255),
  password: strongPasswordField,
  fullName: z.string().min(2, "Le nom complet doit contenir au moins 2 caractères").max(100).trim(),
  role: z.enum(["STUDENT", "PROFESSOR", "RESEARCHER", "ADMIN"]),
  levelOrTitle: z.string().max(100).trim().optional().nullable(),
  filiere: z.string().max(100).trim().optional().nullable(),
  professorInviteCode: z.string().max(50).trim().optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email("Adresse email invalide").trim().toLowerCase(),
  password: z.string().min(1, "Mot de passe requis"),
  role: z.enum(["STUDENT", "PROFESSOR", "RESEARCHER", "ADMIN"]),
});

export const verifyEmailSchema = z.object({
  email: z.string().email("Adresse email invalide").trim().toLowerCase(),
  code: z.string().length(6, "Le code doit contenir 6 chiffres").regex(/^\d+$/, "Le code doit être numérique"),
});

export const resendEmailSchema = z.object({
  email: z.string().email("Adresse email invalide").trim().toLowerCase(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Adresse email invalide").trim().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Adresse email invalide").trim().toLowerCase(),
  code: z.string().length(6, "Le code doit contenir 6 chiffres").regex(/^\d+$/, "Le code doit être numérique"),
  newPassword: strongPasswordField,
});

export const scheduleSessionSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  title: z.string().min(1, "Le titre est obligatoire").max(120).trim(),
  moduleName: z.string().min(1, "Le module est obligatoire").max(120).trim(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure de début invalide (HH:mm)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure de fin invalide (HH:mm)"),
  sessionType: z.enum(["COURS", "TD", "TP", "LIVE", "EXAMEN"]).default("COURS"),
  roomOrLink: z.string().max(200).trim().optional().nullable(),
  description: z.string().max(500).trim().optional().nullable(),
});

export const studentStudyScheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  title: z.string().min(1, "Le titre est obligatoire").max(120).trim(),
  moduleName: z.string().min(1, "Le module est obligatoire").max(120).trim(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure de début invalide (HH:mm)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure de fin invalide (HH:mm)"),
  sessionType: z.enum(["REVISION", "COURS", "TD", "TP", "LIVE", "DEVOIR", "EXAMEN"]).default("REVISION"),
  roomOrLink: z.string().max(200).trim().optional().nullable(),
  description: z.string().max(500).trim().optional().nullable(),
});

export const studentObjectiveSchema = z.object({
  title: z.string().min(1, "Le titre de l'objectif est obligatoire").max(160).trim(),
  description: z.string().max(800).trim().optional().nullable(),
  startAt: z.string().min(1, "Date de début obligatoire"),
  endAt: z.string().min(1, "Date de fin obligatoire"),
  status: z.enum(["IN_PROGRESS", "COMPLETED"]).optional(),
  objectiveType: z.enum(["CHAPITRE", "TD", "RESUME", "REVISION", "AUTRE"]).optional().nullable(),
  focusContentTitle: z.string().max(160).trim().optional().nullable(),
  focusContentUrl: z.string().max(500).trim().optional().nullable(),
  focusContentType: z
    .enum(["PODCAST", "VIDEO", "AUDIO_REMINDER", "EDUCATIONAL_RESOURCE", "OTHER"])
    .optional()
    .nullable(),
  recurrence: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]).optional().nullable(),
});

export const chatTutorSchema = z.object({
  courseId: z.number().int().positive(),
  moduleId: z.number().int().positive().optional(),
  prompt: z.string().min(1, "Question requise").max(CHAT_TUTOR_MAX_PROMPT_CHARS).trim(),
  chatHistory: z
    .array(
      z.object({
        role: z.enum(["user", "model", "assistant"]),
        text: z.string().max(CHAT_TUTOR_MAX_PROMPT_CHARS),
      }),
    )
    .max(CHAT_TUTOR_MAX_HISTORY_MESSAGES)
    .optional()
    .transform((history) => (history ? trimChatTutorHistory(history) : history)),
});

export const PASSWORD_RESET_GENERIC_MESSAGE =
  "Si un compte Axelmond Research Labs existe pour cette adresse, un code de réinitialisation a été envoyé.";

export const courseSchema = z.object({
  title: z.string().min(2, "Le titre est requis").max(200).trim(),
  level: z.string().min(2).max(50).trim().optional().default(DEFAULT_MODULE_CLASSIFICATION),
  credits: z.number().int().min(0),
  duration: z.string().min(2).max(50).trim(),
  category: z.string().max(100).trim().optional().nullable(),
  disciplineId: z.number().int().positive(),
  price: z.number().nonnegative(),
  instructor: z.string().max(100).trim().optional().nullable(),
  description: z.string().min(5, "La description est requise").max(2000).trim(),
  published: z.boolean().default(false),
});

export const coursePatchSchema = z.object({
  price: z.number().nonnegative().optional(),
  isLiveNow: z.boolean().optional(),
  liveSubject: z.string().max(200).trim().optional().nullable(),
  published: z.boolean().optional(),
});

export const contactSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100).trim(),
  email: z.string().email("Adresse email invalide").trim().toLowerCase(),
  subject: z.string().min(3, "Le sujet doit contenir au moins 3 caractères").max(200).trim(),
  category: z.string().min(2, "La catégorie est requise").max(100).trim(),
  message: z.string().min(10, "Le message doit contenir au moins 10 caractères").max(5000).trim(),
});

export const supportTicketSchema = z.object({
  subject: z.string().min(3, "Le sujet doit contenir au moins 3 caractères").max(200).trim(),
  category: z.string().min(2, "La catégorie est requise").max(100).trim(),
  description: z.string().min(10, "La description doit contenir au moins 10 caractères").max(5000).trim(),
  screenshotUrl: z.string().url("URL de capture d'écran invalide").trim().optional().nullable(),
});

export const chapterSchema = z.object({
  title: z.string().min(2, "Le titre est requis").max(200).trim(),
  description: z.string().max(1000).trim().optional().nullable(),
  published: z.boolean().default(false),
  order: z.number().int().optional(),
});

export const chapterPatchSchema = z.object({
  published: z.boolean(),
});

export const sectionSchema = z.object({
  title: z.string().min(2, "Le titre est requis").max(200).trim(),
  description: z.string().max(1000).trim().optional().nullable(),
  parentId: z.string().trim().optional().nullable(),
  chapterId: z.string().trim().optional().nullable(),
  published: z.boolean().default(false),
});

export const sectionPatchSchema = z.object({
  title: z.string().min(2).max(200).trim().optional(),
  description: z.string().max(1000).trim().optional().nullable(),
  published: z.boolean().optional(),
  order: z.number().int().optional(),
});

export const textContentSchema = z.object({
  title: z.string().min(2, "Le titre est requis").max(200).trim(),
  body: z.string().min(1, "Le contenu est requis").max(20000).trim(),
  published: z.boolean().default(false),
});

export const textContentPatchSchema = z.object({
  title: z.string().min(2).max(200).trim().optional(),
  body: z.string().max(20000).trim().optional().nullable(),
  published: z.boolean().optional(),
});

export const quizSchema = z.object({
  moduleId: z.number().int().positive().optional().nullable(),
  sectionId: z.string().trim().optional().nullable(),
  title: z.string().min(2).max(200).trim(),
  published: z.boolean().default(false),
});

export const quizPatchSchema = z.object({
  title: z.string().min(2).max(200).trim().optional(),
  published: z.boolean().optional(),
});

export const quizQuestionSchema = z.object({
  question: z.string().min(2).max(500).trim(),
  options: z.array(z.string().min(1).max(200).trim()).min(2).max(10),
  answer: z.string().min(1).trim(),
  explanation: z.string().min(2).max(1000).trim(),
});

export const quizAttemptSchema = z.object({
  answers: z.record(z.string(), z.string().trim()),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: strongPasswordField,
});

export const academicProfileSchema = z.object({
  title: z.string().max(100).trim().optional().nullable(),
  department: z.string().max(100).trim().optional().nullable(),
  lab: z.string().max(100).trim().optional().nullable(),
  speciality: z.string().max(100).trim().optional().nullable(),
  teachingDomains: z.array(z.string()).optional(),
  researchDomains: z.array(z.string()).optional(),
  bio: z.string().max(2000).trim().optional().nullable(),
  avatarUrl: z.string().url().or(z.literal("")).optional().nullable(),
  links: z.record(z.string(), z.string().url().or(z.literal(""))).optional(),
});

export const liveTokenSchema = z.object({
  courseId: z.number().int().positive(),
});

export const liveMessageSchema = z.object({
  courseId: z.number().int().positive(),
  messageId: z.string().trim().optional(),
  text: z.string().min(1).max(1000).trim(),
});

export const liveEventSchema = z.object({
  courseId: z.number().int().positive(),
  action: z.enum([
    "RAISE_HAND",
    "LOWER_HAND",
    "REACTION",
    "QUESTION",
    "RESOURCE_SHARE",
    "WHITEBOARD_UPDATE",
    "RECORDING_REQUESTED",
    "RECORDING_STOPPED",
  ]),
  targetIdentity: z.string().max(200).trim().optional().nullable(),
  targetName: z.string().max(200).trim().optional().nullable(),
  details: z.record(z.string(), z.any()).optional(),
});

export const liveModerationSchema = z.object({
  courseId: z.number().int().positive(),
  action: z.enum(["MUTE_AUDIO", "MUTE_VIDEO", "REMOVE_PARTICIPANT", "GRANT_SPEECH", "REVOKE_SPEECH"]),
  targetIdentity: z.string().min(1).max(200).trim(),
  targetName: z.string().max(200).trim().optional().nullable(),
  trackSid: z.string().max(200).trim().optional().nullable(),
});

export const liveAttendanceLeaveSchema = z.object({
  courseId: z.number().int().positive(),
});

export const AUTH_LOCKOUT_WINDOW_MS = Number(process.env.AUTH_LOCKOUT_WINDOW_MS) || 60 * 1000;
export const isSecurityRuntimeTest = process.env.SECURITY_RUNTIME_TEST === "1";
