// settlement-fee.ts — debit the issuer's credit balance (or off-session charge)
// when an invoice transitions to SETTLED.
//
// Pricing: 1% of invoice value (USD), floor $0.01, cap $5. Computed once per
// invoice; the unique index uniq_credittxn_invoice_settlement_fee enforces
// idempotency at the DB layer so concurrent calls cannot double-bill.
//
// Charge cascade:
//   1. Compute fee in USD cents.
//   2. Try to debit the Credit balance (atomic, succeeds if balance >= fee).
//   3. On insufficient balance: try off-session charge against saved card.
//   4. On both failing: write 'outstanding' txn, log + return reason. Invoice
//      stays SETTLED — we never block the user's money on our fee.
//
// Called fire-and-forget from markAsSettled in services/invoice.ts so a slow
// Stripe call can't block settlement response.
import { createClient } from '@supabase/supabase-js';
import { calcSettlementFeeCents, chargeOffSession } from '../../lib/stripe';
import { toUsdCents } from '../../lib/fx';

function getSb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export interface SettlementFeeResult {
  charged: boolean;
  via?: 'balance' | 'off_session_charge';
  feeUsdCents: number;
  reason?: string;
}

export async function applySettlementFee(invoiceId: string): Promise<SettlementFeeResult> {
  const sb = getSb();

  const { data: invoice, error: invErr } = await sb
    .from('Invoice')
    .select('id, amount, currency, issuer_customer_id, status')
    .eq('id', invoiceId)
    .single();
  if (invErr || !invoice) {
    return { charged: false, feeUsdCents: 0, reason: `invoice ${invoiceId} not found` };
  }
  if (!invoice.issuer_customer_id) {
    // Pre-billing-MVP invoice — no issuer linked, can't bill anyone. Acceptable.
    return { charged: false, feeUsdCents: 0, reason: 'no issuer_customer_id (legacy invoice)' };
  }
  if (invoice.status !== 'SETTLED') {
    return { charged: false, feeUsdCents: 0, reason: `invoice not SETTLED (status=${invoice.status})` };
  }

  // Idempotency check at the application layer (DB unique index is the real guard).
  const { data: existingTxn } = await sb
    .from('CreditTxn')
    .select('id, type, amount_cents')
    .eq('ref_table', 'Invoice')
    .eq('ref_id', invoiceId)
    .in('type', ['debit', 'charge', 'outstanding'])
    .maybeSingle();
  if (existingTxn) {
    return { charged: existingTxn.type !== 'outstanding', feeUsdCents: Math.abs(existingTxn.amount_cents), reason: 'already processed' };
  }

  const amount = Number(invoice.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { charged: false, feeUsdCents: 0, reason: 'invoice amount invalid' };
  }

  let invoiceUsdCents: number;
  try {
    invoiceUsdCents = await toUsdCents(amount, invoice.currency);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return { charged: false, feeUsdCents: 0, reason: `FX failed: ${msg}` };
  }
  const feeUsdCents = calcSettlementFeeCents(invoiceUsdCents);
  if (feeUsdCents <= 0) {
    return { charged: false, feeUsdCents: 0, reason: 'fee computed to zero' };
  }

  // Try balance debit. CHECK constraint allows up to -$10k for race safety.
  const { data: credit } = await sb
    .from('Credit')
    .select('balance_cents')
    .eq('customer_id', invoice.issuer_customer_id)
    .single();
  const balance = credit?.balance_cents ?? 0;

  if (balance >= feeUsdCents) {
    const { error: updErr } = await sb
      .from('Credit')
      .update({ balance_cents: balance - feeUsdCents })
      .eq('customer_id', invoice.issuer_customer_id)
      .eq('balance_cents', balance);  // optimistic concurrency
    if (!updErr) {
      await sb.from('CreditTxn').insert({
        customer_id: invoice.issuer_customer_id,
        type: 'debit',
        amount_cents: -feeUsdCents,
        ref_table: 'Invoice',
        ref_id: invoiceId,
        metadata: { invoice_amount: amount, invoice_currency: invoice.currency, invoice_usd_cents: invoiceUsdCents },
      });
      console.info(`[settlement-fee] balance-debit customer=${invoice.issuer_customer_id} invoice=${invoiceId} -${feeUsdCents}c`);
      return { charged: true, via: 'balance', feeUsdCents };
    }
    // Optimistic update failed — race with topup or another debit. Fall through to off-session charge.
  }

  // Insufficient balance OR balance-debit race — off-session charge against saved card.
  const charge = await chargeOffSession({
    customerId: invoice.issuer_customer_id,
    amountCents: feeUsdCents,
    description: `Invoica settlement fee — invoice ${invoiceId}`,
    invoiceRefId: invoiceId,
  });

  if (charge.ok) {
    await sb.from('CreditTxn').insert({
      customer_id: invoice.issuer_customer_id,
      type: 'charge',
      amount_cents: -feeUsdCents,
      ref_table: 'Invoice',
      ref_id: invoiceId,
      stripe_payment_intent_id: charge.paymentIntentId,
      metadata: { invoice_amount: amount, invoice_currency: invoice.currency, invoice_usd_cents: invoiceUsdCents },
    });
    console.info(`[settlement-fee] off-session-charge customer=${invoice.issuer_customer_id} invoice=${invoiceId} -${feeUsdCents}c pi=${charge.paymentIntentId}`);
    return { charged: true, via: 'off_session_charge', feeUsdCents };
  }

  // Both paths failed — record outstanding for ops follow-up. Invoice stays SETTLED.
  await sb.from('CreditTxn').insert({
    customer_id: invoice.issuer_customer_id,
    type: 'outstanding',
    amount_cents: -feeUsdCents,
    ref_table: 'Invoice',
    ref_id: invoiceId,
    metadata: {
      invoice_amount: amount,
      invoice_currency: invoice.currency,
      invoice_usd_cents: invoiceUsdCents,
      reason: charge.errorCode || 'unknown',
      message: charge.errorMessage,
    },
  });
  console.warn(`[settlement-fee] outstanding customer=${invoice.issuer_customer_id} invoice=${invoiceId} -${feeUsdCents}c reason=${charge.errorCode}`);
  return { charged: false, feeUsdCents, reason: charge.errorMessage || charge.errorCode || 'charge failed' };
}
