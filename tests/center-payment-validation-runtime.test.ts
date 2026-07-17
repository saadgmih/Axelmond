import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => {
  const initialState = () => ({
    request: {
      id: "request-1",
      publicReference: "PC-2026-000458",
      openRequestKey: "student-1:42",
      userId: "student-1",
      courseId: 42,
      amountMad: 350,
      currency: "MAD",
      modulePriceSnapshot: 350,
      moduleTitleSnapshot: "Analyse 2",
      moduleDescriptionSnapshot: "Suites et intégrales",
      accessDurationDaysSnapshot: 30,
      hasAiAccessSnapshot: false,
      status: "PENDING_PAYMENT",
      expiresAt: new Date("2099-07-22T10:00:00Z"),
      paidAt: null,
      validatedAt: null,
      validatedByUserId: null,
      paymentMethod: null,
      receivedAmountMad: null,
      physicalReceiptReference: null,
      generatedReceiptNumber: null,
      studentNote: null,
      adminNote: null,
      publicReason: null,
      paymentId: null,
      enrollmentId: null,
      validationIdempotencyKey: null,
      createdAt: new Date("2026-07-17T10:00:00Z"),
      updatedAt: new Date("2026-07-17T10:00:00Z"),
    } as any,
    payment: null as any,
    enrollment: null as any,
    history: [] as any[],
    notifications: [] as any[],
  });

  const box = { current: initialState(), failNotification: false };

  const matchesStatus = (current: string, expected: any) => {
    if (typeof expected === "string") return current === expected;
    if (Array.isArray(expected?.in)) return expected.in.includes(current);
    return true;
  };

  const buildTx = (draft: ReturnType<typeof initialState>) => ({
    $queryRaw: vi.fn(async () => [{ id: "student-1" }]),
    centerPaymentRequest: {
      findMany: vi.fn(async ({ where }: any) => {
        if (where?.expiresAt) {
          const expired = draft.request.expiresAt <= where.expiresAt.lte;
          return expired && matchesStatus(draft.request.status, where.status)
            ? [
                {
                  id: draft.request.id,
                  userId: draft.request.userId,
                  publicReference: draft.request.publicReference,
                  status: draft.request.status,
                },
              ]
            : [];
        }
        const excluded = where?.id?.not === draft.request.id;
        return excluded || !matchesStatus(draft.request.status, where?.status) ? [] : [draft.request];
      }),
      findUnique: vi.fn(async () => ({ ...draft.request, enrollment: draft.enrollment })),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const idMatches = !where.id || where.id === draft.request.id;
        const statusMatches = !where.status || matchesStatus(draft.request.status, where.status);
        const keyMatches = where.validationIdempotencyKey !== null || draft.request.validationIdempotencyKey === null;
        const expiryMatches = !where.expiresAt || draft.request.expiresAt <= where.expiresAt.lte;
        if (!idMatches || !statusMatches || !keyMatches || !expiryMatches) return { count: 0 };
        Object.assign(draft.request, data);
        return { count: 1 };
      }),
      update: vi.fn(async ({ data }: any) => {
        Object.assign(draft.request, data);
        return draft.request;
      }),
      findUniqueOrThrow: vi.fn(async () => draft.request),
    },
    payment: {
      findUnique: vi.fn(async () => draft.payment),
      create: vi.fn(async ({ data }: any) => {
        const invoice = {
          ...data.invoice.create,
          paymentId: "payment-1",
          issuedAt: data.invoice.create.issuedAt,
        };
        draft.payment = {
          id: "payment-1",
          userId: data.userId,
          courseId: data.courseId,
          provider: data.provider,
          externalId: data.externalId,
          amountMad: data.amountMad,
          status: "COMPLETED",
          createdAt: new Date(),
          invoice,
        };
        return draft.payment;
      }),
    },
    enrollment: {
      findUnique: vi.fn(async () => draft.enrollment),
      upsert: vi.fn(async ({ create, update }: any) => {
        draft.enrollment = draft.enrollment ? { ...draft.enrollment, ...update } : { id: "enrollment-1", ...create };
        return draft.enrollment;
      }),
    },
    centerPaymentStatusHistory: {
      create: vi.fn(async ({ data }: any) => {
        const entry = { id: `history-${draft.history.length + 1}`, createdAt: new Date(), ...data };
        draft.history.push(entry);
        return entry;
      }),
    },
    notification: {
      create: vi.fn(async ({ data }: any) => {
        if (box.failNotification) throw new Error("SIMULATED_NOTIFICATION_FAILURE");
        const notification = { id: `notification-${draft.notifications.length + 1}`, ...data };
        draft.notifications.push(notification);
        return notification;
      }),
    },
  });

  const hydrate = () => ({
    ...box.current.request,
    user: { id: "student-1", fullName: "Étudiant Test", email: "student@example.com" },
    course: { id: 42, title: "Analyse 2", description: "Suites et intégrales", price: 350 },
    validatedBy: box.current.request.validatedByUserId
      ? { id: "admin-1", fullName: "Admin Test", email: "admin@example.com" }
      : null,
    payment: box.current.payment,
    enrollment: box.current.enrollment,
    history: box.current.history.map((entry) => ({ ...entry, changedBy: null })),
  });

  const prisma = {
    $transaction: vi.fn(async (callback: (tx: any) => unknown) => {
      const draft = structuredClone(box.current);
      const result = await callback(buildTx(draft));
      box.current = draft;
      return result;
    }),
    centerPaymentRequest: {
      findUniqueOrThrow: vi.fn(async () => hydrate()),
      findUnique: vi.fn(async () => hydrate()),
    },
  };

  return {
    box,
    prisma,
    reset() {
      box.current = initialState();
      box.failNotification = false;
    },
  };
});

vi.mock("../src/db", () => ({ prisma: database.prisma }));

import { validateCenterPaymentRequest } from "../src/center-payments";

const validation = (idempotencyKey = "validation-key-0001") =>
  validateCenterPaymentRequest({
    adminId: "admin-1",
    reference: "PC-2026-000458",
    receivedAmount: 350,
    paymentMethod: "CASH",
    physicalReceiptReference: "CAISSE-887",
    internalNote: "Montant vérifié",
    idempotencyKey,
  });

beforeEach(() => {
  vi.clearAllMocks();
  database.reset();
});

describe("atomic center payment validation", () => {
  it("creates the CENTER ledger payment, receipt, enrollment, history and notification atomically", async () => {
    const result = await validation();
    const state = database.box.current;

    expect(result.idempotent).toBe(false);
    expect(state.request.status).toBe("PAID");
    expect(state.request.openRequestKey).toBeNull();
    expect(state.payment).toMatchObject({ provider: "CENTER", externalId: "PC-2026-000458", amountMad: 350 });
    expect(state.request.generatedReceiptNumber).toMatch(/^REC-\d{4}-\d{6}$/);
    expect(state.request.paymentId).toBe("payment-1");
    expect(state.request.enrollmentId).toBe("enrollment-1");
    expect(state.history.at(-1)).toMatchObject({ newStatus: "PAID", reason: "PAYMENT_VALIDATED" });
    expect(state.notifications.at(-1)).toMatchObject({ type: "CENTER_PAYMENT_PAID" });
    expect(result.request.receipt).toMatchObject({ requestReference: "PC-2026-000458", status: "PAYÉ" });
  });

  it("starts and ends access from the administrator validation timestamp", async () => {
    await validation();
    const { request } = database.box.current;
    const enrollment = database.box.current.enrollment;
    expect(enrollment.startDate.getTime()).toBe(request.validatedAt.getTime());
    expect(enrollment.endDate.getTime() - enrollment.startDate.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("returns the same result for an idempotent network retry without duplicating records", async () => {
    await validation("same-key-0001");
    const firstReceipt = database.box.current.request.generatedReceiptNumber;
    const result = await validation("same-key-0001");
    expect(result.idempotent).toBe(true);
    expect(database.box.current.request.generatedReceiptNumber).toBe(firstReceipt);
    expect(database.box.current.history.filter((entry) => entry.newStatus === "PAID")).toHaveLength(1);
    expect(database.box.current.notifications.filter((entry) => entry.type === "CENTER_PAYMENT_PAID")).toHaveLength(1);
  });

  it("rejects an inconsistent received amount without writing payment data", async () => {
    await expect(
      validateCenterPaymentRequest({
        adminId: "admin-1",
        reference: "PC-2026-000458",
        receivedAmount: 349.99,
        paymentMethod: "CASH",
        idempotencyKey: "amount-key-0001",
      }),
    ).rejects.toMatchObject({ code: "RECEIVED_AMOUNT_MISMATCH" });
    expect(database.box.current.request.status).toBe("PENDING_PAYMENT");
    expect(database.box.current.payment).toBeNull();
    expect(database.box.current.enrollment).toBeNull();
  });

  it("rolls back every financial and access write when the final notification step fails", async () => {
    database.box.failNotification = true;
    await expect(validation("rollback-key-0001")).rejects.toThrow("SIMULATED_NOTIFICATION_FAILURE");
    expect(database.box.current.request.status).toBe("PENDING_PAYMENT");
    expect(database.box.current.request.validationIdempotencyKey).toBeNull();
    expect(database.box.current.payment).toBeNull();
    expect(database.box.current.enrollment).toBeNull();
    expect(database.box.current.history).toHaveLength(0);
    expect(database.box.current.notifications).toHaveLength(0);
  });

  it("expires an overdue request and refuses to validate it", async () => {
    database.box.current.request.expiresAt = new Date("2020-01-01T00:00:00Z");
    await expect(validation("expired-key-0001")).rejects.toMatchObject({ code: "INVALID_STATUS_TRANSITION" });
    expect(database.box.current.request.status).toBe("EXPIRED");
    expect(database.box.current.payment).toBeNull();
    expect(database.box.current.history.at(-1)).toMatchObject({ newStatus: "EXPIRED" });
  });

  it("refuses a second validation with a different key after payment is final", async () => {
    await validation("first-key-0001");
    await expect(validation("second-key-0002")).rejects.toMatchObject({ code: "INVALID_STATUS_TRANSITION" });
    expect(database.box.current.history.filter((entry) => entry.newStatus === "PAID")).toHaveLength(1);
  });
});
