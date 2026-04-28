import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { calculateAgentTax, AgentTaxLine } from '../tax/agenttax-client';
import type { ClinPaySessionRow } from '../asterpay/clinpay-session';
import type { SyntheticMandate } from '../asterpay/mandate';

let _sb: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (_sb) return _sb;
  _sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  return _sb;
}

export const PACT_VERSION = '0.3.2';
const ASTERPAY_DEFAULT_JURISDICTION = 'FI';

export interface SettleCallbackPayload {
  session_id?: string;
  status?: string;
  occurred_at?: string;
  payout_method?: string;
  settlement?: {
    provider?: string;
    provider_ref?: string;
    tx_hash?: string | null;
  };
  drs_receipt?: Record<string, unknown>;
}

export interface DrsReceiptRow {
  receipt_id: string;
  clinpay_session_id: string;
  invoice_id: string | null;
  visit_id: string;
  study_id: string;
  amount_eur: number;
  amount_usdc: number;
  settled_at: string;
  settlement_tx_hash: string;
  settlement_provider: string;
  mandate_hash: string;
  pact_version: string;
  sponsor_agent_id: string;
  sponsor_jurisdiction: string | null;
  asterpay_jurisdiction: string | null;
  rail: 'sepa' | 'wallet';
  tax_line: AgentTaxLine | null;
  created_at: string;
}

export async function findReceiptBySessionId(clinpaySessionId: string): Promise<DrsReceiptRow | null> {
  const { data, error } = await sb()
    .from('DrsReceipt')
    .select('*')
    .eq('clinpay_session_id', clinpaySessionId)
    .maybeSingle();
  if (error) throw new Error(`findReceiptBySessionId: ${error.message}`);
  return (data as DrsReceiptRow) || null;
}

/**
 * Mint a DRS receipt for a settled ClinPay session. Idempotent — returns the
 * existing receipt if one is already minted. Sandbox-only persists to DB;
 * Sprint 2 will add an on-chain Base mint step.
 */
export async function mintDrsReceipt(
  session: ClinPaySessionRow,
  payload: SettleCallbackPayload,
  taxLine: AgentTaxLine | null,
): Promise<DrsReceiptRow> {
  const existing = await findReceiptBySessionId(session.id);
  if (existing) return existing;

  const settledAt = payload.occurred_at || new Date().toISOString();
  const providerRef = payload.settlement?.provider_ref || `unknown-${session.asterpay_session_id}`;
  const txHash = payload.settlement?.tx_hash || providerRef; // sandbox: use provider_ref
  const provider = payload.settlement?.provider || 'unknown';

  let mandate: SyntheticMandate | null = null;
  try {
    mandate = JSON.parse(session.mandate_json) as SyntheticMandate;
  } catch {
    /* mandate parse failure is non-fatal here — receipt still mintable from session fields */
  }
  const sponsorJurisdiction = mandate?.scope?.sponsorJurisdiction || null;

  const row: Omit<DrsReceiptRow, 'created_at'> = {
    receipt_id: `drs-${randomUUID()}`,
    clinpay_session_id: session.id,
    invoice_id: session.invoice_id,
    visit_id: session.visit_id,
    study_id: session.study_id,
    amount_eur: session.amount_eur,
    amount_usdc: session.amount_usdc,
    settled_at: settledAt,
    settlement_tx_hash: txHash,
    settlement_provider: provider,
    mandate_hash: session.mandate_hash,
    pact_version: PACT_VERSION,
    sponsor_agent_id: mandate?.grantor || `clinpay-sponsor-${session.study_id}`,
    sponsor_jurisdiction: sponsorJurisdiction,
    asterpay_jurisdiction: ASTERPAY_DEFAULT_JURISDICTION,
    rail: session.payout_method,
    tax_line: taxLine,
  };

  const { data, error } = await sb().from('DrsReceipt').insert(row).select().single();
  if (error) throw new Error(`mintDrsReceipt: ${error.message}`);
  return data as DrsReceiptRow;
}

/**
 * Flip an Invoice from PENDING → SETTLED. Idempotent — no-op if already SETTLED.
 * Merges new settlement metadata into existing paymentDetails to preserve
 * the clinpay-product fields written at issue time.
 */
export async function markInvoiceSettled(
  invoiceId: string,
  settledAt: string,
  settlementTxHash: string,
  settlementProvider: string,
): Promise<void> {
  const { data: current, error: readErr } = await sb()
    .from('Invoice')
    .select('status, paymentDetails')
    .eq('id', invoiceId)
    .maybeSingle();
  if (readErr) throw new Error(`markInvoiceSettled read: ${readErr.message}`);
  if (!current) throw new Error(`markInvoiceSettled: invoice ${invoiceId} not found`);
  if (current.status === 'SETTLED') return;

  const existingDetails = (current.paymentDetails as Record<string, unknown>) || {};
  const merged = {
    ...existingDetails,
    settledAt,
    settlementTxHash,
    settlementProvider,
  };

  const { error: updErr } = await sb()
    .from('Invoice')
    .update({ status: 'SETTLED', settledAt, paymentDetails: merged })
    .eq('id', invoiceId);
  if (updErr) throw new Error(`markInvoiceSettled update: ${updErr.message}`);
}

/**
 * Compute AgentTax line for a US-jurisdiction sponsor. Returns null when:
 *   - Mandate has no sponsorJurisdiction
 *   - Jurisdiction isn't US (US-XX format expected)
 *   - AgentTax errors out (caller proceeds without tax line)
 */
export async function recordClinPayTax(
  session: ClinPaySessionRow,
  amountUsdc: number,
): Promise<AgentTaxLine | null> {
  let mandate: SyntheticMandate;
  try {
    mandate = JSON.parse(session.mandate_json) as SyntheticMandate;
  } catch {
    return null;
  }
  const jur = mandate.scope?.sponsorJurisdiction;
  if (!jur || !jur.startsWith('US-')) {
    if (jur) console.log(`[clinpay] tax skip: jurisdiction ${jur} non-US`);
    return null;
  }
  const buyerState = jur.slice(3); // "US-CA" -> "CA"
  try {
    return await calculateAgentTax({
      role: 'seller',
      amount: amountUsdc,
      buyer_state: buyerState,
      transaction_type: 'service',
      counterparty_id: mandate.grantor,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[clinpay] AgentTax call failed (non-fatal): ${msg}`);
    return null;
  }
}
