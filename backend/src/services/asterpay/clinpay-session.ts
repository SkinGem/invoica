import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { SyntheticMandate } from './mandate';

let _sb: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (_sb) return _sb;
  _sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  return _sb;
}

export interface ClinPaySessionRow {
  id: string;
  asterpay_session_id: string;
  study_id: string;
  visit_id: string;
  amount_eur: number;
  amount_usdc: number;
  recipient_country: string;
  payout_method: 'sepa' | 'wallet';
  // Signed mandate stored as JSON string (TEXT column) — byte-exact, since
  // JSONB normalizes nested key order and would break HMAC verification.
  mandate_json: string;
  mandate_hash: string;
  invoice_id: string | null;
  status: 'created' | 'submitted' | 'settled' | 'failed' | 'expired';
  last_event: Record<string, unknown> | null;
  /** Resolved at /api/redirect-to-payment from the caller's x-api-key. */
  issuer_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateClinPaySessionInput {
  asterpay_session_id: string;
  study_id: string;
  visit_id: string;
  amount_eur: number;
  amount_usdc: number;
  recipient_country: string;
  payout_method: 'sepa' | 'wallet';
  mandate: SyntheticMandate;
  /** Optional. When the caller authed with x-api-key, this is ApiKey.customerId. */
  issuer_customer_id?: string | null;
}

export async function createClinPaySession(input: CreateClinPaySessionInput): Promise<ClinPaySessionRow> {
  const mandateJson = JSON.stringify(input.mandate);
  const { data, error } = await sb()
    .from('ClinPaySession')
    .insert({
      id: `clinpay-${input.asterpay_session_id}`,
      asterpay_session_id: input.asterpay_session_id,
      study_id: input.study_id,
      visit_id: input.visit_id,
      amount_eur: input.amount_eur,
      amount_usdc: input.amount_usdc,
      recipient_country: input.recipient_country,
      payout_method: input.payout_method,
      mandate_json: mandateJson,
      mandate_hash: input.mandate.signature.slice(0, 16),
      status: 'created',
      issuer_customer_id: input.issuer_customer_id ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`createClinPaySession: ${error.message}`);
  return data as ClinPaySessionRow;
}

export async function findByAsterPaySessionId(asterpaySessionId: string): Promise<ClinPaySessionRow | null> {
  const { data, error } = await sb()
    .from('ClinPaySession')
    .select('*')
    .eq('asterpay_session_id', asterpaySessionId)
    .maybeSingle();
  if (error) throw new Error(`findByAsterPaySessionId: ${error.message}`);
  return (data as ClinPaySessionRow) || null;
}

export async function updateSessionStatus(
  id: string,
  status: ClinPaySessionRow['status'],
  patch: { invoice_id?: string; last_event?: Record<string, unknown> } = {},
): Promise<void> {
  const { error } = await sb()
    .from('ClinPaySession')
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...(patch.invoice_id !== undefined ? { invoice_id: patch.invoice_id } : {}),
      ...(patch.last_event !== undefined ? { last_event: patch.last_event } : {}),
    })
    .eq('id', id);
  if (error) throw new Error(`updateSessionStatus: ${error.message}`);
}

export interface ClinPayInvoiceInput {
  asterpay_session_id: string;
  study_id: string;
  visit_id: string;
  /** Amount in EUR units (matches the DRS receipt's amount_eur column). */
  amount_eur: number;
  mandate_hash: string;
  /** Optional. Resolved from the session's issuer_customer_id (which itself
   * came from the panel platform's x-api-key at redirect-to-payment time). */
  issuer_customer_id?: string | null;
}

/**
 * Create an Invoica invoice for a ClinPay session. Zero PII: customer fields
 * are synthetic placeholders derived from anonymous trial identifiers.
 *
 * Currency is EUR — the ClinPay flow settles via SEPA. Earlier hardcoded
 * 'USDC' was a copy-paste from x402 paths and produced internally-inconsistent
 * receipts (amount_eur EUR vs paymentDetails.currency USDC). Fixed 2026-05-15.
 */
export async function createClinPayInvoice(input: ClinPayInvoiceInput): Promise<{ id: string; invoiceNumber: number }> {
  const { data: maxData } = await sb()
    .from('Invoice')
    .select('invoiceNumber')
    .order('invoiceNumber', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextNumber = ((maxData?.invoiceNumber as number) || 0) + 1;

  const synthEmail = `clinpay+${input.asterpay_session_id.slice(0, 8)}@invoica.internal`;
  const synthName = `ClinPay visit ${input.visit_id}`;
  const { data, error } = await sb()
    .from('Invoice')
    .insert({
      invoiceNumber: nextNumber,
      status: 'PENDING',
      amount: input.amount_eur,
      currency: 'EUR',
      customerEmail: synthEmail,
      customerName: synthName,
      agentId: `clinpay-sponsor-${input.study_id}`,
      isTest: true,
      issuer_customer_id: input.issuer_customer_id ?? null,
      paymentDetails: {
        product: 'clinpay',
        sandbox: true,
        asterpaySessionId: input.asterpay_session_id,
        studyId: input.study_id,
        visitId: input.visit_id,
        mandateHash: input.mandate_hash,
      },
    })
    .select('id, invoiceNumber')
    .single();
  if (error) throw new Error(`createClinPayInvoice: ${error.message}`);
  return data as { id: string; invoiceNumber: number };
}

// markInvoiceSettled is Day 6-7 work (DRS receipt minting). Stubbed out until then.
