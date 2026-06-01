// One-shot: emit a single self-check event into swarm_events.
// Verifies the public widget pipeline end-to-end.
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing Supabase env'); process.exit(1); }

const sb = createClient(url, key);
const now = new Date();

(async () => {
  const row = {
    sprint_week: 121,
    task_id: 'WIDGET-SELFCHECK-20260529-01',
    agent_role: 'ops',
    task_type: 'diagnostic',
    task_category: 'infra',
    verdict: 'APPROVED',
    score: 100,
    tokens: 0,
    duration_s: 0,
    model: 'self-check',
    provider: 'invoica',
    started_at: new Date(now.getTime() - 1000).toISOString(),
    ended_at: now.toISOString(),
  };
  const { data, error } = await sb.from('swarm_events').insert(row).select().single();
  if (error) { console.error('Insert failed:', error); process.exit(1); }
  console.log('Seeded:', data);
})();
