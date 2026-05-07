-- 012_billing_credits.sql — pay-as-you-go billing surface (M2 gate, May 15)
--
-- Pricing model: 1% of invoice value (USD), floor $0.01, cap $5, charged on
-- settlement only. Customer pre-loads credits via Stripe Checkout; insufficient
-- balance triggers off-session card charge against saved payment method.
--
-- Design:
--   Customer  — central row per customer (one per customerId across all ApiKeys),
--               holds Stripe customer + default payment method.
--   Credit    — 1:1 with Customer, current cents balance (USD only for v1).
--   CreditTxn — append-only ledger of every topup + debit + outstanding-fee.
--
-- All tables PascalCase to match existing schema (Invoice, ApiKey, ClinPaySession).

CREATE TABLE IF NOT EXISTS "Customer" (
  id                          TEXT PRIMARY KEY,           -- mirrors ApiKey.customerId
  email                       TEXT NOT NULL,
  stripe_customer_id          TEXT UNIQUE,                -- null until first topup
  default_payment_method_id   TEXT,                       -- saved card from setup_future_usage='off_session'
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_email ON "Customer"(email);
CREATE INDEX IF NOT EXISTS idx_customer_stripe ON "Customer"(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Backfill from existing ApiKey rows. Skip placeholder rows ('default',
-- 'demo-user') with NULL email — those are dev/orchestrator artifacts.
-- If a customer has multiple keys, take any (email is shared per customerId).
-- ON CONFLICT DO NOTHING so reruns are safe.
INSERT INTO "Customer" (id, email)
SELECT DISTINCT ON ("customerId") "customerId", "customerEmail"
FROM "ApiKey"
WHERE "customerId" IS NOT NULL AND "customerEmail" IS NOT NULL
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS "Credit" (
  customer_id      TEXT PRIMARY KEY REFERENCES "Customer"(id) ON DELETE CASCADE,
  balance_cents    BIGINT NOT NULL DEFAULT 0 CHECK (balance_cents >= -1000000),  -- allow small negative for off-session-charge race
  currency         TEXT NOT NULL DEFAULT 'usd' CHECK (currency = 'usd'),         -- v1: USD only
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Initialize Credit row for every backfilled Customer.
INSERT INTO "Credit" (customer_id, balance_cents)
SELECT id, 0 FROM "Customer"
ON CONFLICT (customer_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS "CreditTxn" (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id         TEXT NOT NULL REFERENCES "Customer"(id) ON DELETE CASCADE,
  type                TEXT NOT NULL CHECK (type IN ('topup', 'debit', 'charge', 'refund', 'outstanding')),
  -- topup: customer added funds via Stripe Checkout (positive)
  -- debit: settlement fee paid from balance (negative)
  -- charge: settlement fee paid via off-session card charge (negative; balance_cents not affected)
  -- refund: reversal of a charge (positive)
  -- outstanding: settlement fee that could not be collected (negative; flag user)
  amount_cents        BIGINT NOT NULL,
  ref_table           TEXT,                                      -- e.g. 'Invoice'
  ref_id              TEXT,                                      -- e.g. invoice.id
  stripe_event_id     TEXT UNIQUE,                               -- idempotency anchor for Stripe webhooks
  stripe_session_id   TEXT,                                      -- checkout.session.id for topups
  stripe_payment_intent_id TEXT,                                 -- pi for charges
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-invoice idempotency: each invoice can produce at most one settlement-fee txn.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_credittxn_invoice_settlement_fee
  ON "CreditTxn"(ref_id)
  WHERE ref_table = 'Invoice' AND type IN ('debit', 'charge', 'outstanding');

CREATE INDEX IF NOT EXISTS idx_credittxn_customer_created ON "CreditTxn"(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credittxn_stripe_event ON "CreditTxn"(stripe_event_id) WHERE stripe_event_id IS NOT NULL;

-- Updated-at trigger for Customer + Credit (reuses existing pattern from earlier migrations).
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customer_updated_at ON "Customer";
CREATE TRIGGER trg_customer_updated_at BEFORE UPDATE ON "Customer"
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_credit_updated_at ON "Credit";
CREATE TRIGGER trg_credit_updated_at BEFORE UPDATE ON "Credit"
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
