// billing-pay-as-you-go.ts — top-up + balance endpoints for the M2 billing surface.
//
// Dual-auth: accepts EITHER a Supabase JWT (dashboard) OR an x-api-key
// (programmatic clients). Mirrors the existing /v1/billing/status pattern.
//
// The customer identity is the Supabase user.id (when JWT) or ApiKey.customerId
// (when x-api-key). For the dashboard path, we look up the user's email via
// Supabase auth and lazy-create the Customer row keyed on user.id.
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { createTopupCheckoutSession, getOrCreateStripeCustomer } from '../lib/stripe';
import { findApiKeyByKey } from '../services/api-keys';

const router = Router();

function getSb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function dashboardUrl(): string {
  return process.env.DASHBOARD_BASE_URL || 'https://app.invoica.ai';
}

interface AuthedCustomer { id: string; email: string }

/**
 * Resolve the customer identity from either a Supabase JWT (dashboard) or an
 * x-api-key header (programmatic). Returns null when neither is present/valid.
 */
async function resolveCustomer(req: Request): Promise<AuthedCustomer | null> {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7);
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!anonKey) return null;
    const sb = createClient(process.env.SUPABASE_URL!, anonKey);
    const { data } = await sb.auth.getUser(token);
    if (data.user?.id) {
      return { id: data.user.id, email: data.user.email || `${data.user.id}@dashboard.invoica.ai` };
    }
  }
  const apiKey = (req.headers['x-api-key'] as string | undefined)?.trim();
  if (apiKey) {
    const record = await findApiKeyByKey(apiKey);
    if (record?.isActive) {
      return { id: record.customerId, email: record.customerEmail };
    }
  }
  return null;
}

router.post('/v1/billing/topup', async (req: Request, res: Response): Promise<void> => {
  const customer = await resolveCustomer(req);
  if (!customer) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const body = (req.body || {}) as { amount_cents?: unknown };
  const amount = typeof body.amount_cents === 'number' ? body.amount_cents : Number(body.amount_cents);
  if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
    res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'amount_cents must be an integer' } });
    return;
  }
  if (amount < 1000) {
    res.status(400).json({ success: false, error: { code: 'AMOUNT_TOO_LOW', message: 'Minimum top-up is $10 (1000 cents)' } });
    return;
  }
  if (amount > 100000) {
    res.status(400).json({ success: false, error: { code: 'AMOUNT_TOO_HIGH', message: 'Maximum single top-up is $1,000 (100000 cents). Contact sales for larger top-ups.' } });
    return;
  }

  try {
    const session = await createTopupCheckoutSession({
      customerId: customer.id,
      email: customer.email,
      amountCents: amount,
      successUrl: `${dashboardUrl()}/billing?topup=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl:  `${dashboardUrl()}/billing?topup=cancelled`,
    });
    res.json({ success: true, data: { url: session.url, session_id: session.sessionId } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[billing-pyg] topup failed for ${customer.id}: ${msg}`);
    res.status(502).json({ success: false, error: { code: 'STRIPE_ERROR', message: msg } });
  }
});

router.get('/v1/billing/balance', async (req: Request, res: Response): Promise<void> => {
  const customer = await resolveCustomer(req);
  if (!customer) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  try {
    await getOrCreateStripeCustomer(customer.id, customer.email);
    const sb = getSb();
    const { data: credit } = await sb
      .from('Credit')
      .select('balance_cents, currency, updated_at')
      .eq('customer_id', customer.id)
      .single();
    const { data: txns } = await sb
      .from('CreditTxn')
      .select('id, type, amount_cents, ref_table, ref_id, created_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(20);

    res.json({
      success: true,
      data: {
        balance_cents: credit?.balance_cents ?? 0,
        currency: credit?.currency ?? 'usd',
        updated_at: credit?.updated_at ?? null,
        recent_transactions: txns || [],
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[billing-pyg] balance failed for ${customer.id}: ${msg}`);
    res.status(500).json({ success: false, error: { code: 'BALANCE_LOOKUP_FAILED', message: msg } });
  }
});

export default router;
