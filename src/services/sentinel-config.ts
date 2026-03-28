// sentinel-config.ts
// Sentinel per-agent x402 spend governance (TICKET-022 / eval-016)
// Install @x402sentinel/x402 when published. Policy config ready.

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgentBudgetPolicy {
  agentId: string;
  dailyCapUSDC: number;
  spikeAlertPercent: number; // alert when N% of daily cap spent in <M minutes
  spikeWindowMinutes: number;
}

// ── Per-agent budget policies (TICKET-022) ────────────────────────────────────

export const AGENT_BUDGET_POLICIES: AgentBudgetPolicy[] = [
  { agentId: 'macgyver',  dailyCapUSDC: 50,  spikeAlertPercent: 20, spikeWindowMinutes: 30 },
  { agentId: 'bloomberg', dailyCapUSDC: 100, spikeAlertPercent: 20, spikeWindowMinutes: 30 },
  { agentId: 'sherlock',  dailyCapUSDC: 25,  spikeAlertPercent: 30, spikeWindowMinutes: 60 },
  { agentId: 'satoshi',   dailyCapUSDC: 50,  spikeAlertPercent: 20, spikeWindowMinutes: 30 },
];

export const TEAM_DAILY_CEILING_USDC = 225;

// ── Availability check ────────────────────────────────────────────────────────

/** Returns true once @x402sentinel/x402 is installed. */
export function isSentinelAvailable(): boolean {
  try { require('@x402sentinel/x402'); return true; }
  catch { return false; }
}

// ── Config factory ────────────────────────────────────────────────────────────

/**
 * Build a wrapWithSentinel() config for the given agent policy.
 * SENTINEL_HMAC_SECRET must be set in env — never hardcoded.
 * Audit trail: logs/sentinel/YYYY-MM-DD.jsonl (FileStorage, HMAC-signed).
 */
export function buildSentinelConfig(policy: AgentBudgetPolicy) {
  const hmacSecret = process.env.SENTINEL_HMAC_SECRET;
  if (!hmacSecret) throw new Error('[sentinel] SENTINEL_HMAC_SECRET env var not set');

  return {
    agentId: policy.agentId,
    team: 'invoica-core',
    humanSponsor: process.env.SENTINEL_SPONSOR_EMAIL || 'ops@invoica.ai',
    budget: {
      maxPerCall: '2.00',
      maxPerHour: String((policy.dailyCapUSDC * 0.25).toFixed(2)),
      maxPerDay:  String(policy.dailyCapUSDC.toFixed(2)),
      spikeThreshold: parseFloat((policy.spikeAlertPercent / 10).toFixed(1)),
    },
    audit: { enabled: true },
    metadata: {
      team_ceiling_usdc: TEAM_DAILY_CEILING_USDC,
      spike_window_minutes: policy.spikeWindowMinutes,
    },
  };
}

// ── Storage initializer (once at orchestrator startup) ────────────────────────

/**
 * Returns a FileStorage instance for HMAC-signed audit records.
 * Returns null if @x402sentinel/x402 is not yet installed.
 */
export function initSentinelStorage(): unknown | null {
  if (!isSentinelAvailable()) return null;

  const { FileStorage } = require('@x402sentinel/x402');
  const hmacSecret = process.env.SENTINEL_HMAC_SECRET;
  if (!hmacSecret) throw new Error('[sentinel] SENTINEL_HMAC_SECRET env var not set');

  return new FileStorage({
    dir: 'logs/sentinel',
    hmacSecret,
    rotateDaily: true,
    format: 'jsonl',
  });
}
