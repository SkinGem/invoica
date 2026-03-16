import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { computeAndStoreReputation } from '../services/reputation';

const router = Router();

/**
 * Create Supabase client helper (uses service role for leaderboard reads)
 */
const getSb = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error('Supabase env vars not set');
  return createClient(url, key);
};

/**
 * GET /x402/oracle/score/:agentId
 * Public endpoint to get reputation score for a specific agent
 */
router.get('/x402/oracle/score/:agentId', async (req, res): Promise<void> => {
  try {
    const { agentId } = req.params;
    
    if (!agentId) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Agent ID is required',
          code: 'MISSING_AGENT_ID'
        }
      });
      return;
    }

    const result = await computeAndStoreReputation(agentId);

    // Check if agent has no invoice history
    if (result.invoicesCompleted === 0 && result.invoicesDisputed === 0) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Agent not found or no invoice history',
          code: 'NOT_FOUND'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: {
        agentId: result.agentId,
        score: result.score,
        tier: result.tier,
        invoicesCompleted: result.invoicesCompleted,
        invoicesDisputed: result.invoicesDisputed,
        totalValueSettled: result.totalValueSettled,
        lastUpdated: result.lastUpdated,
        verifiedAt: new Date().toISOString(),
      }
    });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'DB_ERROR'
      }
    });
  }
});

/**
 * GET /x402/oracle/scores
 * Public leaderboard endpoint - top 50 agents by score
 */
router.get('/x402/oracle/scores', async (req, res): Promise<void> => {
  try {
    const { data, error } = await getSb()
      .from('AgentReputation')
      .select('agentId, score, tier, invoicesCompleted, totalValueSettled, lastUpdated')
      .order('score', { ascending: false })
      .limit(50);

    if (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          code: 'DB_ERROR'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: data || []
    });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'DB_ERROR'
      }
    });
  }
});

/**
 * POST /v1/reputation/batch
 * Batch reputation lookup for multiple agents. Body: { agentIds: string[] } (max 50).
 * Returns array of { agentId, score, tier } for each found agent. Missing agents are omitted.
 */
router.post('/v1/reputation/batch', async (req, res): Promise<void> => {
  try {
    const { agentIds } = req.body;

    if (!Array.isArray(agentIds)) {
      res.status(400).json({
        success: false,
        error: { message: 'agentIds must be an array', code: 'INVALID_INPUT' },
      });
      return;
    }

    if (agentIds.length > 50) {
      res.status(400).json({
        success: false,
        error: { message: 'agentIds may not exceed 50 items', code: 'LIMIT_EXCEEDED' },
      });
      return;
    }

    if (agentIds.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    const { data, error } = await getSb()
      .from('AgentReputation')
      .select('agentId, score, tier')
      .in('agentId', agentIds);

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'DB_ERROR' },
    });
  }
});

/**
 * GET /v1/reputation/distribution
 * Histogram of agent reputation scores in buckets: 0_20, 21_40, 41_60, 61_80, 81_100.
 * Each bucket has count. Must be before /:agentId to avoid param capture.
 */
router.get('/v1/reputation/distribution', async (_req, res): Promise<void> => {
  try {
    const { data, error } = await getSb()
      .from('AgentReputation')
      .select('score');

    if (error) throw error;

    const buckets: Record<string, number> = { '0_20': 0, '21_40': 0, '41_60': 0, '61_80': 0, '81_100': 0 };

    for (const row of (data || [])) {
      const score = Number(row.score) || 0;
      if (score <= 20)       buckets['0_20']++;
      else if (score <= 40)  buckets['21_40']++;
      else if (score <= 60)  buckets['41_60']++;
      else if (score <= 80)  buckets['61_80']++;
      else                   buckets['81_100']++;
    }

    res.json({ success: true, data: { total: (data || []).length, buckets } });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: { message: error.message, code: 'DB_ERROR' } });
  }
});

/**
 * GET /v1/reputation/:agentId/stats
 * Full reputation record for a specific agent.
 */
router.get('/v1/reputation/:agentId/stats', async (req, res): Promise<void> => {
  try {
    const { agentId } = req.params;
    const { data, error } = await getSb()
      .from('AgentReputation')
      .select('agentId, score, tier, invoicesCompleted, invoicesDisputed, totalValueSettled, lastUpdated')
      .eq('agentId', agentId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      res.status(404).json({ success: false, error: { message: 'Agent reputation not found', code: 'NOT_FOUND' } });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: { message: error.message, code: 'DB_ERROR' } });
  }
});

export default router;