// Nexus Threshold Monitor — TICKET-017-AGENTTAX-03
// Runs via PM2 or cron. Checks cumulative revenue per US state.
// Alert: Harvey morning briefing if any state exceeds $100K threshold (typical nexus trigger).

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY!
);

const NEXUS_THRESHOLD_USD = 100_000;

interface StateRevenue {
  state: string;
  total_usd: number;
  invoice_count: number;
}

export async function checkNexusThresholds(): Promise<StateRevenue[]> {
  // Query invoices table, group by buyer_state, sum amount
  // Adapt column names to match actual Invoica schema
  const { data, error } = await supabase
    .from('invoices')
    .select('buyer_state, amount_usd')
    .not('buyer_state', 'is', null);

  if (error) throw new Error(`Nexus query failed: ${error.message}`);

  const stateTotals: Record<string, { total: number; count: number }> = {};
  for (const row of (data ?? [])) {
    const state = row.buyer_state as string;
    if (!state || state.length !== 2) continue;
    if (!stateTotals[state]) stateTotals[state] = { total: 0, count: 0 };
    stateTotals[state].total += Number(row.amount_usd ?? 0);
    stateTotals[state].count++;
  }

  const approaching: StateRevenue[] = Object.entries(stateTotals)
    .filter(([, v]) => v.total >= NEXUS_THRESHOLD_USD * 0.8)  // 80% = warning zone
    .map(([state, v]) => ({ state, total_usd: v.total, invoice_count: v.count }))
    .sort((a, b) => b.total_usd - a.total_usd);

  if (approaching.length > 0) {
    console.log('[NexusMonitor] States approaching nexus threshold:');
    for (const s of approaching) {
      const pct = ((s.total_usd / NEXUS_THRESHOLD_USD) * 100).toFixed(1);
      const flag = s.total_usd >= NEXUS_THRESHOLD_USD ? 'NEXUS' : 'WARNING';
      console.log(`  [${flag}] ${s.state}: $${s.total_usd.toLocaleString()} (${pct}% of $100K threshold)`);
    }
    // TODO: wire into Harvey morning briefing via Telegram notification
    // For now: log output is captured by PM2 and surfaced in daily health check
  } else {
    console.log('[NexusMonitor] No states near nexus threshold');
  }

  return approaching;
}

// Main entry point
checkNexusThresholds()
  .then(results => {
    console.log(`[NexusMonitor] Done — ${results.length} state(s) flagged`);
  })
  .catch(err => {
    console.error('[NexusMonitor] Fatal error:', err.message);
    process.exit(1);
  });
