// stripe.ts — Stripe SDK helpers for pay-as-you-go billing.
//
// Pricing model: 1% of invoice value (USD), floor $0.01, cap $5, charged on
// settlement. Customers pre-load credits via Checkout (option 1: balance);
// when balance is short, off-session card charge against saved payment method.
import Stripe = require('stripe');
import { createClient } from '@supabase/supabase-js';

type StripeClient = Stripe.Stripe;

let _stripe: StripeClient | null = null;

export function getStripe(): StripeClient {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  _stripe = new Stripe(key, { apiVersion: '2026-04-22.dahlia' });
  return _stripe;
}

function getSb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export interface CustomerRow {
  id: string;
  email: string;
  stripe_customer_id: string | null;
  default_payment_method_id: string | null;
}

export async function getOrCreateStripeCustomer(customerId: string, email: string): Promise<CustomerRow> {
  const sb = getSb();
  const { data: existing } = await sb.from('Customer').select('*').eq('id', customerId).single();

  // Customer row should exist (backfill or auto-created on signup). Insert if missing.
  if (!existing) {
    const { data: created, error } = await sb
      .from('Customer')
      .insert({ id: customerId, email })
      .select()
      .single();
    if (error) throw new Error(`Customer insert failed: ${error.message}`);
    await sb.from('Credit').insert({ customer_id: customerId, balance_cents: 0 }).then();
    return await syncStripeCustomer(created as CustomerRow);
  }
  if (existing.stripe_customer_id) return existing as CustomerRow;
  return await syncStripeCustomer(existing as CustomerRow);
}

async function syncStripeCustomer(row: CustomerRow): Promise<CustomerRow> {
  const stripe = getStripe();
  const customer = await stripe.customers.create(
    { email: row.email, metadata: { invoica_customer_id: row.id } },
    { idempotencyKey: `customer-create-${row.id}` },
  );
  const sb = getSb();
  const { data, error } = await sb
    .from('Customer')
    .update({ stripe_customer_id: customer.id })
    .eq('id', row.id)
    .select()
    .single();
  if (error) throw new Error(`Customer update failed: ${error.message}`);
  return data as CustomerRow;
}

export interface TopupOptions {
  customerId: string;
  email: string;
  amountCents: number;       // 1000 = $10
  successUrl: string;
  cancelUrl: string;
}

export async function createTopupCheckoutSession(opts: TopupOptions): Promise<{ url: string; sessionId: string }> {
  if (opts.amountCents < 1000) throw new Error('Minimum top-up is $10');
  if (opts.amountCents > 100000) throw new Error('Maximum single top-up is $1,000');

  const customer = await getOrCreateStripeCustomer(opts.customerId, opts.email);
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customer.stripe_customer_id!,
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `Invoica credits — $${(opts.amountCents / 100).toFixed(2)}` },
        unit_amount: opts.amountCents,
      },
      quantity: 1,
    }],
    payment_intent_data: {
      // Save card so we can off-session charge later when balance is short.
      setup_future_usage: 'off_session',
      metadata: { invoica_customer_id: opts.customerId, kind: 'topup' },
    },
    metadata: { invoica_customer_id: opts.customerId, amount_cents: String(opts.amountCents) },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  }, {
    idempotencyKey: `topup-${opts.customerId}-${opts.amountCents}-${Date.now()}`,
  });

  return { url: session.url!, sessionId: session.id };
}

export interface OffSessionChargeOptions {
  customerId: string;
  amountCents: number;
  description: string;
  invoiceRefId: string;        // for idempotency + audit trail
}

export async function chargeOffSession(opts: OffSessionChargeOptions): Promise<{
  ok: boolean;
  paymentIntentId?: string;
  errorCode?: string;
  errorMessage?: string;
}> {
  const sb = getSb();
  const { data: customer } = await sb
    .from('Customer')
    .select('stripe_customer_id, default_payment_method_id')
    .eq('id', opts.customerId)
    .single();

  if (!customer?.stripe_customer_id || !customer?.default_payment_method_id) {
    return { ok: false, errorCode: 'NO_PAYMENT_METHOD', errorMessage: 'Customer has no saved card. Top-up required.' };
  }

  const stripe = getStripe();
  try {
    const pi = await stripe.paymentIntents.create({
      amount: opts.amountCents,
      currency: 'usd',
      customer: customer.stripe_customer_id,
      payment_method: customer.default_payment_method_id,
      off_session: true,
      confirm: true,
      description: opts.description,
      metadata: {
        invoica_customer_id: opts.customerId,
        invoica_invoice_id: opts.invoiceRefId,
        kind: 'settlement_fee',
      },
    }, {
      // Idempotency: same invoice cannot be charged twice. Stripe will return the
      // original PI on retry, so we get exactly-once semantics.
      idempotencyKey: `settlement-fee-${opts.invoiceRefId}`,
    });
    return { ok: true, paymentIntentId: pi.id };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    return {
      ok: false,
      errorCode: e.code || 'CHARGE_FAILED',
      errorMessage: e.message || 'Off-session charge failed',
    };
  }
}

/**
 * Settlement fee = clamp(0.01 * invoiceValueCents, 1, 500) cents.
 * 1% of invoice, floor $0.01, cap $5.
 */
export function calcSettlementFeeCents(invoiceValueCents: number): number {
  if (invoiceValueCents <= 0) return 0;
  const onePct = Math.round(invoiceValueCents * 0.01);
  return Math.max(1, Math.min(500, onePct));
}
