import assert from "node:assert/strict";
import { buildEmailDeliverySummary } from "../src/email-delivery-summary.ts";

const logs = [
  {
    messageId: "<older@axelmond.com>",
    accepted: ["a@gmail.com"],
    rejected: [],
    envelope: { from: "verification@axelmond.com", to: ["a@gmail.com"] },
    response: "250 2.0.0 Ok: queued as older",
    providerStatus: "QUEUED",
    createdAt: new Date("2026-05-30T22:59:00.000Z"),
  },
  {
    messageId: "<failed@axelmond.com>",
    accepted: [],
    rejected: ["b@gmail.com"],
    envelope: { from: "verification@axelmond.com", to: ["b@gmail.com"] },
    response: "550 5.7.26 rejected",
    providerStatus: "FAILED",
    createdAt: new Date("2026-05-31T08:00:00.000Z"),
  },
  {
    messageId: "<latest@axelmond.com>",
    accepted: ["c@gmail.com"],
    rejected: [],
    envelope: { from: "verification@axelmond.com", to: ["c@gmail.com"] },
    response: "250 2.0.0 Ok: queued as latest",
    providerStatus: "QUEUED",
    createdAt: new Date("2026-05-31T09:00:00.000Z"),
  },
];

const summary = buildEmailDeliverySummary(logs, true, new Date("2026-05-31T10:00:00.000Z"));

assert.equal(summary.smtpConfigured, true);
assert.equal(summary.lastEmailSent?.messageId, "<latest@axelmond.com>");
assert.equal(summary.emailsSentToday, 1);
assert.equal(summary.lastSmtpError?.messageId, "<failed@axelmond.com>");

console.log("Email delivery summary rules passed");
