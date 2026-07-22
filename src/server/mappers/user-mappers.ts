import express from "express";
import { Prisma } from "@prisma/client";
import { DEFAULT_STUDENT_LABEL } from "../../types";
import { UserRole, canAccessAcademicProfile, normalizeRole } from "../../rbac";
import { verifyAuthToken } from "../../auth-token";
import {
  EMAIL_VERIFICATION_TTL_MINUTES,
  generateEmailVerificationCode,
  hashEmailVerificationCode,
  buildEmailVerificationExpiry,
  isDevVerificationCodeLogEnabled,
  maskEmailForDevLog,
} from "../../email-verification";
import { sendVerificationEmail, getEmailErrorDetails, getSmtpPublicConfig } from "../../email";
import { prisma } from "../../db";
import { mergeUserInvoices } from "../../course-payments";
import { getActiveEnrolledCourseIds } from "../../enrollment-access";
import { resolveCachedAuthDbUser } from "../auth-user-cache";
import { logEmail } from "../route-loggers";
import type { AppUser } from "../route-types";
import { toCourse, courseResponseInclude } from "./catalog-mappers";

export function toAppUser(user: any): AppUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    emailVerified: Boolean(user.emailVerified),
    levelOrTitle: user.levelOrTitle || (user.role === "STUDENT" ? DEFAULT_STUDENT_LABEL : "Enseignant Docteur"),
    filiere: user.filiere || undefined,
    avatarUrl: user.avatarUrl || undefined,
    enrolledCourses: Array.isArray(user.enrollments) ? getActiveEnrolledCourseIds(user.enrollments) : [],
    invoices: mergeUserInvoices(user),
  };
}

export async function getOptionalAuthDbUser(req: express.Request) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const session = verifyAuthToken(token);
  if (!session) return null;

  const dbUser = await resolveCachedAuthDbUser({
    userId: session.userId,
    authTokenVersion: session.authTokenVersion,
  });
  const actualRole = normalizeRole(dbUser?.role);
  if (!dbUser || actualRole !== session.role) return null;
  if (!dbUser.emailVerified) return null;
  return dbUser;
}

export async function getOptionalAuthUser(req: express.Request) {
  const dbUser = await getOptionalAuthDbUser(req);
  return dbUser ? toAppUser(dbUser) : null;
}

export async function ensureAcademicProfileForUser(
  client: any,
  user: { id: string; role: UserRole; levelOrTitle?: string | null },
) {
  if (!canAccessAcademicProfile(user.role)) return null;
  return client.academicProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      title: user.levelOrTitle || "Professeur",
      teachingDomains: [],
      researchDomains: [],
      links: {},
    },
  });
}

export function toAcademicProfile(profile: any) {
  return {
    id: profile.id,
    userId: profile.userId,
    title: profile.title || "",
    department: profile.department || "",
    lab: profile.lab || "",
    speciality: profile.speciality || "",
    teachingDomains: Array.isArray(profile.teachingDomains) ? profile.teachingDomains : [],
    researchDomains: Array.isArray(profile.researchDomains) ? profile.researchDomains : [],
    bio: profile.bio || "",
    avatarUrl: profile.avatarUrl || "",
    links: profile.links && typeof profile.links === "object" ? profile.links : {},
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export async function getAcademicProfileResponse(authUser: AppUser) {
  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { academicProfile: true },
  });
  if (!dbUser) return null;
  const profile = dbUser.academicProfile || (await ensureAcademicProfileForUser(prisma, dbUser));
  const [courses, lives, publishedContentsCount] = await Promise.all([
    prisma.course.findMany({
      where: {
        OR: [{ createdById: authUser.id }, { instructor: dbUser.fullName }],
      },
      select: { id: true, title: true, published: true, liveSubject: true },
      orderBy: { id: "asc" },
    }),
    prisma.liveSession.findMany({
      where: { professorId: authUser.id },
      select: {
        id: true,
        roomName: true,
        courseId: true,
        isActive: true,
        startTime: true,
        endTime: true,
        course: { select: { title: true } },
      },
      orderBy: { startTime: "desc" },
      take: 12,
    }),
    prisma.lessonContent.count({
      where: { createdById: authUser.id, published: true },
    }),
  ]);
  return {
    user: {
      id: dbUser.id,
      fullName: dbUser.fullName,
      email: dbUser.email,
      role: dbUser.role,
      avatarUrl: dbUser.avatarUrl || undefined,
    },
    // User.avatarUrl is the canonical source used by the authenticated session.
    // Keeping the profile response aligned prevents an old AcademicProfile value
    // from replacing the current avatar when the rest of the profile is saved.
    profile: toAcademicProfile({ ...profile, avatarUrl: dbUser.avatarUrl }),
    courses,
    lives: lives.map((live) => ({
      id: live.id,
      roomName: live.roomName,
      courseId: live.courseId,
      active: live.isActive,
      startedAt: live.startTime,
      endedAt: live.endTime,
      course: live.course,
    })),
    publishedContentsCount,
  };
}

export function getEmailDomain(email: string) {
  return email.includes("@") ? (email.split("@").pop() ?? "unknown") : "unknown";
}

export async function createEmailVerificationCode(
  client: any,
  userId: string,
  code: string,
  purpose: "EMAIL_VERIFY" | "PASSWORD_RESET" = "EMAIL_VERIFY",
) {
  await client.emailVerificationCode.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });
  return client.emailVerificationCode.create({
    data: {
      userId,
      codeHash: hashEmailVerificationCode(code),
      expiresAt: buildEmailVerificationExpiry(),
      purpose,
    },
  });
}

export async function recordEmailDeliveryLog(purpose: string, userId: string | null, recipient: string, delivery: any) {
  try {
    await prisma.emailDeliveryLog.create({
      data: {
        userId,
        purpose,
        recipientDomain: getEmailDomain(recipient),
        smtp: (delivery.smtp || getSmtpPublicConfig()) as Prisma.InputJsonValue,
        messageId: delivery.messageId,
        accepted: (delivery.accepted || []) as Prisma.InputJsonValue,
        rejected: (delivery.rejected || []) as Prisma.InputJsonValue,
        envelope: delivery.envelope as Prisma.InputJsonValue,
        response: delivery.response,
        providerStatus: delivery.providerStatus || "UNKNOWN",
      },
    });
  } catch (err) {
    logEmail("WARN", "Email delivery log persistence failed", {
      purpose,
      userId,
      recipientDomain: getEmailDomain(recipient),
      error: getEmailErrorDetails(err),
    });
  }
}

export function buildFailedEmailDelivery(recipient: string, response: unknown) {
  return {
    smtp: getSmtpPublicConfig(),
    messageId: null,
    accepted: [],
    rejected: [recipient],
    envelope: {
      from: process.env.SMTP_USER || null,
      to: [recipient],
    },
    response: typeof response === "string" ? response : JSON.stringify(response),
    providerStatus: "FAILED",
  };
}

export async function sendEmailVerificationCode(user: { id: string; email: string; fullName: string }) {
  const code = generateEmailVerificationCode();
  if (isDevVerificationCodeLogEnabled()) {
    console.log(`[DEV] Code de vérification envoyé à ${maskEmailForDevLog(user.email)} (userId=${user.id})`);
  }
  await createEmailVerificationCode(prisma, user.id, code);
  try {
    const delivery = await sendVerificationEmail({
      to: user.email,
      fullName: user.fullName,
      code,
      expiresInMinutes: EMAIL_VERIFICATION_TTL_MINUTES,
    });
    logEmail(
      delivery.sent ? "INFO" : "WARN",
      delivery.sent ? "Verification email sent" : "SMTP not configured for verification email",
      {
        userId: user.id,
        emailDomain: getEmailDomain(user.email),
        delivery: delivery.sent ? delivery.delivery : undefined,
      },
    );
    if (!delivery.sent) {
      await recordEmailDeliveryLog(
        "email_verification",
        user.id,
        user.email,
        buildFailedEmailDelivery(user.email, delivery.reason),
      );
    }
    if (delivery.sent) {
      await recordEmailDeliveryLog("email_verification", user.id, user.email, delivery.delivery);
    }
    return delivery;
  } catch (err) {
    logEmail("ERROR", "Verification email send failed", {
      userId: user.id,
      emailDomain: getEmailDomain(user.email),
      smtp: getSmtpPublicConfig(),
      error: getEmailErrorDetails(err),
    });
    await recordEmailDeliveryLog(
      "email_verification",
      user.id,
      user.email,
      buildFailedEmailDelivery(user.email, getEmailErrorDetails(err)),
    );
    return { sent: false, reason: "SMTP_SEND_FAILED" as const };
  }
}

export function professorInviteSnapshot(invite: any) {
  const usedByName = invite.usedBy?.fullName || null;
  const usedByEmail = invite.usedBy?.email || null;
  return {
    code: invite.code,
    createdAt: invite.createdAt?.toISOString?.() || invite.createdAt,
    usedBy: usedByEmail,
    usedByName,
    usedByEmail,
    usedAt: invite.usedAt?.toISOString?.() || invite.usedAt,
    revokedAt: invite.revokedAt?.toISOString?.() || invite.revokedAt,
  };
}

export function emailDeliveryLogSnapshot(log: any) {
  const envelope = log.envelope || {};
  return {
    id: log.id,
    purpose: log.purpose,
    to: Array.isArray(envelope.to) ? envelope.to : log.accepted,
    envelopeFrom: envelope.from || null,
    envelopeTo: envelope.to || null,
    messageId: log.messageId,
    accepted: log.accepted,
    rejected: log.rejected,
    response: log.response,
    providerStatus: log.providerStatus,
    createdAt: log.createdAt?.toISOString?.() || log.createdAt,
  };
}

export async function findCourse(courseId: number) {
  const course = await prisma.course.findUnique({ where: { id: courseId }, include: courseResponseInclude });
  return course ? toCourse(course) : null;
}
