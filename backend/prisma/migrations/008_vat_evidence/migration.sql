-- Migration: Add FK constraints for VAT evidence system
-- Created: 2024-12-19
-- Purpose: Link vat_evidence_items to vat_evidence_transactions and invoices with proper cascading
-- Fixed: DIR-011 audit findings - indexes, column types, NOT NULL constraints, timestamps

-- DESIGN FLAW 1: Missing evidence_data column for storing actual evidence content
-- VAT compliance requires storing the evidence itself, not just URLs
-- Adding JSONB column for structured evidence data (IP geolocation, VIES responses, etc.)
ALTER TABLE vat_evidence_items 
ADD COLUMN IF NOT EXISTS evidence_data JSONB;

-- DESIGN FLAW 2: Missing validation_status and validation_timestamp columns
-- Tax authorities require proof of when evidence was validated and its status
ALTER TABLE vat_evidence_items 
ADD COLUMN IF NOT EXISTS validation_status VARCHAR(50) DEFAULT 'pending' NOT NULL,
ADD COLUMN IF NOT EXISTS validation_timestamp TIMESTAMP WITH TIME ZONE;

-- DESIGN FLAW 3: Missing retention_until column for compliance lifecycle
-- EU VAT records must be retained for specific periods (typically 10 years)
ALTER TABLE vat_evidence_items 
ADD COLUMN IF NOT EXISTS retention_until DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '10 years');

-- Fix column types: evidenceUrl should be TEXT for long URLs
ALTER TABLE vat_evidence_items 
ALTER COLUMN evidence_url TYPE TEXT;

-- Add missing NOT NULL constraints where required
ALTER TABLE vat_evidence_items 
ALTER COLUMN transaction_id SET NOT NULL,
ALTER COLUMN invoice_id SET NOT NULL,
ALTER COLUMN evidence_type SET NOT NULL,
ALTER COLUMN evidence_url SET NOT NULL;

ALTER TABLE vat_evidence_transactions
ALTER COLUMN invoice_id SET NOT NULL,
ALTER COLUMN status SET NOT NULL;

-- Add created_at and updated_at with defaults if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vat_evidence_items' AND column_name = 'created_at') THEN
        ALTER TABLE vat_evidence_items ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vat_evidence_items' AND column_name = 'updated_at') THEN
        ALTER TABLE vat_evidence_items ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vat_evidence_transactions' AND column_name = 'created_at') THEN
        ALTER TABLE vat_evidence_transactions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vat_evidence_transactions' AND column_name = 'updated_at') THEN
        ALTER TABLE vat_evidence_transactions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;
    END IF;
END $$;

-- Add foreign key constraint from vat_evidence_items to vat_evidence_transactions
ALTER TABLE vat_evidence_items 
ADD CONSTRAINT fk_vat_evidence_items_transaction 
FOREIGN KEY (transaction_id) REFERENCES vat_evidence_transactions(id) 
ON DELETE CASCADE;

-- Add foreign key constraint from vat_evidence_items to invoices
ALTER TABLE vat_evidence_items 
ADD CONSTRAINT fk_vat_evidence_items_invoice 
FOREIGN KEY (invoice_id) REFERENCES invoices(id) 
ON DELETE CASCADE;

-- Add foreign key constraint from vat_evidence_transactions to invoices
ALTER TABLE vat_evidence_transactions 
ADD CONSTRAINT fk_vat_evidence_transactions_invoice 
FOREIGN KEY (invoice_id) REFERENCES invoices(id) 
ON DELETE CASCADE;

-- Add performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_vat_evidence_items_transaction_id 
ON vat_evidence_items(transaction_id);

CREATE INDEX IF NOT EXISTS idx_vat_evidence_items_invoice_id 
ON vat_evidence_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_vat_evidence_items_evidence_type 
ON vat_evidence_items(evidence_type);

CREATE INDEX IF NOT EXISTS idx_vat_evidence_items_validation_status 
ON vat_evidence_items(validation_status);

CREATE INDEX IF NOT EXISTS idx_vat_evidence_items_retention_until 
ON vat_evidence_items(retention_until);

CREATE INDEX IF NOT EXISTS idx_vat_evidence_transactions_invoice_id 
ON vat_evidence_transactions(invoice_id);

CREATE INDEX IF NOT EXISTS idx_vat_evidence_transactions_status 
ON vat_evidence_transactions(status);

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_vat_evidence_items_invoice_type 
ON vat_evidence_items(invoice_id, evidence_type);

CREATE INDEX IF NOT EXISTS idx_vat_evidence_items_transaction_status 
ON vat_evidence_items(transaction_id, validation_status);

-- Add updated_at trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to both tables
DROP TRIGGER IF EXISTS update_vat_evidence_items_updated_at ON vat_evidence_items;
CREATE TRIGGER update_vat_evidence_items_updated_at 
    BEFORE UPDATE ON vat_evidence_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vat_evidence_transactions_updated_at ON vat_evidence_transactions;
CREATE TRIGGER update_vat_evidence_transactions_updated_at 
    BEFORE UPDATE ON vat_evidence_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add check constraints for data validation
ALTER TABLE vat_evidence_items 
ADD CONSTRAINT chk_evidence_type_valid 
CHECK (evidence_type IN ('ip_geolocation', 'vies_validation', 'billing_address', 'payment_method', 'customer_declaration', 'other'));

ALTER TABLE vat_evidence_items 
ADD CONSTRAINT chk_validation_status_valid 
CHECK (validation_status IN ('pending', 'valid', 'invalid', 'expired', 'error'));

ALTER TABLE vat_evidence_transactions 
ADD CONSTRAINT chk_status_valid 
CHECK (status IN ('pending', 'collecting', 'complete', 'failed', 'expired'));

-- Add comments for documentation
COMMENT ON TABLE vat_evidence_items IS 'Individual pieces of VAT evidence collected for tax compliance';
COMMENT ON TABLE vat_evidence_transactions IS 'VAT evidence collection transactions linking to invoices';

COMMENT ON COLUMN vat_evidence_items.evidence_data IS 'Structured evidence data (IP geolocation, VIES responses, etc.) in JSONB format';
COMMENT ON COLUMN vat_evidence_items.validation_status IS 'Current validation status of this evidence item';
COMMENT ON COLUMN vat_evidence_items.validation_timestamp IS 'When this evidence was last validated';
COMMENT ON COLUMN vat_evidence_items.retention_until IS 'Date until which this evidence must be retained for compliance';