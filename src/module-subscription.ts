import { Prisma, type PaymentProvider } from "@prisma/client";
import { isEnrollmentActive } from "./enrollment-access";
import { releasePromoCodeReservationInTransaction } from "./promo-code-service";

type TransactionClient = Prisma.TransactionClient;

export class ActiveEnrollmentExistsError extends Error {
  constructor() {
    super("ACTIVE_ENROLLMENT_EXISTS");
    this.name = "ActiveEnrollmentExistsError";
  }
}

export type ActivateModuleSubscriptionInput = {
  userId: string;
  courseId: number;
  courseTitle: string;
  amountMad: number;
  provider: PaymentProvider;
  externalId: string;
  invoiceId: string;
  activatedAt: Date;
  enrollmentEndDate: Date | null;
  hasAiAccess: boolean;
  excludeCenterRequestId?: string;
};

/** Serialize every payment source competing to activate access for the same student. */
export async function lockModuleSubscriptionScopeInTransaction(tx: TransactionClient, userId: string) {
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "AxelmondResearchLab"."User" WHERE "id" = ${userId} FOR UPDATE`);
}

export async function cancelOpenCenterPaymentRequestsInTransaction(
  tx: TransactionClient,
  input: { userId: string; courseId: number; excludeRequestId?: string; reason?: string },
) {
  const reason = input.reason || "Module déjà payé en ligne";
  const requests = await tx.centerPaymentRequest.findMany({
    where: {
      userId: input.userId,
      courseId: input.courseId,
      status: { in: ["PENDING_PAYMENT", "UNDER_REVIEW"] },
      ...(input.excludeRequestId ? { id: { not: input.excludeRequestId } } : {}),
    },
    select: { id: true, publicReference: true, status: true },
  });
  if (requests.length === 0) return [];

  const cancelled = [];
  for (const request of requests) {
    const claimed = await tx.centerPaymentRequest.updateMany({
      where: { id: request.id, status: request.status },
      data: { status: "CANCELLED", openRequestKey: null, publicReason: reason },
    });
    if (claimed.count !== 1) continue;
    const promoUsage = await tx.promoCodeUsage.findUnique({
      where: { centerPaymentRequestId: request.id },
      select: { id: true },
    });
    if (promoUsage) await releasePromoCodeReservationInTransaction(tx, promoUsage.id, true);
    cancelled.push(request);
    await tx.centerPaymentStatusHistory.create({
      data: {
        centerPaymentRequestId: request.id,
        previousStatus: request.status,
        newStatus: "CANCELLED",
        actorType: "SYSTEM",
        reason: "MODULE_ALREADY_ACTIVATED",
        publicReason: reason,
      },
    });
  }
  if (cancelled.length === 0) return [];
  await tx.notification.create({
    data: {
      userId: input.userId,
      type: "CENTER_PAYMENT_CANCELLED",
      title: "Demande de paiement au centre annulée",
      body: reason,
      actionUrl: "/student/payments",
      metadata: { references: cancelled.map((request) => request.publicReference), courseId: input.courseId },
    },
  });
  return cancelled;
}

export async function activateModuleSubscriptionInTransaction(
  tx: TransactionClient,
  input: ActivateModuleSubscriptionInput,
) {
  await lockModuleSubscriptionScopeInTransaction(tx, input.userId);
  const existingPayment = await tx.payment.findUnique({
    where: { provider_externalId: { provider: input.provider, externalId: input.externalId } },
    include: { invoice: true },
  });
  const existingEnrollment = await tx.enrollment.findUnique({
    where: { userId_courseId: { userId: input.userId, courseId: input.courseId } },
  });

  if (existingPayment) {
    const enrollment = await tx.enrollment.upsert({
      where: { userId_courseId: { userId: input.userId, courseId: input.courseId } },
      update: {
        active: true,
        startDate: input.activatedAt,
        endDate: input.enrollmentEndDate,
        hasAiAccess: input.hasAiAccess,
      },
      create: {
        userId: input.userId,
        courseId: input.courseId,
        active: true,
        startDate: input.activatedAt,
        endDate: input.enrollmentEndDate,
        hasAiAccess: input.hasAiAccess,
      },
    });
    await cancelOpenCenterPaymentRequestsInTransaction(tx, {
      userId: input.userId,
      courseId: input.courseId,
      excludeRequestId: input.excludeCenterRequestId,
    });
    return { duplicate: true as const, payment: existingPayment, invoice: existingPayment.invoice, enrollment };
  }

  if (existingEnrollment && isEnrollmentActive(existingEnrollment, input.activatedAt)) {
    throw new ActiveEnrollmentExistsError();
  }

  const payment = await tx.payment.create({
    data: {
      userId: input.userId,
      courseId: input.courseId,
      provider: input.provider,
      externalId: input.externalId,
      amountMad: input.amountMad,
      invoice: {
        create: {
          id: input.invoiceId,
          userId: input.userId,
          courseTitle: input.courseTitle,
          amountMad: input.amountMad,
          status: "Payé",
          issuedAt: input.activatedAt,
        },
      },
    },
    include: { invoice: true },
  });
  const enrollment = await tx.enrollment.upsert({
    where: { userId_courseId: { userId: input.userId, courseId: input.courseId } },
    update: {
      active: true,
      startDate: input.activatedAt,
      endDate: input.enrollmentEndDate,
      hasAiAccess: input.hasAiAccess,
    },
    create: {
      userId: input.userId,
      courseId: input.courseId,
      active: true,
      startDate: input.activatedAt,
      endDate: input.enrollmentEndDate,
      hasAiAccess: input.hasAiAccess,
    },
  });

  await cancelOpenCenterPaymentRequestsInTransaction(tx, {
    userId: input.userId,
    courseId: input.courseId,
    excludeRequestId: input.excludeCenterRequestId,
  });
  return { duplicate: false as const, payment, invoice: payment.invoice, enrollment };
}
