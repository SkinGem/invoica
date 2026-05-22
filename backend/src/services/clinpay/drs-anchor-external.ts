// External DRS anchoring — entry point for partners (AsterPay) to mint a
// Deal Receipt after a settled panellist payout. Wraps the on-chain anchor
// + DB persistence + mandate validation.
//
// Distinct from services/clinpay/drs-receipt.ts which is the
// internal-ClinPay-session minting path. Both write to the same DrsReceipt
// table; the `source` column distinguishes ('clinpay-internal' vs
// 'asterpay' vs other partner ids).

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID, createHash } from 'node:crypto';
import { getMandate } from '../mandate/repo';
import { anchorMandateState } from '../mandate/anchor';

let _sb: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (_sb) return _sb;
  _sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  return _sb;
}

const PACT_VERSION = '0.3.2';

export interface ExternalDrsAnchorInput {
  mandate_id: string;
  campaign_id: string;
  panellist_id_hash: string;
  visit_id: string;
  study_id: string;
  amount_eur: number;
  amount_usdc: number;
  fee_breakdown?: {
    asterpay_fee_usdc?: number;
    invoica_fee_usdc?: number;
  };
  settlement: {
    rail: 'sepa_instant' | 'faster_payments' | 'usdc' | 'wallet' | 'sepa';
    sepa_tx_ref?: string;
    tx_hash?: string;
    settled_at: string;
  };
  tax_line?: Record<string, unknown> | null;
  source?: string; // partner id, defaults to 'asterpay'
}

export interface ExternalDrsAnchorResult {
  receipt_id: string;
  mandate_hash: string;
  anchor_chain: string | null;
  anchor_tx_hash: string | null;
  anchor_block_number: number | null;
  explorer_url: string | null;
  pact_version: string;
}

export class DrsAnchorError extends Error {
  constructor(public statusCode: number, public code: string, message: string) {
    super(message);
    this.name = 'DrsAnchorError';
  }
}

/**
 * Anchor a panellist payout receipt. Validates that the cited mandate exists
 * and has been signed by both parties, then persists the receipt + best-effort
 * on-chain anchor.
 */
export async function anchorExternalDrsReceipt(input: ExternalDrsAnchorInput): Promise<ExternalDrsAnchorResult> {
  // 1. Validate mandate exists + is in a signed state
  const mandate = await getMandate(input.mandate_id);
  if (!mandate) {
    throw new DrsAnchorError(404, 'mandate_not_found', `Mandate ${input.mandate_id} not found`);
  }
  const allowedStates = new Set(['signed_by_both', 'in_progress', 'completed']);
  if (!allowedStates.has(mandate.state)) {
    throw new DrsAnchorError(409, 'mandate_not_signed', `Mandate state '${mandate.state}' — must be signed by both parties before anchoring receipts`);
  }

  // Mandate hash is set when proposer signs; use it directly. If somehow
  // missing (older mandate), compute on the fly from the same canonical bytes.
  const mandateHash =
    mandate.pact_mandate_hash ||
    ('0x' + createHash('sha256').update(JSON.stringify({
      counterparty_agent_id: mandate.counterparty_agent_id,
      expires_at: new Date(mandate.expires_at).toISOString(),
      id: mandate.id,
      proposer_agent_id: mandate.proposer_agent_id,
      scope: mandate.scope,
      terms: mandate.terms,
    })).digest('hex'));

  // 2. Insert DrsReceipt row first — fast, then anchor async-style below
  const receiptId = `drs-${randomUUID()}`;
  const sponsorJurisdiction = (() => {
    const t = mandate.terms as { jurisdiction_whitelist?: string[]; sponsor_jurisdiction?: string } | undefined;
    return t?.sponsor_jurisdiction || t?.jurisdiction_whitelist?.[0] || null;
  })();

  const row = {
    receipt_id: receiptId,
    clinpay_session_id: null,
    invoice_id: null,
    visit_id: input.visit_id,
    study_id: input.study_id,
    amount_eur: input.amount_eur,
    amount_usdc: input.amount_usdc,
    settled_at: input.settlement.settled_at,
    settlement_tx_hash: input.settlement.tx_hash || input.settlement.sepa_tx_ref || `${input.settlement.rail}-${receiptId}`,
    settlement_provider: input.settlement.rail.startsWith('sepa') ? 'asterpay-sepa' : input.settlement.rail,
    mandate_hash: mandateHash,
    pact_version: PACT_VERSION,
    sponsor_agent_id: mandate.proposer_agent_id,
    sponsor_jurisdiction: sponsorJurisdiction,
    asterpay_jurisdiction: 'FI',
    rail: input.settlement.rail.startsWith('sepa') || input.settlement.rail === 'faster_payments' ? 'sepa' : 'wallet',
    tax_line: input.tax_line ?? null,
    mandate_id: input.mandate_id,
    panellist_id_hash: input.panellist_id_hash,
    campaign_id: input.campaign_id,
    fee_breakdown: input.fee_breakdown ?? null,
    source: input.source || 'asterpay',
  };

  const { error: insertErr } = await sb().from('DrsReceipt').insert(row);
  if (insertErr) {
    throw new DrsAnchorError(500, 'persist_failed', `DrsReceipt insert failed: ${insertErr.message}`);
  }

  // 3. Best-effort on-chain anchor (Base Sepolia in v0.1, mainnet in v0.2).
  //    Anchor failure does not fail the API response — receipt is persisted.
  let anchorTxHash: `0x${string}` | null = null;
  let anchorBlock: bigint | null = null;
  let anchorChain: string | null = null;
  try {
    const anchor = await anchorMandateState(mandateHash as `0x${string}`, 'drs_minted');
    anchorTxHash = anchor.txHash;
    anchorBlock = anchor.blockNumber;
    anchorChain = anchor.chain;

    // Persist anchor details to the row we just inserted
    await sb()
      .from('DrsReceipt')
      .update({
        anchor_chain: anchorChain,
        anchor_block_number: Number(anchorBlock),
        settlement_tx_hash: anchorTxHash, // overwrite with on-chain hash if anchored
      })
      .eq('receipt_id', receiptId);
  } catch (err) {
    console.error(`[drs-anchor] best-effort anchor failed for ${receiptId}:`, err);
  }

  const explorerUrl = anchorTxHash
    ? (anchorChain === 'base-sepolia'
        ? `https://sepolia.basescan.org/tx/${anchorTxHash}`
        : `https://basescan.org/tx/${anchorTxHash}`)
    : null;

  return {
    receipt_id: receiptId,
    mandate_hash: mandateHash,
    anchor_chain: anchorChain,
    anchor_tx_hash: anchorTxHash,
    anchor_block_number: anchorBlock ? Number(anchorBlock) : null,
    explorer_url: explorerUrl,
    pact_version: PACT_VERSION,
  };
}
