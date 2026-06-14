import type { PaymentProvider } from "@prisma/client";
import { prisma } from "./db";

export const APP_USER_BILLING_INCLUDE = {
  enrollments: true,
  invoiceRecords: { orderBy: { issuedAt: "desc" as const } },
} as const;

export function buildCourseInvoiceId(prefix: "PAYPAL" | "MOCK" | "REG"): string {
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
  invoices?: unknown;
  invoiceRecords?: Array<{
    id: string;
    courseTitle: string;
    amountMad: number;
    status: string;
    issuedAt: Date;
  }>;
}) {
  const fromDb = Array.isArray(user.invoiceRecords)
    ? user.invoiceRecords.map(serializeInvoiceRecord)
    : [];
  const legacy = Array.isArray(user.invoices) ? user.invoices as Array<Record<string, unknown>> : [];
  const merged = [...fromDb];
  for (const invoice of legacy) {
    const id = typeof invoice?.id === "string" ? invoice.id : "";
    if (id && !merged.some((entry) => entry.id === id)) {
      merged.push({
        id,
        date: typeof invoice.date === "string" ? invoice.date : "",
        courseTitle: typeof invoice.courseTitle === "string" ? invoice.courseTitle : "",
        amount: typeof invoice.amount === "number" ? invoice.amount : 0,
        status: typeof invoice.status === "string" ? invoice.status : "",
      });
    }
  }
  return merged;
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
    return {
      duplicate: true as const,
      user: existingPayment.user,
      invoice: existingPayment.invoice
        ? serializeInvoiceRecord(existingPayment.invoice)
        : null,
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
              id: params.invoiceId,
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

      const legacyInvoices = Array.isArray(user.invoices) ? (user.invoices as any[]) : [];
      if (!legacyInvoices.some((invoice) => invoice?.id === params.invoiceId)) {
        await tx.user.update({
          where: { id: params.userId },
          data: {
            invoices: [
              ...legacyInvoices,
              {
                id: params.invoiceId,
                date: payment.invoice!.issuedAt.toLocaleDateString("fr-FR"),
                courseTitle: params.courseTitle,
                amount: params.coursePrice,
                status: "Payé",
              },
            ],
          },
        });
      }

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
      { price: params.coursePrice, invoiceId: params.invoiceId, provider: params.provider, externalId: params.externalId },
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
        return {
          duplicate: true as const,
          user: racedPayment.user,
          invoice: racedPayment.invoice
            ? serializeInvoiceRecord(racedPayment.invoice)
            : null,
        };
      }
    }
    throw err;
  }
}
