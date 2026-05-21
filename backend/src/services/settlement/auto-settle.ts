// Auto-settlement: given an observed on-chain USDC transfer to the seller
// wallet, find the matching PENDING Invoice and flip it to SETTLED.
//
// Used by the settlement watcher (services/settlement/watcher.ts). The
// flow mirrors what /v1/invoices/:id/status PATCH does, minus the
// PACT mandate gate (we're the system, not a client).
//
// Match strategy:
//   1. Chain matches (e.g. 'skale')
//   2. status === 'PENDING'
//   3. amount within 1% tolerance of the on-chain amount
//   4. If paymentDetails.paymentAddress is set on the invoice, it must
//      equal the on-chain recipient (case-insensitive)
//   5. Among multiple candidates, pick the oldest (FIFO)

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { recordPaymentEvent, DuplicatePaymentError } from './payment-events';
import type { SettlementMatch } from './evm-detector';

let cached: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error('Supabase env vars not set');
  cached = createClient(url, key);
  return cached;
}

export interface AutoSettleResult {
  matched: boolean;
  invoiceId?: string;
  invoiceNumber?: number;
  duplicate?: boolean;
  reason?: string;
}

const AMOUNT_TOLERANCE_PCT = 0.01; // 1% tolerance — covers fee-on-transfer + rounding

export async function autoSettleFromTransfer(transfer: SettlementMatch): Promise<AutoSettleResult> {
  // 1. Find candidate PENDING invoices on the same chain
  const { data: candidates, error } = await sb()
    .from('Invoice')
    .select('id, invoiceNumber, amount, currency, paymentDetails, createdAt')
    .eq('status', 'PENDING')
    .filter('paymentDetails->>chain', 'eq', transfer.chain)
    .order('createdAt', { ascending: true });

  if (error) return { matched: false, reason: `Supabase query failed: ${error.message}` };
  if (!candidates || candidates.length === 0) return { matched: false, reason: 'no PENDING invoices on this chain' };

  const tolerance = Math.max(transfer.amount * AMOUNT_TOLERANCE_PCT, 0.01);
  // EVM hex addresses are case-insensitive; Solana base58 addresses are case-sensitive.
  // Detect by 0x prefix.
  const isEvm = transfer.to.startsWith('0x');
  const norm = (s: string) => (isEvm ? s.toLowerCase() : s);
  const recipientNorm = norm(transfer.to);

  // 2. Filter by amount + (optional) recipient address
  const matches = candidates.filter((inv: any) => {
    if (Math.abs(Number(inv.amount) - transfer.amount) > tolerance) return false;
    const pd = typeof inv.paymentDetails === 'string' ? JSON.parse(inv.paymentDetails) : inv.paymentDetails;
    if (pd?.paymentAddress) {
      return norm(String(pd.paymentAddress)) === recipientNorm;
    }
    return true;
  });

  if (matches.length === 0) {
    return { matched: false, reason: `no invoice matched amount ${transfer.amount} ${transfer.chain} → ${transfer.to}` };
  }

  const winner: any = matches[0]; // FIFO — oldest PENDING wins

  // 3. Record the on-chain payment event (idempotent via UNIQUE(chain, txHash))
  try {
    await recordPaymentEvent({
      invoiceId: winner.id,
      chain: transfer.chain,
      txHash: transfer.txHash,
      amountUsdc: transfer.amount,
      source: 'evm-detector',
      raw: transfer as unknown as Record<string, unknown>,
    });
  } catch (err: unknown) {
    if (err instanceof DuplicatePaymentError) {
      return {
        matched: false,
        duplicate: true,
        reason: `tx ${transfer.chain}:${transfer.txHash} already recorded`,
      };
    }
    throw err;
  }

  // 4. Flip Invoice status PENDING → SETTLED + persist tx hash in paymentDetails
  const now = new Date().toISOString();
  const pdMerged = (() => {
    const pd = typeof winner.paymentDetails === 'string' ? JSON.parse(winner.paymentDetails) : (winner.paymentDetails || {});
    return { ...pd, txHash: transfer.txHash, settlementBlockNumber: transfer.blockNumber, settlementSource: 'evm-detector' };
  })();

  const { error: updateErr } = await sb()
    .from('Invoice')
    .update({
      status: 'SETTLED',
      settledAt: now,
      updatedAt: now,
      paymentDetails: pdMerged,
    })
    .eq('id', winner.id);

  if (updateErr) return { matched: false, reason: `update failed: ${updateErr.message}` };

  // 5. Fire billing hook (fire-and-forget — same pattern as PATCH route)
  try {
    const { triggerSettlementFee } = await import('../billing/settlement-fee');
    triggerSettlementFee(winner.id);
  } catch (err) {
    console.error('[auto-settle] billing hook failed:', err);
  }

  return {
    matched: true,
    invoiceId: winner.id,
    invoiceNumber: winner.invoiceNumber,
  };
}
