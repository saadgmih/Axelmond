import type { CenterPaymentMethod, CenterPaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "./db";
import { getCenterPaymentConfig } from "./center-payment-config";
import {
  buildCenterPaymentExpiry,
  canTransitionCenterPayment,
  centerPaymentAmountsMatch,
  CENTER_PAYMENT_OPEN_STATUSES,
  generateCenterPaymentReference,
  generateCenterReceiptNumber,
  normalizeCenterPaymentNote,
} from "./center-payment-domain";
import { buildEnrollmentEndDate, isEnrollmentActive } from "./enrollment-access";
import { computeCourseCheckoutTotalMad, resolveEnrollmentHasAiAccess } from "./utils/ai-tutor-pricing";
import {
  activateModuleSubscriptionInTransaction,
  lockModuleSubscriptionScopeInTransaction,
} from "./module-subscription";
import { resolveCourseChargeAmount } from "./promo-codes";

const centerPaymentInclude = {
  user: { select: { id: true, fullName: true, email: true } },
  course: { select: { id: true, title: true, price: true, description: true } },
  validatedBy: { select: { id: true, fullName: true, email: true } },
  payment: { include: { invoice: true } },
  enrollment: true,
  history: {
    orderBy: { createdAt: "asc" as const },
    include: { changedBy: { select: { id: true, fullName: true, email: true } } },
  },
} as const;

export class CenterPaymentError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "CenterPaymentError";
  }
}

type CenterPaymentRecord = Prisma.CenterPaymentRequestGetPayload<{ include: typeof centerPaymentInclude }>;

function receiptSnapshot(record: CenterPaymentRecord) {
  if (!record.generatedReceiptNumber || !record.validatedAt || !record.paymentMethod || !record.enrollment) return null;
  const config = getCenterPaymentConfig();
  return {
    centerName: config.centerName,
    receiptNumber: record.generatedReceiptNumber,
    requestReference: record.publicReference,
    studentName: record.user.fullName,
    studentEmail: record.user.email,
    moduleTitle: record.moduleTitleSnapshot,
    amount: record.receivedAmountMad ?? record.amountMad,
    currency: record.currency,
    paymentMethod: record.paymentMethod,
    validatedAt: record.validatedAt.toISOString(),
    accessDurationDays: record.accessDurationDaysSnapshot,
    accessEndsAt: record.enrollment.endDate?.toISOString() || null,
    validatedBy: record.validatedBy?.fullName || "Administration du centre",
    status: record.status === "REFUNDED" ? "REMBOURSÉ" : "PAYÉ",
  };
}

export function serializeCenterPaymentRequest(record: CenterPaymentRecord, admin = false) {
  const base = {
    reference: record.publicReference,
    module: { id: record.courseId, title: record.moduleTitleSnapshot, description: record.moduleDescriptionSnapshot },
    amount: record.amountMad,
    currency: record.currency,
    modulePriceSnapshot: record.modulePriceSnapshot,
    accessDurationDays: record.accessDurationDaysSnapshot,
    includesAiAssistant: record.hasAiAccessSnapshot,
    status: record.status,
    expiresAt: record.expiresAt.toISOString(),
    paidAt: record.paidAt?.toISOString() || null,
    validatedAt: record.validatedAt?.toISOString() || null,
    paymentMethod: record.paymentMethod,
    generatedReceiptNumber: record.generatedReceiptNumber,
    publicReason: record.publicReason,
    studentNote: record.studentNote,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    subscriptionId: record.enrollmentId,
    accessEndsAt: record.enrollment?.endDate?.toISOString() || null,
    receipt: receiptSnapshot(record),
    center: getCenterPaymentConfig(),
  };
  if (!admin) {
    return {
      ...base,
      history: record.history.map((entry) => ({
        previousStatus: entry.previousStatus,
        newStatus: entry.newStatus,
        publicReason: entry.publicReason,
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  }
  return {
    ...base,
    id: record.id,
    student: record.user,
    currentModulePrice: record.course.price,
    receivedAmount: record.receivedAmountMad,
    physicalReceiptReference: record.physicalReceiptReference,
    adminNote: record.adminNote,
    validatedBy: record.validatedBy,
    paymentId: record.paymentId,
    history: record.history.map((entry) => ({
      id: entry.id,
      previousStatus: entry.previousStatus,
      newStatus: entry.newStatus,
      actorType: entry.actorType,
      reason: entry.reason,
      publicReason: entry.publicReason,
      internalNote: entry.internalNote,
      changedBy: entry.changedBy,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export async function expireCenterPaymentRequests(input: { userId?: string; reference?: string; now?: Date } = {}) {
  const now = input.now || new Date();
  return prisma.$transaction(async (tx) => {
    const expired = await tx.centerPaymentRequest.findMany({
      where: {
        ...(input.userId ? { userId: input.userId } : {}),
        ...(input.reference ? { publicReference: input.reference } : {}),
        status: { in: CENTER_PAYMENT_OPEN_STATUSES },
        expiresAt: { lte: now },
      },
      select: { id: true, userId: true, publicReference: true, status: true },
    });
    let claimedCount = 0;
    for (const request of expired) {
      const claimed = await tx.centerPaymentRequest.updateMany({
        where: { id: request.id, status: request.status, expiresAt: { lte: now } },
        data: {
          status: "EXPIRED",
          openRequestKey: null,
          publicReason: "Délai de paiement dépassé",
        },
      });
      if (claimed.count !== 1) continue;
      claimedCount += 1;
      await tx.centerPaymentStatusHistory.create({
        data: {
          centerPaymentRequestId: request.id,
          previousStatus: request.status,
          newStatus: "EXPIRED",
          actorType: "SYSTEM",
          reason: "PAYMENT_DEADLINE_EXPIRED",
          publicReason: "Délai de paiement dépassé",
        },
      });
      await tx.notification.create({
        data: {
          userId: request.userId,
          type: "CENTER_PAYMENT_EXPIRED",
          title: "Demande de paiement expirée",
          body: `La demande ${request.publicReference} a expiré. Vous pouvez en créer une nouvelle.`,
          actionUrl: "/student/payments",
          metadata: { reference: request.publicReference },
        },
      });
    }
    return claimedCount;
  });
}

async function createWithUniqueReference(input: {
  userId: string;
  course: { id: number; title: string; description: string; price: number };
  modulePriceMad: number;
  includeAiAssistant: boolean;
  studentNote: string | null;
  now: Date;
}) {
  const config = getCenterPaymentConfig();
  const openRequestKey = `${input.userId}:${input.course.id}`;
  const amountMad = computeCourseCheckoutTotalMad({
    modulePriceMad: input.modulePriceMad,
    includeAiAssistant: input.includeAiAssistant,
    isFreeModule: input.course.price <= 0,
  });
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const publicReference = generateCenterPaymentReference(input.now);
    try {
      return await prisma.$transaction(async (tx) => {
        await lockModuleSubscriptionScopeInTransaction(tx, input.userId);
        const lockedEnrollment = await tx.enrollment.findUnique({
          where: { userId_courseId: { userId: input.userId, courseId: input.course.id } },
        });
        if (lockedEnrollment && isEnrollmentActive(lockedEnrollment)) {
          throw new CenterPaymentError("ALREADY_ENROLLED", 409, "Ce module est déjà actif");
        }
        const concurrentOpenRequest = await tx.centerPaymentRequest.findUnique({
          where: { openRequestKey },
          include: centerPaymentInclude,
        });
        if (concurrentOpenRequest) {
          return { duplicate: true as const, record: concurrentOpenRequest };
        }
        const request = await tx.centerPaymentRequest.create({
          data: {
            publicReference,
            openRequestKey,
            userId: input.userId,
            courseId: input.course.id,
            amountMad,
            currency: config.currency,
            modulePriceSnapshot: input.modulePriceMad,
            moduleTitleSnapshot: input.course.title,
            moduleDescriptionSnapshot: input.course.description,
            accessDurationDaysSnapshot: config.accessDurationDays,
            hasAiAccessSnapshot: resolveEnrollmentHasAiAccess(input.includeAiAssistant),
            expiresAt: buildCenterPaymentExpiry(input.now, config.expirationDays),
            studentNote: input.studentNote,
          },
        });
        await tx.centerPaymentStatusHistory.create({
          data: {
            centerPaymentRequestId: request.id,
            newStatus: "PENDING_PAYMENT",
            changedByUserId: input.userId,
            actorType: "STUDENT",
            reason: "REQUEST_CREATED",
          },
        });
        await tx.notification.create({
          data: {
            userId: input.userId,
            type: "CENTER_PAYMENT_CREATED",
            title: "Demande de paiement au centre créée",
            body: `Présentez la référence ${publicReference} au centre avant la date d'expiration.`,
            actionUrl: "/student/payments",
            metadata: { reference: publicReference, courseId: input.course.id },
          },
        });
        const record = await tx.centerPaymentRequest.findUniqueOrThrow({
          where: { id: request.id },
          include: centerPaymentInclude,
        });
        return { duplicate: false as const, record };
      });
    } catch (error: any) {
      if (error?.code !== "P2002") throw error;
      const existing = await prisma.centerPaymentRequest.findUnique({
        where: { openRequestKey },
        include: centerPaymentInclude,
      });
      if (existing) return { duplicate: true as const, record: existing };
    }
  }
  throw new CenterPaymentError("REFERENCE_GENERATION_FAILED", 503, "Impossible de générer une référence unique");
}

export async function createCenterPaymentRequest(input: {
  userId: string;
  courseId: number;
  includeAiAssistant?: boolean;
  promoCode?: string;
  studentNote?: unknown;
}) {
  await expireCenterPaymentRequests({ userId: input.userId });
  const course = await prisma.course.findUnique({
    where: { id: input.courseId },
    select: { id: true, title: true, description: true, price: true, published: true },
  });
  if (!course || !course.published) throw new CenterPaymentError("COURSE_NOT_FOUND", 404, "Module non trouvé");
  if (course.price <= 0) throw new CenterPaymentError("FREE_MODULE", 400, "Ce module est accessible gratuitement");
  const pricing = resolveCourseChargeAmount(course.price, input.promoCode || "");
  if (pricing.error) throw new CenterPaymentError("INVALID_PROMO_CODE", 400, pricing.error);

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: input.userId, courseId: input.courseId } },
  });
  if (enrollment && isEnrollmentActive(enrollment)) {
    throw new CenterPaymentError("ALREADY_ENROLLED", 409, "Ce module est déjà actif");
  }
  const existing = await prisma.centerPaymentRequest.findFirst({
    where: { userId: input.userId, courseId: input.courseId, status: { in: CENTER_PAYMENT_OPEN_STATUSES } },
    orderBy: { createdAt: "desc" },
    include: centerPaymentInclude,
  });
  if (existing) return { duplicate: true, request: serializeCenterPaymentRequest(existing) };

  const created = await createWithUniqueReference({
    userId: input.userId,
    course,
    modulePriceMad: pricing.amount,
    includeAiAssistant: Boolean(input.includeAiAssistant),
    studentNote: normalizeCenterPaymentNote(input.studentNote, 500),
    now: new Date(),
  });
  return { duplicate: created.duplicate, request: serializeCenterPaymentRequest(created.record) };
}

export async function listStudentCenterPaymentRequests(userId: string) {
  await expireCenterPaymentRequests({ userId });
  const requests = await prisma.centerPaymentRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: centerPaymentInclude,
  });
  return requests.map((request) => serializeCenterPaymentRequest(request));
}

export async function getStudentCenterPaymentRequest(userId: string, reference: string) {
  await expireCenterPaymentRequests({ userId, reference });
  const request = await prisma.centerPaymentRequest.findFirst({
    where: { userId, publicReference: reference },
    include: centerPaymentInclude,
  });
  if (!request) throw new CenterPaymentError("REQUEST_NOT_FOUND", 404, "Demande introuvable");
  return serializeCenterPaymentRequest(request);
}

async function transitionRequest(input: {
  reference: string;
  toStatus: CenterPaymentStatus;
  actorId?: string;
  actorType: "STUDENT" | "ADMIN" | "SYSTEM";
  reason: string;
  publicReason?: string | null;
  internalNote?: string | null;
  ownerUserId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.centerPaymentRequest.findFirst({
      where: { publicReference: input.reference, ...(input.ownerUserId ? { userId: input.ownerUserId } : {}) },
    });
    if (!request) throw new CenterPaymentError("REQUEST_NOT_FOUND", 404, "Demande introuvable");
    if (!canTransitionCenterPayment(request.status, input.toStatus)) {
      throw new CenterPaymentError("INVALID_STATUS_TRANSITION", 409, "Cette action n'est plus autorisée");
    }
    const claimed = await tx.centerPaymentRequest.updateMany({
      where: { id: request.id, status: request.status },
      data: {
        status: input.toStatus,
        ...(!CENTER_PAYMENT_OPEN_STATUSES.includes(input.toStatus) ? { openRequestKey: null } : {}),
        publicReason: input.publicReason ?? request.publicReason,
        adminNote: input.internalNote ?? request.adminNote,
      },
    });
    if (claimed.count !== 1) throw new CenterPaymentError("CONCURRENT_UPDATE", 409, "La demande a déjà été modifiée");
    await tx.centerPaymentStatusHistory.create({
      data: {
        centerPaymentRequestId: request.id,
        previousStatus: request.status,
        newStatus: input.toStatus,
        changedByUserId: input.actorId,
        actorType: input.actorType,
        reason: input.reason,
        publicReason: input.publicReason,
        internalNote: input.internalNote,
      },
    });
    await tx.notification.create({
      data: {
        userId: request.userId,
        type: `CENTER_PAYMENT_${input.toStatus}`,
        title: centerPaymentNotificationTitle(input.toStatus),
        body: input.publicReason || centerPaymentNotificationBody(input.toStatus, request.publicReference),
        actionUrl: "/student/payments",
        metadata: { reference: request.publicReference, status: input.toStatus },
      },
    });
    return tx.centerPaymentRequest.findUniqueOrThrow({ where: { id: request.id }, include: centerPaymentInclude });
  });
}

function centerPaymentNotificationTitle(status: CenterPaymentStatus) {
  const labels: Partial<Record<CenterPaymentStatus, string>> = {
    UNDER_REVIEW: "Paiement en cours de vérification",
    PAID: "Paiement au centre confirmé",
    REJECTED: "Paiement au centre non validé",
    CANCELLED: "Demande de paiement annulée",
    REFUNDED: "Paiement au centre remboursé",
  };
  return labels[status] || "Mise à jour de votre paiement au centre";
}

function centerPaymentNotificationBody(status: CenterPaymentStatus, reference: string) {
  if (status === "UNDER_REVIEW") return `La demande ${reference} est en cours de vérification.`;
  if (status === "PAID") return `La demande ${reference} est payée et votre accès est actif.`;
  if (status === "REFUNDED") return `Le paiement ${reference} a été remboursé.`;
  return `Le statut de la demande ${reference} a été mis à jour.`;
}

export async function cancelStudentCenterPaymentRequest(userId: string, reference: string) {
  const current = await prisma.centerPaymentRequest.findFirst({
    where: { userId, publicReference: reference },
    select: { status: true },
  });
  if (!current) throw new CenterPaymentError("REQUEST_NOT_FOUND", 404, "Demande introuvable");
  if (current.status !== "PENDING_PAYMENT") {
    throw new CenterPaymentError("INVALID_STATUS_TRANSITION", 409, "Seule une demande en attente peut être annulée");
  }
  const request = await transitionRequest({
    reference,
    toStatus: "CANCELLED",
    actorId: userId,
    actorType: "STUDENT",
    reason: "CANCELLED_BY_STUDENT",
    publicReason: "Demande annulée par l'étudiant",
    ownerUserId: userId,
  });
  return serializeCenterPaymentRequest(request);
}

export async function listAdminCenterPaymentRequests(filters: {
  status?: CenterPaymentStatus;
  query?: string;
  courseId?: number;
  amount?: number;
  validatedByUserId?: string;
  from?: Date;
  to?: Date;
}) {
  await expireCenterPaymentRequests();
  const query = filters.query?.trim();
  const where: Prisma.CenterPaymentRequestWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.courseId ? { courseId: filters.courseId } : {}),
    ...(filters.amount != null ? { amountMad: filters.amount } : {}),
    ...(filters.validatedByUserId ? { validatedByUserId: filters.validatedByUserId } : {}),
    ...(filters.from || filters.to
      ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
      : {}),
    ...(query
      ? {
          OR: [
            { publicReference: { contains: query, mode: "insensitive" } },
            { user: { fullName: { contains: query, mode: "insensitive" } } },
            { user: { email: { contains: query, mode: "insensitive" } } },
            { moduleTitleSnapshot: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const requests = await prisma.centerPaymentRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: centerPaymentInclude,
  });
  return requests.map((request) => serializeCenterPaymentRequest(request, true));
}

export async function getAdminCenterPaymentRequest(reference: string) {
  await expireCenterPaymentRequests({ reference });
  const request = await prisma.centerPaymentRequest.findUnique({
    where: { publicReference: reference },
    include: centerPaymentInclude,
  });
  if (!request) throw new CenterPaymentError("REQUEST_NOT_FOUND", 404, "Demande introuvable");
  return serializeCenterPaymentRequest(request, true);
}

export async function reviewCenterPaymentRequest(adminId: string, reference: string, internalNote?: unknown) {
  const request = await transitionRequest({
    reference,
    toStatus: "UNDER_REVIEW",
    actorId: adminId,
    actorType: "ADMIN",
    reason: "PAYMENT_REVIEW_STARTED",
    internalNote: normalizeCenterPaymentNote(internalNote),
  });
  return serializeCenterPaymentRequest(request, true);
}

export async function rejectCenterPaymentRequest(
  adminId: string,
  reference: string,
  publicReason: string,
  internalNote?: unknown,
) {
  const request = await transitionRequest({
    reference,
    toStatus: "REJECTED",
    actorId: adminId,
    actorType: "ADMIN",
    reason: "PAYMENT_REJECTED",
    publicReason,
    internalNote: normalizeCenterPaymentNote(internalNote),
  });
  return serializeCenterPaymentRequest(request, true);
}

export async function adminCancelCenterPaymentRequest(
  adminId: string,
  reference: string,
  publicReason: string,
  internalNote?: unknown,
) {
  const request = await transitionRequest({
    reference,
    toStatus: "CANCELLED",
    actorId: adminId,
    actorType: "ADMIN",
    reason: "CANCELLED_BY_ADMIN",
    publicReason,
    internalNote: normalizeCenterPaymentNote(internalNote),
  });
  return serializeCenterPaymentRequest(request, true);
}

export async function addCenterPaymentAdminNote(adminId: string, reference: string, note: string) {
  const internalNote = normalizeCenterPaymentNote(note);
  if (!internalNote) throw new CenterPaymentError("NOTE_REQUIRED", 400, "Note interne requise");
  const record = await prisma.$transaction(async (tx) => {
    const request = await tx.centerPaymentRequest.findUnique({ where: { publicReference: reference } });
    if (!request) throw new CenterPaymentError("REQUEST_NOT_FOUND", 404, "Demande introuvable");
    await tx.centerPaymentRequest.update({ where: { id: request.id }, data: { adminNote: internalNote } });
    await tx.centerPaymentStatusHistory.create({
      data: {
        centerPaymentRequestId: request.id,
        previousStatus: request.status,
        newStatus: request.status,
        changedByUserId: adminId,
        actorType: "ADMIN",
        reason: "INTERNAL_NOTE_ADDED",
        internalNote,
      },
    });
    return tx.centerPaymentRequest.findUniqueOrThrow({ where: { id: request.id }, include: centerPaymentInclude });
  });
  return serializeCenterPaymentRequest(record, true);
}

export async function validateCenterPaymentRequest(input: {
  adminId: string;
  reference: string;
  receivedAmount: number;
  paymentMethod: CenterPaymentMethod;
  physicalReceiptReference?: unknown;
  internalNote?: unknown;
  idempotencyKey: string;
}) {
  await expireCenterPaymentRequests({ reference: input.reference });
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const receiptNumber = generateCenterReceiptNumber();
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        let request = await tx.centerPaymentRequest.findUnique({
          where: { publicReference: input.reference },
          include: { enrollment: true },
        });
        if (!request) throw new CenterPaymentError("REQUEST_NOT_FOUND", 404, "Demande introuvable");
        await lockModuleSubscriptionScopeInTransaction(tx, request.userId);
        request = await tx.centerPaymentRequest.findUnique({
          where: { publicReference: input.reference },
          include: { enrollment: true },
        });
        if (!request) throw new CenterPaymentError("REQUEST_NOT_FOUND", 404, "Demande introuvable");
        if (request.status === "PAID" && request.validationIdempotencyKey === input.idempotencyKey) {
          return { conflict: false, idempotent: true, requestId: request.id };
        }
        if (!canTransitionCenterPayment(request.status, "PAID")) {
          throw new CenterPaymentError("INVALID_STATUS_TRANSITION", 409, "Cette demande n'est plus validable");
        }
        if (request.expiresAt <= new Date()) {
          throw new CenterPaymentError("REQUEST_EXPIRED", 409, "Cette demande a expiré");
        }
        if (!centerPaymentAmountsMatch(request.amountMad, input.receivedAmount)) {
          throw new CenterPaymentError(
            "RECEIVED_AMOUNT_MISMATCH",
            400,
            `Le montant reçu doit être exactement ${request.amountMad.toFixed(2)} ${request.currency}`,
          );
        }
        const claimed = await tx.centerPaymentRequest.updateMany({
          where: {
            id: request.id,
            status: request.status,
            validationIdempotencyKey: null,
          },
          data: { validationIdempotencyKey: input.idempotencyKey },
        });
        if (claimed.count !== 1) {
          throw new CenterPaymentError("CONCURRENT_VALIDATION", 409, "Cette demande est déjà en cours de validation");
        }

        const enrollment = await tx.enrollment.findUnique({
          where: { userId_courseId: { userId: request.userId, courseId: request.courseId } },
        });
        if (enrollment && isEnrollmentActive(enrollment)) {
          await tx.centerPaymentRequest.update({
            where: { id: request.id },
            data: { status: "CANCELLED", openRequestKey: null, publicReason: "Module déjà actif" },
          });
          await tx.centerPaymentStatusHistory.create({
            data: {
              centerPaymentRequestId: request.id,
              previousStatus: request.status,
              newStatus: "CANCELLED",
              actorType: "SYSTEM",
              reason: "MODULE_ALREADY_ACTIVATED",
              publicReason: "Module déjà actif",
            },
          });
          await tx.notification.create({
            data: {
              userId: request.userId,
              type: "CENTER_PAYMENT_CANCELLED",
              title: "Demande de paiement annulée",
              body: `La demande ${request.publicReference} a été annulée car le module est déjà actif.`,
              actionUrl: "/student/payments",
              metadata: { reference: request.publicReference, courseId: request.courseId },
            },
          });
          return { conflict: true, idempotent: false, requestId: request.id };
        }

        const activatedAt = new Date();
        const activation = await activateModuleSubscriptionInTransaction(tx, {
          userId: request.userId,
          courseId: request.courseId,
          courseTitle: request.moduleTitleSnapshot,
          amountMad: request.amountMad,
          provider: "CENTER",
          externalId: request.publicReference,
          invoiceId: receiptNumber,
          activatedAt,
          enrollmentEndDate: buildEnrollmentEndDate(activatedAt, request.accessDurationDaysSnapshot),
          hasAiAccess: request.hasAiAccessSnapshot,
          excludeCenterRequestId: request.id,
        });
        await tx.centerPaymentRequest.update({
          where: { id: request.id },
          data: {
            status: "PAID",
            openRequestKey: null,
            paidAt: activatedAt,
            validatedAt: activatedAt,
            validatedByUserId: input.adminId,
            paymentMethod: input.paymentMethod,
            receivedAmountMad: input.receivedAmount,
            physicalReceiptReference: normalizeCenterPaymentNote(input.physicalReceiptReference, 120),
            generatedReceiptNumber: receiptNumber,
            adminNote: normalizeCenterPaymentNote(input.internalNote),
            paymentId: activation.payment.id,
            enrollmentId: activation.enrollment.id,
            publicReason: null,
          },
        });
        await tx.centerPaymentStatusHistory.create({
          data: {
            centerPaymentRequestId: request.id,
            previousStatus: request.status,
            newStatus: "PAID",
            changedByUserId: input.adminId,
            actorType: "ADMIN",
            reason: "PAYMENT_VALIDATED",
            internalNote: normalizeCenterPaymentNote(input.internalNote),
          },
        });
        await tx.notification.create({
          data: {
            userId: request.userId,
            type: "CENTER_PAYMENT_PAID",
            title: "Paiement confirmé — module activé",
            body: `Le paiement ${request.publicReference} est validé. Votre accès est maintenant actif.`,
            actionUrl: "/student/payments",
            metadata: { reference: request.publicReference, courseId: request.courseId, receiptNumber },
          },
        });
        return { conflict: false, idempotent: activation.duplicate, requestId: request.id };
      });

      if (outcome.conflict) {
        throw new CenterPaymentError("ALREADY_ENROLLED", 409, "Le module est déjà actif; la demande a été annulée");
      }
      const request = await prisma.centerPaymentRequest.findUniqueOrThrow({
        where: { id: outcome.requestId },
        include: centerPaymentInclude,
      });
      return { idempotent: outcome.idempotent, request: serializeCenterPaymentRequest(request, true) };
    } catch (error: any) {
      if (error instanceof CenterPaymentError) throw error;
      if (error?.code === "P2002") {
        const current = await prisma.centerPaymentRequest.findUnique({
          where: { publicReference: input.reference },
          include: centerPaymentInclude,
        });
        if (current?.status === "PAID" && current.validationIdempotencyKey === input.idempotencyKey) {
          return { idempotent: true, request: serializeCenterPaymentRequest(current, true) };
        }
        continue;
      }
      throw error;
    }
  }
  throw new CenterPaymentError("VALIDATION_CONFLICT", 409, "La validation n'a pas pu être finalisée");
}

export async function refundCenterPaymentRequest(
  adminId: string,
  reference: string,
  publicReason: string,
  internalNote?: unknown,
) {
  const record = await prisma.$transaction(async (tx) => {
    const request = await tx.centerPaymentRequest.findUnique({
      where: { publicReference: reference },
      include: { payment: { include: { invoice: true } }, enrollment: true },
    });
    if (!request) throw new CenterPaymentError("REQUEST_NOT_FOUND", 404, "Demande introuvable");
    if (!canTransitionCenterPayment(request.status, "REFUNDED")) {
      throw new CenterPaymentError("INVALID_STATUS_TRANSITION", 409, "Ce paiement ne peut pas être remboursé");
    }
    const claimed = await tx.centerPaymentRequest.updateMany({
      where: { id: request.id, status: "PAID" },
      data: { status: "REFUNDED", publicReason, adminNote: normalizeCenterPaymentNote(internalNote) },
    });
    if (claimed.count !== 1) {
      throw new CenterPaymentError("CONCURRENT_UPDATE", 409, "Ce paiement a déjà été modifié");
    }
    if (request.paymentId) {
      await tx.payment.update({ where: { id: request.paymentId }, data: { status: "REFUNDED" } });
      await tx.invoice.updateMany({ where: { paymentId: request.paymentId }, data: { status: "Remboursé" } });
    }
    if (request.enrollment && request.validatedAt) {
      const validationWindowEnd = new Date(request.validatedAt.getTime() + 60_000);
      await tx.enrollment.updateMany({
        where: { id: request.enrollment.id, startDate: { lte: validationWindowEnd } },
        data: { active: false },
      });
    }
    await tx.centerPaymentStatusHistory.create({
      data: {
        centerPaymentRequestId: request.id,
        previousStatus: "PAID",
        newStatus: "REFUNDED",
        changedByUserId: adminId,
        actorType: "ADMIN",
        reason: "PAYMENT_REFUNDED",
        publicReason,
        internalNote: normalizeCenterPaymentNote(internalNote),
      },
    });
    await tx.notification.create({
      data: {
        userId: request.userId,
        type: "CENTER_PAYMENT_REFUNDED",
        title: "Paiement remboursé",
        body: publicReason,
        actionUrl: "/student/payments",
        metadata: { reference },
      },
    });
    return tx.centerPaymentRequest.findUniqueOrThrow({ where: { id: request.id }, include: centerPaymentInclude });
  });
  return serializeCenterPaymentRequest(record, true);
}
