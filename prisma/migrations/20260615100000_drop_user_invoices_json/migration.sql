-- Billing invoices are stored in the relational Invoice table; legacy User.invoices JSON is removed.
ALTER TABLE "User" DROP COLUMN IF EXISTS "invoices";
