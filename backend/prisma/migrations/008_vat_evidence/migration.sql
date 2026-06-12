-- Migration: Add FK constraints for VAT evidence system
-- Created: 2024-12-19
-- Purpose: Link vat_evidence_items to vat_evidence_transactions and invoices with proper cascading
-- Fixed: DIR-011 audit findings - indexes, column types, NOT NULL constraints, timestamps

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
ADD CONSTRAINT fk_vat_evidence_items_transaction_id 
FOREIGN KEY (transaction_id) 
REFERENCES vat_evidence_transactions(id) 
ON DELETE CASCADE;

-- Add foreign key constraint from vat_evidence_items to invoices
ALTER TABLE vat_evidence_items 
ADD CONSTRAINT fk_vat_evidence_items_invoice_id 
FOREIGN KEY (invoice_id) 
REFERENCES invoices(id) 
ON DELETE CASCADE;

-- Add missing index on transaction_id for performance
CREATE INDEX IF NOT EXISTS idx_vat_evidence_items_transaction_id ON vat_evidence_items(transaction_id);

-- Add missing index on invoice_id for performance (DIR-011 finding)
CREATE INDEX IF NOT EXISTS idx_vat_evidence_items_invoice_id ON vat_evidence_items(invoice_id);

-- Add foreign key constraint from vat_evidence_transactions to invoices
ALTER TABLE vat_evidence_transactions 
ADD CONSTRAINT fk_vat_evidence_transactions_invoice_id 
FOREIGN KEY (invoice_id) 
REFERENCES invoices(id) 
ON DELETE CASCADE;

-- Add index on invoice_id in vat_evidence_transactions for performance
CREATE INDEX IF NOT EXISTS idx_vat_evidence_transactions_invoice_id ON vat_evidence_transactions(invoice_id);

-- Add composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_vat_evidence_items_invoice_type ON vat_evidence_items(invoice_id, evidence_type);

-- Add index on status for filtering transactions
CREATE INDEX IF NOT EXISTS idx_vat_evidence_transactions_status ON vat_evidence_transactions(status);

-- Update existing records to have proper timestamps (backward compatibility)
UPDATE vat_evidence_items SET 
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;

UPDATE vat_evidence_transactions SET 
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;