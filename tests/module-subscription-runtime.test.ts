import { describe, expect, it, vi } from "vitest";
import { ActiveEnrollmentExistsError, activateModuleSubscriptionInTransaction } from "../src/module-subscription";

function buildTransaction(
  options: {
    existingPayment?: any;
    existingEnrollment?: any;
    openRequests?: any[];
  } = {},
) {
  const enrollmentUpsert = vi.fn().mockResolvedValue({ id: "enrollment-1", active: true });
  const paymentCreate = vi.fn().mockResolvedValue({ id: "payment-1", invoice: { id: "REC-2026-000001" } });
  const updateOpen = vi.fn().mockResolvedValue({ count: 1 });
  const historyCreate = vi.fn().mockResolvedValue({ id: "history-1" });
  const notificationCreate = vi.fn().mockResolvedValue({ id: "notification-1" });
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: "student-1" }]),
    payment: {
      findUnique: vi.fn().mockResolvedValue(options.existingPayment || null),
      create: paymentCreate,
    },
    enrollment: {
      findUnique: vi.fn().mockResolvedValue(options.existingEnrollment || null),
      upsert: enrollmentUpsert,
    },
    centerPaymentRequest: {
      findMany: vi.fn().mockResolvedValue(options.openRequests || []),
      updateMany: updateOpen,
    },
    centerPaymentStatusHistory: { create: historyCreate },
    notification: { create: notificationCreate },
  };
  return { tx: tx as any, enrollmentUpsert, paymentCreate, updateOpen, historyCreate, notificationCreate };
}

function activationInput(provider: "PAYPAL" | "CENTER" = "PAYPAL") {
  return {
    userId: "student-1",
    courseId: 42,
    courseTitle: "Analyse 2",
    amountMad: 350,
    provider,
    externalId: provider === "PAYPAL" ? "CAPTURE-1" : "PC-2026-000001",
    invoiceId: "REC-2026-000001",
    activatedAt: new Date("2026-07-20T10:00:00Z"),
    enrollmentEndDate: new Date("2026-08-19T10:00:00Z"),
    hasAiAccess: false,
  };
}

describe("shared module activation", () => {
  it("creates payment, invoice and enrollment from one transaction client", async () => {
    const fake = buildTransaction();
    const result = await activateModuleSubscriptionInTransaction(fake.tx, activationInput("CENTER"));
    expect(result.duplicate).toBe(false);
    expect(fake.tx.$queryRaw).toHaveBeenCalledOnce();
    expect(fake.paymentCreate).toHaveBeenCalledOnce();
    expect(fake.enrollmentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ startDate: new Date("2026-07-20T10:00:00Z") }),
      }),
    );
  });

  it("starts center access at validation time, not request time", async () => {
    const fake = buildTransaction();
    await activateModuleSubscriptionInTransaction(fake.tx, activationInput("CENTER"));
    const payload = fake.enrollmentUpsert.mock.calls[0][0];
    expect(payload.create.startDate.toISOString()).toBe("2026-07-20T10:00:00.000Z");
    expect(payload.create.endDate.toISOString()).toBe("2026-08-19T10:00:00.000Z");
  });

  it("blocks a second provider when access is already active", async () => {
    const fake = buildTransaction({
      existingEnrollment: {
        id: "enrollment-1",
        active: true,
        startDate: new Date("2026-07-19T10:00:00Z"),
        endDate: new Date("2026-08-18T10:00:00Z"),
      },
    });
    await expect(activateModuleSubscriptionInTransaction(fake.tx, activationInput("PAYPAL"))).rejects.toBeInstanceOf(
      ActiveEnrollmentExistsError,
    );
    expect(fake.paymentCreate).not.toHaveBeenCalled();
  });

  it("treats the same provider reference as idempotent", async () => {
    const fake = buildTransaction({
      existingPayment: { id: "payment-existing", invoice: { id: "invoice-existing" } },
      existingEnrollment: { id: "enrollment-1", active: true },
    });
    const result = await activateModuleSubscriptionInTransaction(fake.tx, activationInput("PAYPAL"));
    expect(result.duplicate).toBe(true);
    expect(fake.paymentCreate).not.toHaveBeenCalled();
  });

  it("cancels open center requests after an online PayPal activation", async () => {
    const fake = buildTransaction({
      openRequests: [
        { id: "request-1", publicReference: "PC-2026-000001", status: "PENDING_PAYMENT" },
        { id: "request-2", publicReference: "PC-2026-000002", status: "UNDER_REVIEW" },
      ],
    });
    await activateModuleSubscriptionInTransaction(fake.tx, activationInput("PAYPAL"));
    expect(fake.updateOpen).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "CANCELLED" }) }),
    );
    expect(fake.historyCreate).toHaveBeenCalledTimes(2);
    expect(fake.notificationCreate).toHaveBeenCalledOnce();
  });
});
