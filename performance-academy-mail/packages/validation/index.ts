import { z } from "zod";

export const emailAddressRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const emailPrioritySchema = z.enum(["critical", "high", "normal", "low"]).default("normal");

export const emailAttachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  content: z.string().min(1), // Base64
  contentType: z.string().min(3).max(128),
});

export const sendEmailSchema = z.object({
  from: z.string().regex(emailAddressRegex, "Format d'adresse expéditeur invalide").optional(),
  to: z.union([
    z.string().regex(emailAddressRegex, "Format d'adresse e-mail invalide"),
    z.array(z.string().regex(emailAddressRegex, "Format d'adresse e-mail invalide")).min(1).max(50),
  ]),
  replyTo: z.string().regex(emailAddressRegex, "Format d'adresse reply-to invalide").optional(),
  subject: z.string().min(1, "L'objet est obligatoire").max(998, "L'objet ne doit pas dépasser 998 caractères"),
  text: z.string().optional(),
  html: z.string().optional(),
  template: z.string().min(1).max(64).optional(),
  variables: z.record(z.string(), z.any()).optional(),
  priority: emailPrioritySchema,
  attachments: z.array(emailAttachmentSchema).max(10).optional(),
  idempotencyKey: z.string().min(8).max(128).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
}).refine(
  (data) => Boolean(data.text || data.html || data.template),
  {
    message: "Le message doit contenir au moins un corps 'text', 'html' ou un 'template'.",
    path: ["html"],
  }
);

export const bulkEmailSchema = z.object({
  from: z.string().regex(emailAddressRegex, "Format d'adresse expéditeur invalide").optional(),
  recipients: z.array(z.string().regex(emailAddressRegex, "Format d'adresse e-mail invalide")).min(1).max(500),
  subject: z.string().min(1).max(998),
  text: z.string().optional(),
  html: z.string().optional(),
  template: z.string().min(1).max(64).optional(),
  variables: z.record(z.string(), z.any()).optional(),
  priority: emailPrioritySchema,
});

export const suppressionSchema = z.object({
  email: z.string().regex(emailAddressRegex, "Adresse e-mail invalide"),
  reason: z.enum(["HARD", "SOFT", "POLICY", "SPAM_COMPLAINT", "UNKNOWN"]).default("HARD"),
  details: z.string().max(500).optional(),
});

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
