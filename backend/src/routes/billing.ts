// billing.ts — Billing + subscription API (Conway Edition — free beta until Apr 22, 2026)
// GET  /v1/billing/status           — current subscription status
// POST /v1/billing/create-checkout  — placeholder until Conway activates
// POST /v1/billing/create-portal    — placeholder until Conway activates
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Conway Edition: billing starts Day 61 (April 22, 2026)
const CONWAY_ACTIVATION_DATE = '2026-04-22T00:00:00Z';

function getSb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function isBetaActive(): boolean {
  return Date.now() < new Date(CONWAY_ACTIVATION_DATE).getTime();
}

router.get('/v1/billing/status', async (_req: Request, res: Response) => {
  const sb = getSb();

  // Count invoices this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: invoiceCount } = await sb
    .from('Invoice')
    .select('*', { count: 'exact', head: true })
    .gte('createdAt', startOfMonth.toISOString());

  res.json({
    success: true,
    data: {
      subscription_plan: 'free',
      subscription_status: isBetaActive() ? 'trialing' : 'active',
      stripe_customer_id: null,
      stripe_subscription_id: null,
      subscription_period_end: isBetaActive() ? CONWAY_ACTIVATION_DATE : null,
      invoice_count_this_month: invoiceCount || 0,
      api_call_count_this_month: 0,
    },
  });
});

router.post('/v1/billing/create-checkout', (_req: Request, res: Response) => {
  if (isBetaActive()) {
    res.json({
      success: true,
      data: {
        url: 'https://invoica.ai/#beta',
        sessionId: 'beta-free-access',
        message: `Free beta active until ${CONWAY_ACTIVATION_DATE.slice(0, 10)}. No checkout required.`,
      },
    });
    return;
  }
  res.status(501).json({
    success: false,
    error: { message: 'Stripe checkout not yet configured for Conway Edition', code: 'NOT_IMPLEMENTED' },
  });
});

router.post('/v1/billing/create-portal', (_req: Request, res: Response) => {
  if (isBetaActive()) {
    res.json({
      success: true,
      data: {
        url: 'https://app.invoica.ai/settings',
        message: 'Free beta active. Manage your profile in settings.',
      },
    });
    return;
  }
  res.status(501).json({
    success: false,
    error: { message: 'Stripe portal not yet configured for Conway Edition', code: 'NOT_IMPLEMENTED' },
  });
});

export default router;
