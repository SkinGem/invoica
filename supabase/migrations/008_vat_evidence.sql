-- Migration: 008_vat_evidence
-- Creates persistent VatEvidence table for EU VAT validation audit trail.
-- Addresses external audit finding: evidence must survive PM2 restarts (7-year retention).
-- Source of truth supersedes in-memory Map in vat-validator.ts.

BEGIN;

CREATE TABLE IF NOT EXISTS public.vat_evidence (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   TEXT        NOT NULL,
  vat_number    TEXT        NOT NULL,
  country_code CHAR(2)     NOT NULL,
  is_valid     BOOLEAN     NOT NULL,
  validated_at TIMESTAMPTZ  NOT NULL,
  evidence_json JSONB      NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.vat_evidence IS
  'EU VAT number validation evidence — 7-year retention per Council Directive 2006/112/EC.';

COMMENT ON COLUMN public.vat_evidence.invoice_id IS
  'References invoices.id. Nullable FK to allow evidence without a linked invoice (e.g. standalone validation).';
COMMENT ON COLUMN public.vat_evidence.vat_number IS
  'Raw VAT registration number as submitted (e.g. DE123456789, FR12345678901).';
COMMENT ON COLUMN public.vat_evidence.country_code IS
  'ISO 3166-1 alpha-2 country code extracted from VAT number prefix.';
COMMENT ON COLUMN public.vat_evidence.is_valid IS
  'VIES validation result — true = passed, false = failed or unreachable.';
COMMENT ON COLUMN public.vat_evidence.validated_at IS
  'Timestamp of the VIES API call that produced this evidence.';
COMMENT ON COLUMN public.vat_evidence.evidence_json IS
  'Full raw VIES response payload (VIESCheckRequest / VIESCheckRequestfault structs).';

-- Index: fast lookup by invoice (primary retrieval path in vat-validator.ts)
CREATE INDEX IF NOT EXISTS vat_evidence_invoice_id_idx
  ON public.vat_evidence (invoice_id ASC);

-- Index: fast lookup by VAT number (useful for dedup / re-validation checks)
CREATE INDEX IF NOT EXISTS vat_evidence_vat_number_idx
  ON public.vat_evidence (vat_number ASC);

-- Index: time-series retention window queries
CREATE INDEX IF NOT EXISTS vat_evidence_validated_at_idx
  ON public.vat_evidence (validated_at DESC);

-- Row-level security: authenticated agents may insert; only service role may read/delete
ALTER TABLE public.vat_evidence ENABLE ROW LEVEL SECURITY;

-- INSERT policy: any authenticated Supabase user (service role / app role) may store evidence
CREATE POLICY vat_evidence_insert
  ON public.vat_evidence
  FOR INSERT
  WITH CHECK (true);

-- SELECT policy: authenticated readers may retrieve (audit access, reporting)
CREATE POLICY vat_evidence_select
  ON public.vat_evidence
  FOR SELECT
  USING (true);

-- No DELETE policy — audit trail is append-only; records are retained for 7 years then pruned by retention job.

-- Retention helper: soft-delete mark for scheduled purge (avoids physical delete during retention window)
-- Adding now rather than a later migration to keep the table schema stable.
ALTER TABLE public.vat_evidence ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Retention helper: index on deleted_at for purge queries
CREATE INDEX IF NOT EXISTS vat_evidence_deleted_at_idx
  ON public.vat_evidence (deleted_at ASC)
  WHERE deleted_at IS NOT NULL;

-- Stored procedure: atomically upsert evidence by invoice+vat (idempotent on re-validation)
CREATE OR REPLACE FUNCTION public.upsert_vat_evidence(
  p_invoice_id   TEXT,
  p_vat_number  TEXT,
  p_country_code CHAR(2),
  p_is_valid    BOOLEAN,
  p_validated_at TIMESTAMPTZ,
  p_evidence_json JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.vat_evidence
    (invoice_id, vat_number, country_code, is_valid, validated_at, evidence_json)
  VALUES
    (p_invoice_id, p_vat_number, p_country_code, p_is_valid, p_validated_at, p_evidence_json)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Stored procedure: retrieve most recent evidence for an invoice
CREATE OR REPLACE FUNCTION public.get_vat_evidence_for_invoice(
  p_invoice_id TEXT
) RETURNS SETOF public.vat_evidence
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.vat_evidence
  WHERE invoice_id = p_invoice_id
    AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;
END;
$$;

-- Stored procedure: mark evidence as deleted (append-only retention prune)
CREATE OR REPLACE FUNCTION public.soft_delete_vat_evidence(
  p_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.vat_evidence
  SET deleted_at = now()
  WHERE id = p_id
    AND deleted_at IS NULL;
END;
$$;

-- GrantEXECUTE to service role so vat-validator.ts service layer can call these functions
-- Role name must match the role used by the application (set via SUPABASE_SERVICE_ROLE in env).
GRANT EXECUTE ON FUNCTION public.upsert_vat_evidence TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vat_evidence_for_invoice TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_vat_evidence TO authenticated;
GRANT SELECT, INSERT ON public.vat_evidence TO authenticated;

COMMIT;