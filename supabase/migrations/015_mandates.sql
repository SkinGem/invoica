-- PACT Mandate API v0.1 — generic mandate state + transition trail
-- TICKET-PACT-API-001 / Helixa Synagent partnership
-- Hard deadline: 2026-05-28
--
-- Design notes:
--   - Generic surface: works for Helixa, bobbitybobob, Gitlawb, future partners.
--   - `proposer_agent_id` / `counterparty_agent_id` are opaque strings
--     supplied by the caller. No identity resolution server-side.
--   - `context` JSONB stores partner-specific metadata (e.g.,
--     {source: "helixa_synagent_tg_bot", chat_id: "..."}).
--   - Every state change writes a row in MandateTransition with the
--     anchor tx hash on Base Sepolia. The full audit trail = mandate row
--     + transitions ordered by created_at.
--   - DrsReceipt link is set when transition reaches a terminal state
--     (signed_by_both, completed). Reuses the existing DrsReceipt table.

CREATE TABLE IF NOT EXISTS "Mandate" (
  id                            TEXT PRIMARY KEY,
  proposer_agent_id             TEXT NOT NULL,
  counterparty_agent_id         TEXT NOT NULL,
  scope                         TEXT NOT NULL,
  terms                         JSONB NOT NULL,
  context                       JSONB NOT NULL DEFAULT '{}'::jsonb,
  state                         TEXT NOT NULL CHECK (state IN (
                                  'proposed',
                                  'signed_by_proposer',
                                  'signed_by_both',
                                  'in_progress',
                                  'completed',
                                  'disputed',
                                  'expired'
                                )),
  pact_mandate_hash             TEXT,
  pact_version                  TEXT NOT NULL DEFAULT 'v0.3.2',
  proposer_signature            TEXT,
  counterparty_signature        TEXT,
  signed_by_proposer_at         TIMESTAMPTZ,
  signed_by_counterparty_at     TIMESTAMPTZ,
  completed_at                  TIMESTAMPTZ,
  disputed_at                   TIMESTAMPTZ,
  dispute_reason                TEXT,
  expires_at                    TIMESTAMPTZ NOT NULL,
  drs_receipt_id                TEXT REFERENCES "DrsReceipt"(receipt_id) ON DELETE SET NULL,
  issuer_customer_id            TEXT REFERENCES "Customer"(id) ON DELETE SET NULL,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_mandate_proposer"     ON "Mandate"(proposer_agent_id);
CREATE INDEX IF NOT EXISTS "idx_mandate_counterparty" ON "Mandate"(counterparty_agent_id);
CREATE INDEX IF NOT EXISTS "idx_mandate_state"        ON "Mandate"(state);
CREATE INDEX IF NOT EXISTS "idx_mandate_issuer"       ON "Mandate"(issuer_customer_id);
CREATE INDEX IF NOT EXISTS "idx_mandate_expires_open" ON "Mandate"(expires_at)
  WHERE state IN ('proposed', 'signed_by_proposer', 'signed_by_both', 'in_progress');

-- Per-transition audit trail. One row per state change.
-- Includes the on-chain anchor tx hash for verification on BaseScan.
CREATE TABLE IF NOT EXISTS "MandateTransition" (
  id                  TEXT PRIMARY KEY,
  mandate_id          TEXT NOT NULL REFERENCES "Mandate"(id) ON DELETE CASCADE,
  from_state          TEXT,
  to_state            TEXT NOT NULL,
  triggered_by        TEXT,
  anchor_tx_hash      TEXT,
  anchor_chain        TEXT,
  anchor_block_number BIGINT,
  drs_receipt_id      TEXT REFERENCES "DrsReceipt"(receipt_id) ON DELETE SET NULL,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_mandate_transition_mandate" ON "MandateTransition"(mandate_id, created_at);
CREATE INDEX IF NOT EXISTS "idx_mandate_transition_anchor"  ON "MandateTransition"(anchor_tx_hash) WHERE anchor_tx_hash IS NOT NULL;
