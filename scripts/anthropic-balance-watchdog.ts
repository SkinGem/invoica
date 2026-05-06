#!/usr/bin/env -S npx tsx
/**
 * anthropic-balance-watchdog.ts
 *
 * Daily probe (06:00 UTC, before tax-watchdogs at 07:00) that detects depleted
 * Anthropic credits before they silently break the autonomy loop.
 *
 * Why this exists:
 *   The autonomy loop (sprint-runner → orchestrator → CEO/CTO supervisor calls;
 *   plus ceo-refines daily) is heavy on Anthropic API calls. Twice now (Apr 28,
 *   May 6) credits depleted and ceo-refines + supervisors silently no-op'd, no
 *   user-facing alert until manual debugging surfaced it.
 *
 *   Anthropic has no public balance API, but the canary pattern works: make a
 *   1-token Haiku call, detect the credit-balance-too-low error, alert.
 *
 *   Cost: ~$0.00001 per run = negligible.
 *
 * What it does:
 *   1. Make a 1-token call to claude-haiku-4-5
 *   2. If 200 → silent (autonomy is safe)
 *   3. If 400 with "credit balance is too low" → 🚨 Telegram alert + console
 *   4. If 401 → invalid key (e.g. rotated and not propagated yet) → 🚨 alert
 *   5. If 429 → rate limited (transient, but worth knowing) → 🚨 alert
 *   6. Other failures → alert with status + body excerpt
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function loadDotenv(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadDotenv(join(process.cwd(), '.env'));

interface ProbeResult { ok: boolean; reason?: string; httpStatus?: number; }

async function probe(): Promise<ProbeResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, reason: 'ANTHROPIC_API_KEY not set in env' };

  let res: Response;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ok' }],
      }),
    });
  } catch (err) {
    return { ok: false, reason: `network_error: ${(err as Error).message}` };
  }

  if (res.ok) return { ok: true, httpStatus: res.status };

  const text = (await res.text()).slice(0, 300);
  if (text.includes('credit balance is too low')) {
    return { ok: false, reason: 'credit_balance_too_low', httpStatus: res.status };
  }
  if (res.status === 401) {
    return { ok: false, reason: 'invalid_api_key (was the key rotated without updating .env?)', httpStatus: 401 };
  }
  if (res.status === 429) {
    return { ok: false, reason: 'rate_limited', httpStatus: 429 };
  }
  return { ok: false, reason: `http_${res.status}: ${text}`, httpStatus: res.status };
}

async function alertTelegram(message: string): Promise<boolean> {
  const token = process.env.CEO_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.OWNER_TELEGRAM_CHAT_ID || process.env.CEO_TELEGRAM_CHAT_ID;
  if (!token || !chat) {
    console.warn('[anthropic-balance] no Telegram creds, skipping alert (set CEO_TELEGRAM_BOT_TOKEN + OWNER_TELEGRAM_CHAT_ID)');
    return false;
  }
  try {
    const params = new URLSearchParams({ chat_id: chat, text: message });
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', body: params });
    return r.ok;
  } catch (err) {
    console.warn(`[anthropic-balance] Telegram send failed: ${(err as Error).message}`);
    return false;
  }
}

async function main(): Promise<void> {
  const ts = new Date().toISOString();
  const result = await probe();
  if (result.ok) {
    console.log(`${ts} [anthropic-balance] OK (HTTP ${result.httpStatus})`);
    return;
  }
  const msg =
    `🚨 [Invoica][Anthropic API] Watchdog detected: ${result.reason}\n\n` +
    `The autonomous loop (sprint-runner supervisors, ceo-refines, briefing-to-sprint) is silently broken until this clears.\n\n` +
    `Top up: https://console.anthropic.com/settings/billing\n` +
    `Probed at: ${ts}`;
  console.warn(msg);
  const sent = await alertTelegram(msg);
  console.warn(`[anthropic-balance] Telegram alert sent: ${sent}`);
  process.exit(1);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
