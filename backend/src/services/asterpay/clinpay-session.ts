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
  mandate_json: SyntheticMandate;
  mandate_hash: string;
  invoice_id: string | null;
  status: 'created' | 'submitted' | 'settled' | 'failed' | 'expired';
  last_event: Record<string, unknown> | null;
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
}

export async function createClinPaySession(input: CreateClinPaySessionInput): Promise<ClinPaySessionRow> {
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
      mandate_json: input.mandate,
      mandate_hash: input.mandate.signature.slice(0, 16),
      status: 'created',
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
  amount_usdc: number;
  mandate_hash: string;
}

/**
 * Create an Invoica invoice for a ClinPay session. Zero PII: customer fields
 * are synthetic placeholders derived from anonymous trial identifiers.
 */
export async function createClinPayInvoice(input: ClinPayInvoiceInput): Promise<{ id: string; invoiceNumber: number }> {
  const synthEmail = `clinpay+${input.asterpay_session_id.slice(0, 8)}@invoica.internal`;
  const synthName = `ClinPay visit ${input.visit_id}`;
  const { data, error } = await sb()
    .from('Invoice')
    .insert({
      status: 'PENDING',
      amount: input.amount_usdc,
      currency: 'USDC',
      customerEmail: synthEmail,
      customerName: synthName,
      agentId: `clinpay-sponsor-${input.study_id}`,
      isTest: true,
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
