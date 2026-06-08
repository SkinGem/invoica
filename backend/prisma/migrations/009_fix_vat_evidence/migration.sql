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

-- Create upsert function for VAT evidence
CREATE OR REPLACE FUNCTION upsert_vat_evidence(
    p_invoice_id uuid, 
    p_evidence_type text, 
    p_file_url text, 
    p_metadata jsonb
) RETURNS "VatEvidence" AS $$
    INSERT INTO "VatEvidence" (invoice_id, evidence_type, file_url, metadata)
    VALUES (p_invoice_id, p_evidence_type, p_file_url, p_metadata)
    ON CONFLICT (invoice_id, evidence_type)
    DO UPDATE SET 
        file_url = EXCLUDED.file_url,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    RETURNING *;
$$ LANGUAGE sql SECURITY DEFINER;