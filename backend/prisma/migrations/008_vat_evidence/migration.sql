-- Migration: Add FK constraints for VAT evidence system
-- Created: 2024-12-19
-- Purpose: Link vat_evidence_items to vat_evidence_transactions and invoices with proper cascading

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

-- Add index on transaction_id for performance
CREATE INDEX idx_vat_evidence_items_transaction_id ON vat_evidence_items(transaction_id);

-- Add index on invoice_id for performance
CREATE INDEX idx_vat_evidence_items_invoice_id ON vat_evidence_items(invoice_id);

-- Add foreign key constraint from vat_evidence_transactions to invoices
ALTER TABLE vat_evidence_transactions 
ADD CONSTRAINT fk_vat_evidence_transactions_invoice_id 
FOREIGN KEY (invoice_id) 
REFERENCES invoices(id) 
ON DELETE CASCADE;

-- Add index on invoice_id in vat_evidence_transactions for performance
CREATE INDEX idx_vat_evidence_transactions_invoice_id ON vat_evidence_transactions(invoice_id);