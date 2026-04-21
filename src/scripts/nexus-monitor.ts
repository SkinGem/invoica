// Nexus Threshold Monitor — TICKET-017-AGENTTAX-03
// Runs via PM2 or cron. Checks cumulative revenue per US state.
// Alert: Harvey morning briefing if any configured state approaches its 2026 economic nexus rule.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY!
);

interface NexusRule {
  amountUsd: number;
  transactionCount?: number;
}

const STATE_NEXUS_RULES: Record<string, NexusRule> = {
  CA: { amountUsd: 500_000 },
  TX: { amountUsd: 500_000 },
  NY: { amountUsd: 500_000, transactionCount: 100 },
  FL: { amountUsd: 100_000 },
  WA: { amountUsd: 100_000 },
};

interface StateRevenue {
  state: string;
  total_usd: number;
  invoice_count: number;
  threshold_usd: number;
  threshold_transactions?: number;
  percent_of_amount_threshold: number;
  percent_of_transaction_threshold?: number;
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
    .filter(([state]) => state in STATE_NEXUS_RULES)
    .map(([state, v]) => {
      const rule = STATE_NEXUS_RULES[state];
      const percentOfAmountThreshold = (v.total / rule.amountUsd) * 100;
      const percentOfTransactionThreshold = rule.transactionCount
        ? (v.count / rule.transactionCount) * 100
        : undefined;

      return {
        state,
        total_usd: v.total,
        invoice_count: v.count,
        threshold_usd: rule.amountUsd,
        threshold_transactions: rule.transactionCount,
        percent_of_amount_threshold: percentOfAmountThreshold,
        percent_of_transaction_threshold: percentOfTransactionThreshold,
      };
    })
    .filter((stateRevenue) => {
      const amountWarning = stateRevenue.percent_of_amount_threshold >= 80;
      const transactionWarning = (stateRevenue.percent_of_transaction_threshold ?? 0) >= 80;
      return amountWarning || transactionWarning;
    })
    .sort((a, b) => b.percent_of_amount_threshold - a.percent_of_amount_threshold);

  if (approaching.length > 0) {
    console.log('[NexusMonitor] States approaching nexus threshold:');
    for (const s of approaching) {
      const amountPct = s.percent_of_amount_threshold.toFixed(1);
      const amountTriggered = s.total_usd >= s.threshold_usd;
      const txnTriggered = s.threshold_transactions !== undefined && s.invoice_count >= s.threshold_transactions;
      const flag = amountTriggered || txnTriggered ? 'NEXUS' : 'WARNING';
      const txnSummary = s.threshold_transactions !== undefined
        ? `; ${s.invoice_count} txns (${(s.percent_of_transaction_threshold ?? 0).toFixed(1)}% of ${s.threshold_transactions})`
        : '';

      console.log(
        `  [${flag}] ${s.state}: $${s.total_usd.toLocaleString()} ` +
        `(${amountPct}% of $${s.threshold_usd.toLocaleString()} threshold${txnSummary})`
      );
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
