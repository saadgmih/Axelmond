import type { PaymentProvider } from "@prisma/client";
import { prisma } from "./db";
import type { Invoice } from "./types";
import { buildEnrollmentEndDate } from "./enrollment-access";
import { activateModuleSubscriptionInTransaction } from "./module-subscription";
import { confirmPromoCodeUsageInTransaction } from "./promo-code-service";

export const APP_USER_BILLING_INCLUDE = {
  enrollments: true,
  invoiceRecords: { orderBy: { issuedAt: "desc" as const } },
} as const;

/** Auth middleware: limit invoice history loaded per user to reduce RAM. */
export const AUTH_USER_INCLUDE = {
  enrollments: true,
  invoiceRecords: { orderBy: { issuedAt: "desc" as const }, take: 25 },
} as const;

export function buildCourseInvoiceId(prefix: "PAYPAL" | "MOCK" | "REG" | "FREE"): string {
  return `INV-${prefix}-${Math.floor(Math.random() * 90000 + 10000)}`;
}

export type CoursePaymentEnrollmentInput = {
  userId: string;
  courseId: number;
  courseTitle: string;
  coursePrice: number;
  invoiceId: string;
  provider: PaymentProvider;
  externalId: string;
  auditAction: string;
  reqIp?: string;
  enrollmentEndDate?: Date | null;
  hasAiAccess?: boolean;
  promoUsageId?: string;
  allowInactiveReservedPromo?: boolean;
};

export function serializeInvoiceRecord(invoice: {
  id: string;
  courseTitle: string;
  amountMad: number;
  status: string;
  issuedAt: Date;
}): Invoice {
  return {
    id: invoice.id,
    date: invoice.issuedAt.toLocaleDateString("fr-FR"),
    courseTitle: invoice.courseTitle,
    amount: invoice.amountMad,
    status: invoice.status === "Remboursé" ? "Remboursé" : "Payé",
  };
}

export function mergeUserInvoices(user: {
  invoiceRecords?: Array<{
    id: string;
    courseTitle: string;
    amountMad: number;
    status: string;
    issuedAt: Date;
  }>;
}) {
  return Array.isArray(user.invoiceRecords) ? user.invoiceRecords.map(serializeInvoiceRecord) : [];
}

export async function persistCoursePaymentEnrollment(
  params: CoursePaymentEnrollmentInput,
  deps: {
    logAudit: (
      userId: string,
      userEmail: string,
      action: string,
      resource: string,
      resourceId: string,
      details: Record<string, unknown>,
      ip?: string,
    ) => Promise<void>;
    invalidateAuthUserCache: (userId: string) => void;
  },
) {
  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }
  const activatedAt = new Date();
  const enrollmentEndDate =
    typeof params.enrollmentEndDate === "undefined" ? buildEnrollmentEndDate(activatedAt) : params.enrollmentEndDate;
  const hasAiAccess = Boolean(params.hasAiAccess);

  const execute = () =>
    prisma.$transaction(async (tx) => {
      const activation = await activateModuleSubscriptionInTransaction(tx, {
        userId: params.userId,
        courseId: params.courseId,
        courseTitle: params.courseTitle,
        amountMad: params.coursePrice,
        provider: params.provider,
        externalId: params.externalId,
        invoiceId: params.invoiceId,
        activatedAt,
        enrollmentEndDate,
        hasAiAccess,
      });
      if (params.promoUsageId) {
        await confirmPromoCodeUsageInTransaction(tx, {
          usageId: params.promoUsageId,
          paymentId: activation.payment.id,
          idempotencyKey: `payment:${params.provider}:${params.externalId}`,
          allowInactiveReservedPromo: Boolean(params.allowInactiveReservedPromo),
        });
      }
      const updatedUser = await tx.user.findUnique({
        where: { id: params.userId },
        include: APP_USER_BILLING_INCLUDE,
      });
      if (!updatedUser) throw new Error("USER_NOT_FOUND");
      return { activation, updatedUser };
    });

  let result: Awaited<ReturnType<typeof execute>>;
  try {
    result = await execute();
  } catch (err: any) {
    if (err?.code !== "P2002") throw err;
    const racedPayment = await prisma.payment.findUnique({
      where: { provider_externalId: { provider: params.provider, externalId: params.externalId } },
      select: { id: true },
    });
    if (!racedPayment) throw err;
    result = await execute();
  }

  deps.invalidateAuthUserCache(params.userId);
  if (!result.activation.duplicate) {
    await deps.logAudit(
      params.userId,
      user.email,
      params.auditAction,
      "Course",
      String(params.courseId),
      {
        price: params.coursePrice,
        invoiceId: params.invoiceId,
        provider: params.provider,
        externalId: params.externalId,
      },
      params.reqIp,
    );
  }

  return {
    duplicate: result.activation.duplicate,
    user: result.updatedUser,
    invoice: result.activation.invoice ? serializeInvoiceRecord(result.activation.invoice) : null,
  };
}
