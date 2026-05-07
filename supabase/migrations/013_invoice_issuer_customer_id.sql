-- 013_invoice_issuer_customer_id.sql — link Invoice to the API-key holder
-- (Customer) who issued it, so settlement-fee billing can find the right
-- account to charge. NULL on existing rows; new invoices set it from
-- req.customer.id at creation time.

ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS issuer_customer_id TEXT;
ALTER TABLE "Invoice"
  ADD CONSTRAINT fk_invoice_issuer_customer
  FOREIGN KEY (issuer_customer_id) REFERENCES "Customer"(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_issuer_customer ON "Invoice"(issuer_customer_id) WHERE issuer_customer_id IS NOT NULL;
