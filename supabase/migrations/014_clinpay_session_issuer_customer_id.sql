-- 014_clinpay_session_issuer_customer_id.sql
-- Capture the issuer Customer at /api/redirect-to-payment time (when the
-- panel platform — All Global, Kantar, future — calls us with their x-api-key).
-- The session's submitted-callback handler reads this back when minting the
-- Invoice, so Invoice.issuer_customer_id flows from the auth context that
-- triggered the cycle.
--
-- Pre-2026-05-15 sessions have NULL — fine, no retroactive billing exposure.

ALTER TABLE "ClinPaySession" ADD COLUMN IF NOT EXISTS issuer_customer_id TEXT;
ALTER TABLE "ClinPaySession"
  ADD CONSTRAINT fk_clinpay_session_issuer_customer
  FOREIGN KEY (issuer_customer_id) REFERENCES "Customer"(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_clinpay_session_issuer ON "ClinPaySession"(issuer_customer_id) WHERE issuer_customer_id IS NOT NULL;
