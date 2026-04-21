-- Post-M1 invoice cleanup (plan §6.1 M2-CUST-01 prerequisite).
-- Flags the 13 existing internal/test invoices so public metrics can filter
-- them out. All current invoices are demo/test data per triage 2026-04-21:
--   nova@creator.ai, aria@agent.ai  (PACT demo)
--   sap-agent@x402.invoica.ai       (internal self-dealing)
--   buyer@example.com                (literal test data)
--   3feudtV2@agents.solana           (internal Solana agent)

ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "isTest" BOOLEAN NOT NULL DEFAULT false;

-- Tag existing internal/test invoices as isTest=true.
-- Pattern match on known internal domains + explicit test emails.
UPDATE "Invoice"
SET "isTest" = true
WHERE "customerEmail" ~* '@invoica\.ai$'
   OR "customerEmail" ~* '@x402\.invoica\.ai$'
   OR "customerEmail" IN (
     'nova@creator.ai',
     'aria@agent.ai',
     'buyer@example.com'
   )
   OR "customerEmail" ~* '@agents\.solana$';

CREATE INDEX IF NOT EXISTS "Invoice_isTest_idx" ON "Invoice" ("isTest") WHERE "isTest" = false;

COMMENT ON COLUMN "Invoice"."isTest" IS 'True for internal/test/demo invoices. Public metrics filter these out by default. See reports/growth/invoice-triage-2026-04-21.md.';
