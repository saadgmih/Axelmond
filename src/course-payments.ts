import type { PaymentProvider } from "@prisma/client";
import { prisma } from "./db";

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
};

export function serializeInvoiceRecord(invoice: {
  id: string;
  courseTitle: string;
  amountMad: number;
  status: string;
  issuedAt: Date;
}) {
  return {
    id: invoice.id,
    date: invoice.issuedAt.toLocaleDateString("fr-FR"),
    courseTitle: invoice.courseTitle,
    amount: invoice.amountMad,
    status: invoice.status,
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

  const existingPayment = await prisma.payment.findUnique({
    where: {
      provider_externalId: {
        provider: params.provider,
        externalId: params.externalId,
      },
    },
    include: {
      invoice: true,
      user: { include: APP_USER_BILLING_INCLUDE },
    },
  });

  if (existingPayment) {
    const user = await prisma.$transaction(async (tx) => {
      await tx.enrollment.upsert({
        where: { userId_courseId: { userId: params.userId, courseId: params.courseId } },
        update: { active: true },
        create: { userId: params.userId, courseId: params.courseId, active: true },
      });
      return tx.user.findUnique({
        where: { id: params.userId },
        include: APP_USER_BILLING_INCLUDE,
      });
    });
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }
    deps.invalidateAuthUserCache(params.userId);
    return {
      duplicate: true as const,
      user,
      invoice: existingPayment.invoice ? serializeInvoiceRecord(existingPayment.invoice) : null,
    };
  }

  const newInvoicePayload = {
    id: params.invoiceId,
    courseTitle: params.courseTitle,
    amountMad: params.coursePrice,
    status: "Payé",
  };

  try {
    let persistedInvoice: {
      id: string;
      courseTitle: string;
      amountMad: number;
      status: string;
      issuedAt: Date;
    } | null = null;

    const updatedUser = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          userId: params.userId,
          courseId: params.courseId,
          provider: params.provider,
          externalId: params.externalId,
          amountMad: params.coursePrice,
          invoice: {
            create: {
              userId: params.userId,
              ...newInvoicePayload,
            },
          },
        },
        include: { invoice: true },
      });
      persistedInvoice = payment.invoice!;

      await tx.enrollment.upsert({
        where: { userId_courseId: { userId: params.userId, courseId: params.courseId } },
        update: { active: true },
        create: { userId: params.userId, courseId: params.courseId, active: true },
      });

      return tx.user.findUnique({
        where: { id: params.userId },
        include: APP_USER_BILLING_INCLUDE,
      });
    });

    if (!updatedUser) {
      throw new Error("USER_NOT_FOUND");
    }

    deps.invalidateAuthUserCache(params.userId);
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

    return {
      duplicate: false as const,
      user: updatedUser,
      invoice: persistedInvoice
        ? serializeInvoiceRecord(persistedInvoice)
        : serializeInvoiceRecord({
            id: params.invoiceId,
            courseTitle: params.courseTitle,
            amountMad: params.coursePrice,
            status: "Payé",
            issuedAt: new Date(),
          }),
    };
  } catch (err: any) {
    if (err?.code === "P2002") {
      const racedPayment = await prisma.payment.findUnique({
        where: {
          provider_externalId: {
            provider: params.provider,
            externalId: params.externalId,
          },
        },
        include: {
          invoice: true,
          user: { include: APP_USER_BILLING_INCLUDE },
        },
      });
      if (racedPayment) {
        const user = await prisma.$transaction(async (tx) => {
          await tx.enrollment.upsert({
            where: { userId_courseId: { userId: params.userId, courseId: params.courseId } },
            update: { active: true },
            create: { userId: params.userId, courseId: params.courseId, active: true },
          });
          return tx.user.findUnique({
            where: { id: params.userId },
            include: APP_USER_BILLING_INCLUDE,
          });
        });
        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }
        deps.invalidateAuthUserCache(params.userId);
        return {
          duplicate: true as const,
          user,
          invoice: racedPayment.invoice ? serializeInvoiceRecord(racedPayment.invoice) : null,
        };
      }
    }
    throw err;
  }
}
