-- Drop the old table with CASCADE to remove dependencies
DROP TABLE IF EXISTS vat_evidence CASCADE;

-- Create the new VatEvidence table with proper structure
CREATE TABLE "VatEvidence" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoiceId" UUID NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "fileUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VatEvidence_pkey" PRIMARY KEY ("id")
);

-- Create foreign key constraint with CASCADE delete
ALTER TABLE "VatEvidence" ADD CONSTRAINT "VatEvidence_invoiceId_fkey" 
    FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create index on invoice_id for performance
CREATE INDEX "VatEvidence_invoiceId_idx" ON "VatEvidence"("invoiceId");

-- Enable RLS
ALTER TABLE "VatEvidence" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access VatEvidence for their own invoices
CREATE POLICY "VatEvidence_user_access" ON "VatEvidence"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "Invoice" 
            WHERE "Invoice"."id" = "VatEvidence"."invoiceId" 
            AND "Invoice"."userId" = auth.uid()
        )
    );

-- RLS Policy: Service role can access all records
CREATE POLICY "VatEvidence_service_access" ON "VatEvidence"
    FOR ALL
    TO service_role
    USING (true);