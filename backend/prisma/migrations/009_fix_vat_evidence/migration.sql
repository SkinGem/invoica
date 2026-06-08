-- Enable RLS on existing VatEvidence table
ALTER TABLE "VatEvidence" ENABLE ROW LEVEL SECURITY;

-- Create policy for merchants to read their own VAT evidence
CREATE POLICY "merchant_read" ON "VatEvidence"
    FOR SELECT
    USING (
        invoice_id IN (
            SELECT id FROM "Invoices" 
            WHERE merchant_id = auth.uid()
        )
    );

-- Create policy for merchants to insert VAT evidence for their own invoices
CREATE POLICY "merchant_insert" ON "VatEvidence"
    FOR INSERT
    WITH CHECK (
        invoice_id IN (
            SELECT id FROM "Invoices" 
            WHERE merchant_id = auth.uid()
        )
    );