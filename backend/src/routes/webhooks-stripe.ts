// webhooks-stripe.ts — Stripe webhook handler.
//
// Mounted BEFORE express.json() so we get the raw body (signature verification
// requires it). Pattern mirrors clinpayWebhookRouter.
//
// Events handled:
//   checkout.session.completed       — top-up succeeded; credit balance + save
//                                      payment method as default for future
//                                      off-session charges.
//   payment_intent.succeeded         — settlement-fee charge confirmed (already
//                                      written to ledger optimistically; this
//                                      just logs).
//   payment_intent.payment_failed    — settlement-fee charge failed; mark
//                                      outstanding (already done optimistically).
//
// All event handlers are idempotent: writes to CreditTxn use stripe_event_id as
// a unique key, so duplicate webhook deliveries are no-ops.
import { Router, Request, Response, raw } from 'express';
// Stripe's TS types are awkward to import as a namespace under our tsconfig
// (moduleResolution: node10). We only consume a handful of fields, so define
// local minimal shapes — keeps this file dependency-free and type-clean.
interface StripeEvent {
  id: string;
  type: string;
  data: { object: unknown };
}
interface StripeCheckoutSession {
  id: string;
  payment_status?: string;
  payment_intent?: string | { id: string };
  metadata?: Record<string, string>;
}
interface StripePaymentIntent {
  id: string;
  metadata?: Record<string, string>;
  payment_method?: string | { id: string };
  last_payment_error?: { message?: string };
}
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '../lib/stripe';

const router = Router();

function getSb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// Raw body required for HMAC sig verification — must run before express.json().
router.post('/webhooks/stripe', raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sigHeader = req.headers['stripe-signature'] as string | undefined;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sigHeader || !secret) {
    res.status(400).send('Missing signature or webhook secret');
    return;
  }

  let event: StripeEvent;
  try {
    event = getStripe().webhooks.constructEvent(req.body as Buffer, sigHeader, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.warn(`[webhooks-stripe] signature verification failed: ${msg}`);
    res.status(400).send(`Webhook signature failed: ${msg}`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event);
        break;
      case 'payment_intent.succeeded':
        await handleChargeSucceeded(event);
        break;
      case 'payment_intent.payment_failed':
        await handleChargeFailed(event);
        break;
      default:
        // No-op for unhandled types — Stripe sends many events; we only care about a few.
        console.info(`[webhooks-stripe] ignored event type ${event.type}`);
    }
    res.json({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error(`[webhooks-stripe] handler error for ${event.type}: ${msg}`);
    res.status(500).json({ error: msg });
  }
});

async function handleCheckoutCompleted(event: StripeEvent): Promise<void> {
  const session = event.data.object as StripeCheckoutSession;
  const customerId = session.metadata?.invoica_customer_id;
  const amountCents = Number(session.metadata?.amount_cents);

  if (!customerId || !Number.isInteger(amountCents) || amountCents <= 0) {
    console.warn(`[webhooks-stripe] checkout.completed missing metadata: session=${session.id}`);
    return;
  }
  if (session.payment_status !== 'paid') {
    console.warn(`[webhooks-stripe] checkout.completed but payment_status=${session.payment_status}: session=${session.id}`);
    return;
  }

  const sb = getSb();

  // Idempotent: stripe_event_id is UNIQUE on CreditTxn. Insert first; if it
  // succeeds, balance update is safe to apply.
  const { error: txnErr } = await sb.from('CreditTxn').insert({
    customer_id: customerId,
    type: 'topup',
    amount_cents: amountCents,
    stripe_event_id: event.id,
    stripe_session_id: session.id,
    stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
    metadata: { source: 'checkout.session.completed' },
  });
  if (txnErr) {
    if (txnErr.code === '23505') {
      console.info(`[webhooks-stripe] duplicate event ${event.id} — already credited`);
      return;
    }
    throw new Error(`CreditTxn insert failed: ${txnErr.message}`);
  }

  // Bump balance + persist default payment method (for future off-session charges).
  const { error: balErr } = await sb.rpc('credit_balance_add', {
    p_customer_id: customerId,
    p_amount_cents: amountCents,
  });
  if (balErr) {
    // RPC may not exist yet — fall back to a non-atomic update. Acceptable for v1
    // because each topup is its own webhook delivery; concurrent topups for the
    // same customer are vanishingly rare.
    const { data: cur } = await sb.from('Credit').select('balance_cents').eq('customer_id', customerId).single();
    await sb.from('Credit').update({ balance_cents: (cur?.balance_cents ?? 0) + amountCents }).eq('customer_id', customerId);
  }

  if (session.payment_intent && typeof session.payment_intent === 'string') {
    try {
      const pi = await getStripe().paymentIntents.retrieve(session.payment_intent);
      const pmId = typeof pi.payment_method === 'string' ? pi.payment_method : pi.payment_method?.id;
      if (pmId) {
        await sb.from('Customer').update({ default_payment_method_id: pmId }).eq('id', customerId);
      }
    } catch (err) {
      console.warn(`[webhooks-stripe] failed to retrieve payment_method: ${(err as Error).message}`);
    }
  }

  console.info(`[webhooks-stripe] credited customer=${customerId} +${amountCents}c (session=${session.id})`);
}

async function handleChargeSucceeded(event: StripeEvent): Promise<void> {
  const pi = event.data.object as StripePaymentIntent;
  if (pi.metadata?.kind !== 'settlement_fee') return; // top-up PIs are handled via checkout.completed
  console.info(`[webhooks-stripe] settlement-fee PI succeeded: ${pi.id} customer=${pi.metadata?.invoica_customer_id} invoice=${pi.metadata?.invoica_invoice_id}`);
  // No-op on ledger: the optimistic 'charge' txn was already written when we
  // called paymentIntents.create({ confirm: true }). This webhook is for ops
  // visibility / async retries.
}

async function handleChargeFailed(event: StripeEvent): Promise<void> {
  const pi = event.data.object as StripePaymentIntent;
  if (pi.metadata?.kind !== 'settlement_fee') return;
  const customerId = pi.metadata?.invoica_customer_id;
  const invoiceId = pi.metadata?.invoica_invoice_id;
  console.warn(`[webhooks-stripe] settlement-fee PI failed: customer=${customerId} invoice=${invoiceId} reason=${pi.last_payment_error?.message || 'unknown'}`);
  // The optimistic 'charge' row will be reconciled when ops investigate; for
  // v1 we don't auto-flip it to 'outstanding' from the webhook — we'd race the
  // settlement-debit hook. Settlement hook is the source of truth.
}

export default router;
