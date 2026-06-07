-- Drop the old snake_case table
DROP TABLE IF EXISTS vat_evidence;

-- Create the new PascalCase VatEvidence table
CREATE TABLE "VatEvidence" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "evidenceData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VatEvidence_pkey" PRIMARY KEY ("id")
);

-- Create foreign key constraint with CASCADE delete
ALTER TABLE "VatEvidence" ADD CONSTRAINT "VatEvidence_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create composite unique constraint
ALTER TABLE "VatEvidence" ADD CONSTRAINT "VatEvidence_invoiceId_evidenceType_key" UNIQUE ("invoiceId", "evidenceType");

-- Create index for performance
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