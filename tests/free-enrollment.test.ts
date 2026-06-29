import assert from "node:assert/strict";
import fs from "node:fs";
import { buildEnrollmentEndDate } from "../src/enrollment-access.ts";
import { isFreeCourseCharge, resolveCourseChargeAmount } from "../src/promo-codes.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("free-enrollment-pricing", () => {
  assert.equal(isFreeCourseCharge(0), true);
  assert.equal(isFreeCourseCharge(-1), true);
  assert.equal(isFreeCourseCharge(0.004), true);
  assert.equal(isFreeCourseCharge(0.01), false);
  assert.equal(isFreeCourseCharge(200), false);

  const freeCourse = resolveCourseChargeAmount(0, "");
  assert.equal(freeCourse.amount, 0);
  assert.equal(freeCourse.error, undefined);

  const paidCourse = resolveCourseChargeAmount(200, "");
  assert.equal(paidCourse.amount, 200);

  const discounted = resolveCourseChargeAmount(200, "AXELMOND20", { NODE_ENV: "development" });
  assert.equal(discounted.amount, 160);
  assert.equal(isFreeCourseCharge(discounted.amount), false);
});

rulesTest("free-enrollment-wiring", () => {
  const paymentModalSource = fs.readFileSync("src/components/PaymentModal.tsx", "utf8");
  const apiSource = fs.readFileSync("src/api.ts", "utf8");
  const coursesRoutesSource = fs.readFileSync("src/routes/courses-routes.ts", "utf8");
  const paymentsRoutesSource = fs.readFileSync("src/routes/payments-routes.ts", "utf8");
  const paypalServerSource = fs.readFileSync("src/paypal-server.ts", "utf8");
  const rbacSource = fs.readFileSync("src/rbac.ts", "utf8");
  const freeEnrollmentSource = fs.readFileSync("src/course-free-enrollment.ts", "utf8");
  const coursePaymentsSource = fs.readFileSync("src/course-payments.ts", "utf8");
  const prismaSchemaSource = fs.readFileSync("prisma/schema.prisma", "utf8");
  const migrationSource = fs.readFileSync(
    "prisma/migrations/20260629013000_course_free_access_duration/migration.sql",
    "utf8",
  );
  const appSessionSource = fs.readFileSync("src/hooks/useAppSession.ts", "utf8");
  const paypalEnrollmentSource = fs.readFileSync("src/paypal-enrollment.ts", "utf8");

  assert.match(paymentModalSource, /isFreeCheckout/);
  assert.match(paymentModalSource, /api\.freeEnrollCourse/);
  assert.match(paymentModalSource, /S'inscrire gratuitement/);
  assert.match(apiSource, /free-enroll/);
  assert.match(coursesRoutesSource, /\/api\/courses\/:courseId\/free-enroll/);
  assert.match(coursesRoutesSource, /processFreeCourseEnrollment/);
  assert.match(paymentsRoutesSource, /FREE_ENROLLMENT_REQUIRED/);
  assert.match(paymentsRoutesSource, /isFreeCourseCharge/);
  assert.match(paypalServerSource, /PAYPAL_AMOUNT_INVALID/);
  assert.match(rbacSource, /free-enroll/);

  assert.doesNotMatch(freeEnrollmentSource, /ALREADY_ENROLLED/);
  assert.match(freeEnrollmentSource, /course\.freeAccessDurationDays/);
  assert.match(freeEnrollmentSource, /enrollmentEndDate/);
  assert.match(freeEnrollmentSource, /persistCoursePaymentEnrollment/);
  assert.match(coursePaymentsSource, /enrollment\.upsert/);
  assert.match(coursePaymentsSource, /enrollmentEndDate/);
  assert.match(prismaSchemaSource, /freeAccessDurationDays\s+Int\?/);
  assert.match(migrationSource, /ADD COLUMN "freeAccessDurationDays" INTEGER/);
  assert.match(migrationSource, /Course_freeAccessDurationDays_check/);
  assert.doesNotMatch(appSessionSource, /useState<number\[\]>\(\[1\]\)/);
  assert.doesNotMatch(appSessionSource, /enrolledCourses \|\| \[1\]/);
  assert.doesNotMatch(paypalEnrollmentSource, /ALREADY_ENROLLED/);

  const start = new Date("2026-06-29T00:00:00.000Z");
  assert.equal(buildEnrollmentEndDate(start, 7).toISOString(), "2026-07-06T00:00:00.000Z");

  console.log("Free enrollment wiring tests passed");
});
