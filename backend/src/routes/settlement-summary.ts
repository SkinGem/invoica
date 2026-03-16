import { Router, Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

function getSb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error('Supabase env vars not set');
  return createClient(url, key);
}

/**
 * GET /v1/settlements/summary
 * Settlement totals grouped by chain, filtered by companyId.
 * Query params: companyId (optional)
 */
router.get('/v1/settlements/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.query.companyId as string | undefined;
    const sb = getSb();

    let query: any = sb
      .from('Invoice')
      .select('status, amount, paymentDetails')
      .in('status', ['SETTLED', 'COMPLETED']);

    if (companyId) query = query.eq('companyId', companyId);

    const { data, error } = await query;
    if (error) throw error;

    const invoices = data || [];
    const chainTotals: Record<string, { count: number; totalAmount: number }> = {};
    let grandTotal = 0;
    let grandCount = 0;

    for (const inv of invoices) {
      const pd = inv.paymentDetails
        ? (typeof inv.paymentDetails === 'string' ? JSON.parse(inv.paymentDetails) : inv.paymentDetails)
        : {};
      const chain = pd.network || 'unknown';
      const amt = parseFloat(inv.amount as string) || 0;

      if (!chainTotals[chain]) chainTotals[chain] = { count: 0, totalAmount: 0 };
      chainTotals[chain].count++;
      chainTotals[chain].totalAmount += amt;
      grandTotal += amt;
      grandCount++;
    }

    res.json({
      success: true,
      data: {
        totalSettlements: grandCount,
        totalVolume: grandTotal,
        byChain: Object.entries(chainTotals).map(([chain, stats]) => ({
          chain,
          count: stats.count,
          totalAmount: stats.totalAmount,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
