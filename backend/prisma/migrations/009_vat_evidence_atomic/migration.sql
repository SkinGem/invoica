-- Drop existing vat_evidence table if it exists
DROP TABLE IF EXISTS vat_evidence CASCADE;

-- Create VatEvidence table with proper structure
CREATE TABLE "VatEvidence" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "vatNumber" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "validationStatus" TEXT NOT NULL DEFAULT 'pending',
    "validatedAt" TIMESTAMP(3),
    "validationResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VatEvidence_pkey" PRIMARY KEY ("id")
);

-- Create foreign key constraint
ALTER TABLE "VatEvidence" ADD CONSTRAINT "VatEvidence_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for performance
CREATE INDEX "VatEvidence_invoiceId_idx" ON "VatEvidence"("invoiceId");
CREATE INDEX "VatEvidence_vatNumber_idx" ON "VatEvidence"("vatNumber");
CREATE INDEX "VatEvidence_validationStatus_idx" ON "VatEvidence"("validationStatus");

-- Enable Row Level Security
ALTER TABLE "VatEvidence" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy for authenticated users to read their own VAT evidence
CREATE POLICY "Users can view their own VAT evidence" ON "VatEvidence"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "Invoice" 
            WHERE "Invoice"."id" = "VatEvidence"."invoiceId" 
            AND "Invoice"."userId" = auth.uid()
        )
    );

-- Policy for authenticated users to insert VAT evidence for their own invoices
CREATE POLICY "Users can create VAT evidence for their invoices" ON "VatEvidence"
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Invoice" 
            WHERE "Invoice"."id" = "VatEvidence"."invoiceId" 
            AND "Invoice"."userId" = auth.uid()
        )
    );

-- Policy for authenticated users to update their own VAT evidence
CREATE POLICY "Users can update their own VAT evidence" ON "VatEvidence"
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM "Invoice" 
            WHERE "Invoice"."id" = "VatEvidence"."invoiceId" 
            AND "Invoice"."userId" = auth.uid()
        )
    );

-- Policy for authenticated users to delete their own VAT evidence
CREATE POLICY "Users can delete their own VAT evidence" ON "VatEvidence"
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM "Invoice" 
            WHERE "Invoice"."id" = "VatEvidence"."invoiceId" 
            AND "Invoice"."userId" = auth.uid()
        )
    );

-- Policy for service role to have full access
CREATE POLICY "Service role has full access to VAT evidence" ON "VatEvidence"
    FOR ALL
    USING (auth.role() = 'service_role');