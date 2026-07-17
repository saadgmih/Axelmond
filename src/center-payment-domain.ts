import { randomInt } from "node:crypto";
import type { CenterPaymentMethod, CenterPaymentStatus } from "@prisma/client";

export const CENTER_PAYMENT_OPEN_STATUSES: CenterPaymentStatus[] = ["PENDING_PAYMENT", "UNDER_REVIEW"];
export const CENTER_PAYMENT_STATUSES: CenterPaymentStatus[] = [
  "PENDING_PAYMENT",
  "UNDER_REVIEW",
  "PAID",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
  "REFUNDED",
];
export const CENTER_PAYMENT_METHODS: CenterPaymentMethod[] = [
  "CASH",
  "CARD_AT_CENTER",
  "BANK_TRANSFER",
  "CHECK",
  "OTHER",
];

export const CENTER_PAYMENT_TRANSITIONS: Record<CenterPaymentStatus, CenterPaymentStatus[]> = {
  PENDING_PAYMENT: ["UNDER_REVIEW", "PAID", "EXPIRED", "CANCELLED"],
  UNDER_REVIEW: ["PAID", "REJECTED", "EXPIRED", "CANCELLED"],
  PAID: ["REFUNDED"],
  REJECTED: [],
  EXPIRED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransitionCenterPayment(from: CenterPaymentStatus, to: CenterPaymentStatus) {
  return CENTER_PAYMENT_TRANSITIONS[from].includes(to);
}

function readableNumber(prefix: "PC" | "REC", now: Date) {
  return `${prefix}-${now.getUTCFullYear()}-${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
}

export function generateCenterPaymentReference(now = new Date()) {
  return readableNumber("PC", now);
}

export function generateCenterReceiptNumber(now = new Date()) {
  return readableNumber("REC", now);
}

export function isCenterPaymentReference(value: string) {
  return /^PC-\d{4}-\d{6}$/.test(value);
}

export function buildCenterPaymentExpiry(now: Date, expirationDays: number) {
  return new Date(now.getTime() + expirationDays * 24 * 60 * 60 * 1000);
}

export function centerPaymentAmountsMatch(expected: number, received: number) {
  return (
    Number.isFinite(expected) && Number.isFinite(received) && Math.round(expected * 100) === Math.round(received * 100)
  );
}

export function normalizeCenterPaymentNote(value: unknown, maxLength = 1000) {
  const note = String(value || "").trim();
  return note ? note.slice(0, maxLength) : null;
}

export function isValidCenterPaymentIdempotencyKey(value: string) {
  return /^[A-Za-z0-9_-]{8,100}$/.test(value);
}
