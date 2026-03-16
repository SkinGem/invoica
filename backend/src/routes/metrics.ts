import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

function getSb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error('Supabase env vars not set');
  return createClient(url, key);
}

/**
 * GET /v1/metrics
 * Agent economy insights: invoice totals, settlements, reputation summary.
 */
router.get('/v1/metrics', async (_req: Request, res: Response): Promise<void> => {
  try {
    const sb = getSb();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [invoiceRes, settlementRes, reputationRes] = await Promise.all([
      sb.from('Invoice').select('status'),
      sb.from('Invoice').select('id').in('status', ['SETTLED', 'COMPLETED']).gte('settledAt', sevenDaysAgo),
      sb.from('AgentReputation').select('agentId, score'),
    ]);

    if (invoiceRes.error) throw invoiceRes.error;
    if (settlementRes.error) throw settlementRes.error;
    if (reputationRes.error) throw reputationRes.error;

    const invoices = invoiceRes.data || [];
    const byStatus: Record<string, number> = { PENDING: 0, PROCESSING: 0, SETTLED: 0, COMPLETED: 0 };
    for (const inv of invoices) {
      if (inv.status in byStatus) byStatus[inv.status]++;
    }

    const agents = reputationRes.data || [];
    const avgScore = agents.length
      ? agents.reduce((sum: number, a: { score: number }) => sum + (a.score || 0), 0) / agents.length
      : 0;

    res.json({
      invoices: {
        total: invoices.length,
        byStatus,
      },
      settlements: {
        total: byStatus.SETTLED + byStatus.COMPLETED,
        last7Days: (settlementRes.data || []).length,
      },
      reputation: {
        agents: agents.length,
        avgScore: Math.round(avgScore * 100) / 100,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }
});

export default router;
