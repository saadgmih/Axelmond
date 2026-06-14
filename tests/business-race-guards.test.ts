import assert from "node:assert/strict";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import fs from "node:fs";
import {
  buildDirectConversationKey,
  findDirectConversationId,
} from "../src/direct-conversations.ts";
import { mergeUserInvoices, serializeInvoiceRecord } from "../src/course-payments.ts";
import {
  ProfessorInviteConsumeError,
  reserveProfessorInviteCode,
} from "../src/professor-invite-consume.ts";

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const migration = fs.readFileSync("prisma/migrations/20260613180000_business_race_guards/migration.sql", "utf8");
const serverSource = readApiRouteSources();
const messagingRoutesSource = fs.readFileSync("src/messaging-routes.ts", "utf8");

assert.match(schema, /directKey\s+String\?\s+@unique/);
assert.match(schema, /model Payment/);
assert.match(schema, /model Invoice/);
assert.match(schema, /@@unique\(\[provider, externalId\]\)/);
assert.match(migration, /LiveAttendance_active_session_user_key/);
assert.match(migration, /Conversation_directKey_key/);

const coursePaymentsSource = fs.readFileSync("src/course-payments.ts", "utf8");
const paypalEnrollmentSource = fs.readFileSync("src/paypal-enrollment.ts", "utf8");

assert.match(serverSource, /reserveProfessorInviteCode/);
assert.match(coursePaymentsSource, /persistCoursePaymentEnrollment/);
assert.match(coursePaymentsSource, /externalId/);
assert.match(serverSource, /api\.persistCoursePaymentEnrollment\(/);
assert.match(serverSource, /buildPersistCoursePaymentEnrollment/);
assert.match(serverSource, /recordLiveAttendanceJoin/);
assert.match(paypalEnrollmentSource, /provider: "PAYPAL" \| "MOCK"/);
assert.match(messagingRoutesSource, /findOrCreateDirectConversation/);

assert.equal(buildDirectConversationKey("user-b", "user-a"), "user-a:user-b");
assert.equal(buildDirectConversationKey("user-a", "user-b"), "user-a:user-b");
assert.equal(typeof findDirectConversationId, "function");

const merged = mergeUserInvoices({
  invoices: [{ id: "LEG-1", date: "01/01/2026", courseTitle: "Legacy", amount: 10, status: "Payé" }],
  invoiceRecords: [{
    id: "INV-1",
    courseTitle: "DB",
    amountMad: 15,
    status: "Payé",
    issuedAt: new Date("2026-01-02T00:00:00.000Z"),
  }],
});
assert.equal(merged.length, 2);
assert.equal(serializeInvoiceRecord({
  id: "INV-1",
  courseTitle: "DB",
  amountMad: 15,
  status: "Payé",
  issuedAt: new Date("2026-01-02T00:00:00.000Z"),
}).amount, 15);

assert.equal(new ProfessorInviteConsumeError("bad", "INVALID").code, "INVALID");

console.log("Business race guard rules passed");
