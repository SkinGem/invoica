-- M1-MONEY-02: PaymentEvents table with UNIQUE(chain, txHash)
-- Core anti-duplicate-settlement gate per plan §2.2.
-- The UNIQUE constraint is the actual safety net: the same on-chain tx can
-- never be recorded as payment twice, regardless of which detection path
-- triggered it. Callers INSERT into this table BEFORE mutating the Invoice
-- row; a UNIQUE violation means "duplicate tx" and aborts the settlement.

CREATE TABLE IF NOT EXISTS "PaymentEvents" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoiceId" UUID NOT NULL,
  chain TEXT NOT NULL,
  "txHash" TEXT NOT NULL,
  "amountUsdc" NUMERIC(18, 6) NOT NULL,
  "observedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL CHECK (source IN ('evm-detector', 'solana-detector', 'sap-escrow', 'manual')),
  raw JSONB,
  CONSTRAINT "PaymentEvents_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"(id) ON DELETE RESTRICT,
  CONSTRAINT "PaymentEvents_chain_txHash_key" UNIQUE (chain, "txHash")
);

CREATE INDEX IF NOT EXISTS "PaymentEvents_invoiceId_idx" ON "PaymentEvents" ("invoiceId");
CREATE INDEX IF NOT EXISTS "PaymentEvents_observedAt_idx" ON "PaymentEvents" ("observedAt" DESC);

COMMENT ON TABLE "PaymentEvents" IS 'M1-MONEY-02: append-only record of on-chain payment detections. UNIQUE(chain, txHash) prevents the same tx from settling two invoices.';
