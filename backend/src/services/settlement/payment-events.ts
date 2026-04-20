/**
 * PaymentEvents — anti-duplicate-settlement gate (M1-MONEY-02, plan §2.2).
 *
 * Every settlement path must call recordPaymentEvent() BEFORE mutating the
 * Invoice row. UNIQUE(chain, txHash) in the DB enforces that the same on-chain
 * transaction cannot settle two invoices, regardless of which detector saw it.
 */
import { supabase } from '../../lib/supabase';

export type PaymentEventSource = 'evm-detector' | 'solana-detector' | 'sap-escrow' | 'manual';

export interface PaymentEventInput {
  invoiceId: string;
  chain: string;
  txHash: string;
  amountUsdc: number;
  source: PaymentEventSource;
  raw?: unknown;
}

export class DuplicatePaymentError extends Error {
  code = 'DUPLICATE_TX' as const;
  constructor(public readonly chain: string, public readonly txHash: string) {
    super(`Duplicate payment event for ${chain}:${txHash}`);
  }
}

/**
 * Record a payment event. Throws DuplicatePaymentError on UNIQUE(chain, txHash)
 * collision — callers must abort the settlement when this happens.
 */
export async function recordPaymentEvent(input: PaymentEventInput): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('PaymentEvents')
    .insert({
      invoiceId: input.invoiceId,
      chain: input.chain,
      txHash: input.txHash,
      amountUsdc: input.amountUsdc,
      source: input.source,
      raw: input.raw ?? null,
    })
    .select('id')
    .single();

  if (error) {
    const msg = String(error.message || '').toLowerCase();
    const code = String((error as { code?: string }).code || '');
    if (code === '23505' || msg.includes('duplicate key') || msg.includes('payment_events_chain_txhash_key') || msg.includes('paymentevents_chain_txhash_key')) {
      throw new DuplicatePaymentError(input.chain, input.txHash);
    }
    throw error;
  }

  return { id: data.id as string };
}
