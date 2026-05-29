// Verify: inspect recent swarm_events rows + assert no privacy leak.
// Privacy contract: rows must NEVER contain raw task titles, descriptions,
// file paths, PR titles, or customer identifiers.
//
// Heuristic: any text field longer than 60 chars, or containing a colon-space
// (common in titles like "feat(backend-tax): collect W-9"), is treated as
// likely leak material and flagged.
//
// Run: cd ~/Documents/Invoica && npx tsx scripts/verify-swarm-events.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing Supabase env'); process.exit(1); }

const sb = createClient(url, key);

const SUSPICIOUS_FIELDS = ['task_id', 'agent_role', 'task_type', 'task_category', 'verdict', 'model', 'provider'];
const LEAK_RE_COLON_SPACE = /:\s/;
const MAX_LEN = 60;

function isLikelyLeak(val: unknown): { leak: boolean; reason?: string } {
  if (typeof val !== 'string') return { leak: false };
  if (val.length > MAX_LEN) return { leak: true, reason: `length=${val.length}>${MAX_LEN}` };
  if (LEAK_RE_COLON_SPACE.test(val)) return { leak: true, reason: 'contains ":space" (title pattern)' };
  return { leak: false };
}

(async () => {
  const { data, error } = await sb
    .from('swarm_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) { console.error('Query failed:', error); process.exit(1); }
  if (!data || data.length === 0) {
    console.log('No swarm_events rows yet. Run the orchestrator once to populate.');
    process.exit(0);
  }

  console.log(`Last ${data.length} swarm_events:\n`);

  let leaks = 0;
  for (const row of data) {
    const created = row.created_at?.slice(0, 19) ?? '?';
    const role = row.agent_role || '?';
    const cat = row.task_category || '-';
    const verdict = row.verdict || '?';
    const score = row.score ?? '?';
    const dur = row.duration_s ? `${Math.round(row.duration_s)}s` : '?';
    console.log(`  ${created}Z  ${role.padEnd(20)}  ${cat.padEnd(18)}  ${verdict.padEnd(10)}  score=${String(score).padEnd(5)}  ${dur}`);

    for (const f of SUSPICIOUS_FIELDS) {
      const probe = isLikelyLeak(row[f]);
      if (probe.leak) {
        console.log(`     ⚠️  PRIVACY LEAK in field "${f}" — ${probe.reason}`);
        console.log(`        value: ${JSON.stringify(row[f])}`);
        leaks++;
      }
    }
  }

  // Hour summary
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const recent = data.filter(r => new Date(r.created_at).getTime() > hourAgo);
  const byRole: Record<string, number> = {};
  const byVerdict: Record<string, number> = {};
  for (const r of recent) {
    byRole[r.agent_role] = (byRole[r.agent_role] || 0) + 1;
    byVerdict[r.verdict] = (byVerdict[r.verdict] || 0) + 1;
  }
  console.log(`\nLast hour: ${recent.length} event(s)`);
  if (recent.length > 0) {
    console.log(`  by agent_role: ${JSON.stringify(byRole)}`);
    console.log(`  by verdict:    ${JSON.stringify(byVerdict)}`);
  }

  if (leaks > 0) {
    console.log(`\n❌ ${leaks} privacy leak(s) detected — fix the orchestrator hook before exposing the widget publicly.`);
    process.exit(1);
  }
  console.log(`\n✓ Privacy contract clean — no leaks in last ${data.length} rows.`);
  process.exit(0);
})();
