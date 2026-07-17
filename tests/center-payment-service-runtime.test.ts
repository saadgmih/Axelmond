import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => {
  const state: {
    course: any;
    enrollment: any;
    openRequest: any;
    createdData: any;
    expiring: any[];
    expirationClaimCount: number;
  } = {
    course: null,
    enrollment: null,
    openRequest: null,
    createdData: null,
    expiring: [],
    expirationClaimCount: 1,
  };

  const historyCreate = vi.fn(async () => ({ id: "history-1" }));
  const notificationCreate = vi.fn(async () => ({ id: "notification-1" }));
  const expirationUpdate = vi.fn(async () => ({ count: state.expirationClaimCount }));

  const record = () => {
    const data = state.createdData;
    return {
      id: "request-1",
      publicReference: data.publicReference,
      openRequestKey: data.openRequestKey,
      userId: data.userId,
      courseId: data.courseId,
      amountMad: data.amountMad,
      currency: data.currency,
      modulePriceSnapshot: data.modulePriceSnapshot,
      moduleTitleSnapshot: data.moduleTitleSnapshot,
      moduleDescriptionSnapshot: data.moduleDescriptionSnapshot,
      accessDurationDaysSnapshot: data.accessDurationDaysSnapshot,
      hasAiAccessSnapshot: data.hasAiAccessSnapshot,
      status: "PENDING_PAYMENT",
      expiresAt: data.expiresAt,
      paidAt: null,
      validatedAt: null,
      validatedByUserId: null,
      paymentMethod: null,
      receivedAmountMad: null,
      physicalReceiptReference: null,
      generatedReceiptNumber: null,
      studentNote: data.studentNote,
      adminNote: null,
      publicReason: null,
      paymentId: null,
      enrollmentId: null,
      validationIdempotencyKey: null,
      createdAt: new Date("2026-07-17T10:00:00Z"),
      updatedAt: new Date("2026-07-17T10:00:00Z"),
      user: { id: data.userId, fullName: "Étudiant Test", email: "student@example.com" },
      course: state.course,
      validatedBy: null,
      payment: null,
      enrollment: null,
      history: [],
    };
  };

  const tx = {
    $queryRaw: vi.fn(async () => [{ id: "student-1" }]),
    centerPaymentRequest: {
      findMany: vi.fn(async () => state.expiring),
      findUnique: vi.fn(async () => state.openRequest),
      updateMany: expirationUpdate,
      create: vi.fn(async ({ data }: any) => {
        state.createdData = data;
        return { id: "request-1" };
      }),
      findUniqueOrThrow: vi.fn(async () => record()),
    },
    centerPaymentStatusHistory: { create: historyCreate },
    notification: { create: notificationCreate },
    enrollment: { findUnique: vi.fn(async () => state.enrollment) },
  };

  const prisma = {
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    course: { findUnique: vi.fn(async () => state.course) },
    enrollment: { findUnique: vi.fn(async () => state.enrollment) },
    centerPaymentRequest: {
      findFirst: vi.fn(async () => state.openRequest),
      findUnique: vi.fn(async () => state.openRequest),
      findMany: vi.fn(async () => []),
    },
  };

  return { state, prisma, tx, historyCreate, notificationCreate, expirationUpdate };
});

vi.mock("../src/db", () => ({ prisma: database.prisma }));

import {
  CenterPaymentError,
  createCenterPaymentRequest,
  expireCenterPaymentRequests,
  getStudentCenterPaymentRequest,
} from "../src/center-payments";

const course = {
  id: 42,
  title: "Analyse 2",
  description: "Suites et intégrales",
  price: 350,
  published: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  database.state.course = { ...course };
  database.state.enrollment = null;
  database.state.openRequest = null;
  database.state.createdData = null;
  database.state.expiring = [];
  database.state.expirationClaimCount = 1;
});

describe("center payment server service", () => {
  it("creates a request from the server-side course price and authenticated user", async () => {
    const result = await createCenterPaymentRequest({ userId: "student-1", courseId: 42 });

    expect(result.duplicate).toBe(false);
    expect(database.state.createdData).toEqual(
      expect.objectContaining({
        userId: "student-1",
        courseId: 42,
        amountMad: 350,
        modulePriceSnapshot: 350,
        currency: "MAD",
        openRequestKey: "student-1:42",
      }),
    );
    expect(result.request.amount).toBe(350);
    expect(result.request.reference).toMatch(/^PC-\d{4}-\d{6}$/);
  });

  it("rejects a missing or unpublished module before creating financial data", async () => {
    database.state.course = null;
    await expect(createCenterPaymentRequest({ userId: "student-1", courseId: 404 })).rejects.toMatchObject({
      code: "COURSE_NOT_FOUND",
      statusCode: 404,
    });
    expect(database.tx.centerPaymentRequest.create).not.toHaveBeenCalled();
  });

  it("rejects a new request while the same module access is active", async () => {
    database.state.enrollment = {
      active: true,
      startDate: new Date(Date.now() - 1_000),
      endDate: new Date(Date.now() + 86_400_000),
    };
    await expect(createCenterPaymentRequest({ userId: "student-1", courseId: 42 })).rejects.toBeInstanceOf(
      CenterPaymentError,
    );
    expect(database.tx.centerPaymentRequest.create).not.toHaveBeenCalled();
  });

  it("reuses an existing open request instead of charging twice", async () => {
    await createCenterPaymentRequest({ userId: "student-1", courseId: 42 });
    database.state.openRequest = await database.tx.centerPaymentRequest.findUniqueOrThrow();
    database.state.createdData = null;

    const result = await createCenterPaymentRequest({ userId: "student-1", courseId: 42 });
    expect(result.duplicate).toBe(true);
    expect(database.tx.centerPaymentRequest.create).toHaveBeenCalledTimes(1);
  });

  it("expires only a conditionally claimed request and releases the open-request guard", async () => {
    database.state.expiring = [
      {
        id: "request-expired",
        userId: "student-1",
        publicReference: "PC-2026-000111",
        status: "PENDING_PAYMENT",
      },
    ];
    const count = await expireCenterPaymentRequests({ now: new Date("2026-07-23T10:00:00Z") });
    expect(count).toBe(1);
    expect(database.expirationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "EXPIRED", openRequestKey: null }) }),
    );
    expect(database.historyCreate).toHaveBeenCalledOnce();
    expect(database.notificationCreate).toHaveBeenCalledOnce();
  });

  it("does not write false history when another transaction already changed the request", async () => {
    database.state.expiring = [
      {
        id: "request-raced",
        userId: "student-1",
        publicReference: "PC-2026-000112",
        status: "UNDER_REVIEW",
      },
    ];
    database.state.expirationClaimCount = 0;
    const count = await expireCenterPaymentRequests({ now: new Date("2026-07-23T10:00:00Z") });
    expect(count).toBe(0);
    expect(database.historyCreate).not.toHaveBeenCalled();
    expect(database.notificationCreate).not.toHaveBeenCalled();
  });

  it("scopes student detail lookup to both owner id and public reference", async () => {
    await expect(getStudentCenterPaymentRequest("student-1", "PC-2026-000777")).rejects.toMatchObject({
      code: "REQUEST_NOT_FOUND",
    });
    expect(database.prisma.centerPaymentRequest.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "student-1", publicReference: "PC-2026-000777" } }),
    );
  });
});
