-- DRS receipts — SPRINT-001 Day 6-7 (TICKET-048)
-- One row per settled ClinPay session. Sandbox: receipt persisted to DB only.
-- Production (Sprint 2): mint on Base via DRS contract; settlement_tx_hash
-- becomes the on-chain hash instead of AsterPay's sandbox provider_ref.

CREATE TABLE IF NOT EXISTS "DrsReceipt" (
  receipt_id              TEXT PRIMARY KEY,
  clinpay_session_id      TEXT NOT NULL REFERENCES "ClinPaySession"(id) ON DELETE CASCADE,
  invoice_id              TEXT REFERENCES "Invoice"(id) ON DELETE SET NULL,
  visit_id                TEXT NOT NULL,
  study_id                TEXT NOT NULL,
  amount_eur              NUMERIC(19, 4) NOT NULL,
  amount_usdc             NUMERIC(19, 4) NOT NULL,
  settled_at              TIMESTAMPTZ NOT NULL,
  settlement_tx_hash      TEXT NOT NULL,
  settlement_provider     TEXT NOT NULL,
  mandate_hash            TEXT NOT NULL,
  pact_version            TEXT NOT NULL,
  sponsor_agent_id        TEXT NOT NULL,
  sponsor_jurisdiction    TEXT,
  asterpay_jurisdiction   TEXT,
  rail                    TEXT NOT NULL CHECK (rail IN ('sepa', 'wallet')),
  tax_line                JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_drs_clinpay_session" ON "DrsReceipt"(clinpay_session_id);
CREATE INDEX IF NOT EXISTS "idx_drs_invoice" ON "DrsReceipt"(invoice_id);
CREATE INDEX IF NOT EXISTS "idx_drs_study"   ON "DrsReceipt"(study_id);
