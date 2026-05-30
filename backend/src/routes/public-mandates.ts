// GET /v1/public/mandates/:id — unauthenticated redacted view of a mandate.
// Returns: state, mandate_hash, anchor_tx_hash, created_at, parties (name+role only).
// NO signatures, NO signing_secret, NO internal IDs beyond mandate id.
// Mounted in app.ts BEFORE authenticate middleware.

import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not set');
  return createClient(url, key);
}

router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: { code: 'invalid_id', message: 'mandate id is required' } });
  }

  const { data, error } = await sb()
    .from('mandates')
    .select('id, state, pact_mandate_hash, anchor_tx_hash, created_at, proposer_agent_id, counterparty_agent_id')
    .eq('id', id)
    .single();

  if (error || !data) {
    return res.status(404).json({ success: false, error: { code: 'not_found', message: 'Mandate not found' } });
  }

  return res.json({
    id: data.id,
    state: data.state,
    mandate_hash: data.pact_mandate_hash,
    anchor_tx_hash: data.anchor_tx_hash ?? null,
    created_at: data.created_at,
    parties: [
      { role: 'proposer', name: data.proposer_agent_id },
      { role: 'counterparty', name: data.counterparty_agent_id },
    ],
  });
});

export default router;
