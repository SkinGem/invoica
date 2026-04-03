/**
 * pact-session.ts — PACT Chamber 2/4 session management
 * POST /v1/pact/session/start  — Chamber 2 entry, issue JWT, default PROVISIONAL
 * GET  /v1/pact/session/:id    — Read session state
 */
import { Router, Request, Response } from 'express';
import { fetchHelixaCred } from '../lib/helixa';
import { issueSessionJwt } from '../lib/pact-session-jwt';
import * as crypto from 'crypto';

const router = Router();

export interface PactSession {
  sessionId: string;
  grantor: string;
  ceiling: string;
  maxUsdc: number;
  score: number | null;
  status: 'provisional' | 'resolved' | 'complete';
  createdAt: string;
  updatedAt: string;
}
export const sessions = new Map<string, PactSession>();

export function resolveCeiling(score: number | null, verified: boolean): { ceiling: string; maxUsdc: number } {
  if (score === null || score === 0) return { ceiling: 'PROVISIONAL', maxUsdc: 50 };
  if (!verified) return { ceiling: 'PROVISIONAL', maxUsdc: 50 };
  if (score < 30) return { ceiling: 'REJECTED', maxUsdc: 0 };
  if (score < 50) return { ceiling: 'RESTRICTED', maxUsdc: 100 };
  if (score < 60) return { ceiling: 'RESTRICTED', maxUsdc: 1000 };
  if (score < 70) return { ceiling: 'STANDARD', maxUsdc: 10000 };
  if (score < 85) return { ceiling: 'STANDARD', maxUsdc: 10000 };
  return { ceiling: 'FULL', maxUsdc: 1_000_000 };
}

router.post('/session/start', async (req: Request, res: Response) => {
  const { grantor } = req.body as { grantor?: string };
  if (!grantor) {
    res.status(400).json({ success: false, error: { message: 'grantor required', code: 'MISSING_GRANTOR' } });
    return;
  }
  const sessionId = crypto.randomUUID();
  const jwt = issueSessionJwt(sessionId);
  const now = new Date().toISOString();
  const session: PactSession = {
    sessionId, grantor, ceiling: 'PROVISIONAL', maxUsdc: 50,
    score: null, status: 'provisional', createdAt: now, updatedAt: now,
  };
  sessions.set(sessionId, session);
  fetchHelixaCred(grantor).then((cred) => {
    const s = sessions.get(sessionId);
    if (!s || s.status === 'complete') return;
    const { ceiling, maxUsdc } = resolveCeiling(cred?.score ?? null, cred?.verification_status === 'verified');
    s.ceiling = ceiling; s.maxUsdc = maxUsdc; s.score = cred?.score ?? null;
    s.status = 'resolved'; s.updatedAt = new Date().toISOString();
    console.info(`[pact-session] ${sessionId} ceiling resolved: ${ceiling} (score=${s.score})`);
  }).catch((err) => console.error('[pact-session] helixa async error:', (err as Error).message));
  console.info(`[pact-session] ${sessionId} started grantor=${grantor} ceiling=PROVISIONAL`);
  res.json({ success: true, sessionId, ceiling: 'PROVISIONAL', maxUsdc: 50, jwt });
});

router.get('/session/:id', (req: Request, res: Response) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ success: false, error: { message: 'Session not found', code: 'NOT_FOUND' } });
    return;
  }
  res.json({ success: true, session });
});

export default router;