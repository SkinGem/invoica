import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/v1/reputation/:agentId/history', async (req, res): Promise<void> => {
  const { agentId } = req.params;

  if (!agentId) {
    res.status(400).json({ success: false, error: { message: 'agentId required', code: 'BAD_REQUEST' } });
    return;
  }

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const record = await prisma.agentReputation.findFirst({
      where: { agentId, updatedAt: { gte: thirtyDaysAgo } },
      select: { score: true, tier: true, updatedAt: true },
    });

    const history = record
      ? [{ score: record.score, tier: record.tier, timestamp: record.updatedAt.toISOString() }]
      : [];

    res.json({ agentId, history });
  } catch {
    res.status(500).json({ success: false, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }
});

export default router;
