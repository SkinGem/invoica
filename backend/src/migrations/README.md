This directory contains SQL migration scripts for the Countable backend.

## Running Migrations

### Supabase SQL Editor

1. Open your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy the contents of the desired migration file
4. Paste and execute

## Available Migrations

### add_chain_to_invoice.sql

Adds a `chain` column to the Invoice table to support multi-chain invoicing.

**Purpose:** Enables invoicing across multiple blockchains (Base, Polygon, Solana)

**Supported Chains:**
- `base` (default)
- `polygon`
- `solana`

**How to Run:**

Paste the contents of `add_chain_to_invoice.sql` into the Supabase SQL Editor.

**Rollback:**

ALTER TABLE "Invoice" DROP COLUMN IF EXISTS chain;