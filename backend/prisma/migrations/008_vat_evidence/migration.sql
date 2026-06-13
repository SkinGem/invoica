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

-- Add foreign key constraint from vat_evidence_transactions to invoices
ALTER TABLE vat_evidence_transactions 
ADD CONSTRAINT fk_vat_evidence_transactions_invoice_id 
FOREIGN KEY (invoice_id) 
REFERENCES invoices(id) 
ON DELETE CASCADE;

-- DESIGN FLAW 4: Missing critical performance indexes for tax queries
-- Tax compliance queries frequently filter by validation_status, evidence_type, and retention_until
CREATE INDEX IF NOT EXISTS idx_vat_evidence_items_transaction_id ON vat_evidence_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_vat_evidence_items_invoice_id ON vat_evidence_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_vat_evidence_items_validation_status ON vat_evidence_items(validation_status);
CREATE INDEX IF NOT EXISTS idx_vat_evidence_items_evidence_type ON vat_evidence_items(evidence_type);
CREATE INDEX IF NOT EXISTS idx_vat_evidence_items_retention_until ON vat_evidence_items(retention_until);
CREATE INDEX IF NOT EXISTS idx_vat_evidence_transactions_invoice_id ON vat_evidence_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_vat_evidence_transactions_status ON vat_evidence_transactions(status);

-- Add composite index for common tax audit queries (invoice + evidence type)
CREATE INDEX IF NOT EXISTS idx_vat_evidence_items_invoice_type ON vat_evidence_items(invoice_id, evidence_type);

-- Add GIN index on evidence_data JSONB column for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_vat_evidence_items_evidence_data_gin ON vat_evidence_items USING GIN(evidence_data);

-- Add check constraints for validation_status enum
ALTER TABLE vat_evidence_items 
ADD CONSTRAINT chk_validation_status 
CHECK (validation_status IN ('pending', 'valid', 'invalid', 'expired', 'error'));

-- Add check constraint for evidence_type to ensure only valid types
ALTER TABLE vat_evidence_items 
ADD CONSTRAINT chk_evidence_type 
CHECK (evidence_type IN ('vat_number_validation', 'ip_geolocation', 'billing_address', 'payment_method', 'customer_declaration'));