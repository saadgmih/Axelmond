import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("secure center payment workflow", () => {
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
  const migration = fs.readFileSync("prisma/migrations/20260717150000_center_payments/migration.sql", "utf8");
  const service = fs.readFileSync("src/center-payments.ts", "utf8");
  const activation = fs.readFileSync("src/module-subscription.ts", "utf8");
  const routes = fs.readFileSync("src/routes/center-payment-routes.ts", "utf8");
  const rbac = fs.readFileSync("src/rbac.ts", "utf8");
  const paymentModal = fs.readFileSync("src/components/PaymentModal.tsx", "utf8");
  const studentView = fs.readFileSync("src/views/student/StudentCenterPaymentsView.tsx", "utf8");
  const adminView = fs.readFileSync("src/views/teacher/AdminCenterPaymentsView.tsx", "utf8");

  assert.match(schema, /enum CenterPaymentStatus[\s\S]*PENDING_PAYMENT[\s\S]*REFUNDED/);
  assert.match(schema, /model CenterPaymentRequest/);
  assert.match(schema, /publicReference\s+String\s+@unique/);
  assert.match(schema, /openRequestKey\s+String\?\s+@unique/);
  assert.match(schema, /generatedReceiptNumber\s+String\?\s+@unique/);
  assert.match(schema, /validationIdempotencyKey\s+String\?\s+@unique/);
  assert.match(schema, /model CenterPaymentStatusHistory/);
  assert.match(schema, /CENTER/);
  assert.doesNotMatch(migration, /DROP\s+(TABLE|COLUMN)|TRUNCATE|DELETE FROM/i);
  assert.match(migration, /ALTER TYPE "AxelmondResearchLab"\."PaymentProvider" ADD VALUE IF NOT EXISTS 'CENTER'/);

  assert.match(service, /prisma\.course\.findUnique/);
  assert.match(service, /modulePriceSnapshot:\s*input\.modulePriceMad/);
  assert.doesNotMatch(routes, /req\.body\?\.(amount|price)/);
  assert.match(service, /prisma\.\$transaction/);
  assert.match(service, /validationIdempotencyKey:\s*input\.idempotencyKey/);
  assert.match(service, /openRequestKey:\s*null/);
  assert.match(service, /centerPaymentAmountsMatch/);
  assert.match(service, /generatedReceiptNumber:\s*receiptNumber/);
  assert.match(service, /centerPaymentStatusHistory\.create/);
  assert.match(service, /notification\.create/);
  assert.match(service, /status:\s*"EXPIRED"/);
  assert.match(activation, /cancelOpenCenterPaymentRequestsInTransaction/);
  assert.match(activation, /provider:\s*input\.provider/);
  assert.match(activation, /FOR UPDATE/);

  assert.match(routes, /requireAuth/);
  assert.match(routes, /requireAdmin/);
  assert.match(routes, /requireStudent/);
  assert.match(routes, /\/api\/me\/center-payment-requests/);
  assert.match(routes, /\/api\/admin\/center-payment-requests/);
  assert.match(rbac, /center-payment-requests/);
  assert.match(paymentModal, /Payer au centre/);
  assert.match(paymentModal, /Confirmer ma demande/);
  assert.match(studentView, /Mes demandes de paiement/);
  assert.match(studentView, /Votre accès sera activé uniquement après validation administrative/);
  assert.match(adminView, /Valider et activer/);
  assert.match(adminView, /Historique immuable/);
  assert.match(adminView, /randomUUID/);
  assert.match(adminView, /ID du module/);
  assert.match(adminView, /ID du validateur/);
  assert.match(adminView, /type="date"/);
});
