#!/usr/bin/env -S npx tsx
/**
 * token-budget-watchdog.ts
 *
 * Hourly check. Counts Claude supervisor reviews (Approved/Rejected lines)
 * from sprint-runner-out.log over the last 24h. Each review = ~50K Sonnet
 * tokens. If the rolling 24h count exceeds the budget, halts sprint-runner
 * via PM2 and sends a Telegram alert.
 *
 * Why this exists:
 *   2026-05-06 incident: sprint-runner was running 30 rejected reviews per
 *   30-min cycle = ~1,440 rejections/day = 72M tokens/day = ~$300-500/day in
 *   silent burn while shipping zero commits. Anthropic balance watchdog only
 *   catches DEPLETION, not RATE-OF-BURN — by the time balance hits zero,
 *   thousands have already been spent.
 *
 *   This watchdog adds the rate-of-burn brake. If supervisor rejection
 *   activity exceeds threshold, it halts the offending process before more
 *   damage. Owner can re-enable manually after fixing root cause (refining
 *   stuck tasks, etc.).
 *
 * Tunables (env vars, sensible defaults):
 *   TOKEN_BUDGET_REVIEWS_24H — max rolling 24h supervisor reviews (default 100)
 *   TOKEN_BUDGET_TOKENS_PER_REVIEW — tokens per review estimate (default 50000)
 *   TOKEN_BUDGET_COST_PER_M — blended $/M tokens (default 5)
 *
 * Cost: ~0 (no API calls; just file reads + grep).
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

function loadDotenv(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadDotenv(join(process.cwd(), '.env'));

const SPRINT_LOG = process.env.SPRINT_RUNNER_LOG || '/home/invoica/apps/Invoica/logs/sprint-runner-out.log';
const BUDGET_REVIEWS_24H = parseInt(process.env.TOKEN_BUDGET_REVIEWS_24H || '100', 10);
const TOKENS_PER_REVIEW = parseInt(process.env.TOKEN_BUDGET_TOKENS_PER_REVIEW || '50000', 10);
const COST_PER_M = parseFloat(process.env.TOKEN_BUDGET_COST_PER_M || '5');
const HALTED_PROCESSES = ['sprint-runner']; // extend if other token-burners surface

function count24hReviews(): { approved: number; rejected: number } {
  if (!existsSync(SPRINT_LOG)) return { approved: 0, rejected: 0 };
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19);
  const content = readFileSync(SPRINT_LOG, 'utf8');
  let approved = 0;
  let rejected = 0;
  for (const line of content.split('\n')) {
    // Lines look like: "27|sprint- | 2026-05-06 17:39:04 +00:00: [32m  Approved: 0[0m"
    const tsMatch = line.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})/);
    if (!tsMatch || tsMatch[1] < cutoff) continue;
    const aMatch = line.match(/Approved:\s*(\d+)/);
    const rMatch = line.match(/Rejected:\s*(\d+)/);
    if (aMatch) approved += parseInt(aMatch[1], 10);
    if (rMatch) rejected += parseInt(rMatch[1], 10);
  }
  return { approved, rejected };
}

async function alertTelegram(message: string): Promise<boolean> {
  const token = process.env.CEO_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.OWNER_TELEGRAM_CHAT_ID || process.env.CEO_TELEGRAM_CHAT_ID;
  if (!token || !chat) return false;
  try {
    const params = new URLSearchParams({ chat_id: chat, text: message });
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', body: params });
    return r.ok;
  } catch { return false; }
}

function haltProcesses(processes: string[]): { halted: string[]; alreadyDown: string[]; failed: string[] } {
  const halted: string[] = [];
  const alreadyDown: string[] = [];
  const failed: string[] = [];
  for (const p of processes) {
    try {
      const out = execSync(`pm2 jlist 2>/dev/null`).toString();
      const list = JSON.parse(out) as Array<{ name: string; pm2_env: { status: string } }>;
      const proc = list.find(x => x.name === p);
      if (!proc) { alreadyDown.push(p); continue; }
      if (proc.pm2_env.status !== 'online') { alreadyDown.push(p); continue; }
      execSync(`pm2 stop ${p}`, { stdio: 'pipe' });
      halted.push(p);
    } catch (err) {
      failed.push(p);
    }
  }
  return { halted, alreadyDown, failed };
}

async function main(): Promise<void> {
  const ts = new Date().toISOString();
  const { approved, rejected } = count24hReviews();
  const totalReviews = approved + rejected;
  const estTokens = totalReviews * TOKENS_PER_REVIEW;
  const estCost = (estTokens / 1_000_000) * COST_PER_M;

  console.log(`${ts} [token-budget] 24h: approved=${approved} rejected=${rejected} total=${totalReviews} ~${estTokens.toLocaleString()} tokens ~$${estCost.toFixed(2)} (budget ${BUDGET_REVIEWS_24H} reviews/day)`);

  if (totalReviews <= BUDGET_REVIEWS_24H) return;

  // Over budget — halt + alert
  const { halted, alreadyDown, failed } = haltProcesses(HALTED_PROCESSES);
  const msg =
    `🚨 [Invoica][Token Budget] BREACH: ${totalReviews} supervisor reviews in 24h ` +
    `(budget=${BUDGET_REVIEWS_24H}), est cost ~$${estCost.toFixed(2)}. ` +
    `Approved=${approved}, rejected=${rejected} (0% approval rate is the smoke).` +
    `\n\nHalted: ${halted.join(', ') || 'none'}` +
    (alreadyDown.length ? `\nAlready down: ${alreadyDown.join(', ')}` : '') +
    (failed.length ? `\nFailed to halt: ${failed.join(', ')}` : '') +
    `\n\nDiagnose with: \`grep -E "Approved|Rejected" /home/invoica/apps/Invoica/logs/sprint-runner-out.log | tail -20\`` +
    `\nResume with: \`pm2 start sprint-runner\` after refining stuck tasks.`;

  console.warn(msg);
  const sent = await alertTelegram(msg);
  console.warn(`[token-budget] Telegram sent: ${sent}`);
  process.exit(1);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
