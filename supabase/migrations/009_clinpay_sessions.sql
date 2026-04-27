-- ClinPay sessions — SPRINT-001 Day 4-5 (TICKET-048)
-- Tracks AsterPay Collect sessions: bridge between /api/redirect-to-payment
-- (where we create the AsterPay session) and the webhook callbacks where we
-- verify mandate, issue invoice, and call /v1/collect/settle.
--
-- Zero PII per ClinPay rule: no patient name, IBAN, wallet, email. visitId is
-- the trial system's anonymous visit identifier; studyId is the trial code.

CREATE TABLE IF NOT EXISTS "ClinPaySession" (
  id                    TEXT PRIMARY KEY,
  asterpay_session_id   TEXT NOT NULL UNIQUE,
  study_id              TEXT NOT NULL,
  visit_id              TEXT NOT NULL,
  amount_eur            NUMERIC(19, 4) NOT NULL,
  amount_usdc           NUMERIC(19, 4) NOT NULL,
  recipient_country     TEXT NOT NULL,
  payout_method         TEXT NOT NULL CHECK (payout_method IN ('sepa', 'wallet')),
  mandate_json          JSONB NOT NULL,
  mandate_hash          TEXT NOT NULL,
  invoice_id            TEXT REFERENCES "Invoice"(id) ON DELETE SET NULL,
  status                TEXT NOT NULL DEFAULT 'created'
                        CHECK (status IN ('created', 'submitted', 'settled', 'failed', 'expired')),
  last_event            JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_clinpay_asterpay_session" ON "ClinPaySession"(asterpay_session_id);
CREATE INDEX IF NOT EXISTS "idx_clinpay_study"            ON "ClinPaySession"(study_id);
CREATE INDEX IF NOT EXISTS "idx_clinpay_status"           ON "ClinPaySession"(status);
