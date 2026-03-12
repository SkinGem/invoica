/**
 * wallet-state.ts — CFO budget tracking with persistence
 *
 * Tracks monthly cloud API spend across orchestrator runs.
 * Persists to ./logs/wallet/state.json so spend survives process restarts.
 * Auto-resets spentThisMonth on the first run of a new calendar month.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

// ── Types ──────────────────────────────────────────────────────────────────

export interface WalletState {
  monthlyBudget:  number;   // max USDC spend this month (0 = unlimited)
  spentThisMonth: number;   // cumulative USDC spent since lastReset
  callCount:      number;   // cloud API calls made since lastReset
  lastReset:      string;   // ISO date YYYY-MM-DD of last monthly reset
}

// ── Internal ───────────────────────────────────────────────────────────────

const STATE_FILE = './logs/wallet/state.json';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function currentMonth(): string {
  return todayISO().slice(0, 7); // YYYY-MM
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Load wallet state from disk. Auto-resets if a new month has started.
 * If file doesn't exist, returns a fresh default state.
 */
export function loadWalletState(): WalletState {
  mkdirSync('./logs/wallet', { recursive: true });

  if (existsSync(STATE_FILE)) {
    try {
      const stored = JSON.parse(readFileSync(STATE_FILE, 'utf-8')) as WalletState;
      // Reset if we've crossed into a new calendar month
      if (stored.lastReset.slice(0, 7) !== currentMonth()) {
        const reset: WalletState = {
          monthlyBudget:  stored.monthlyBudget,
          spentThisMonth: 0,
          callCount:      0,
          lastReset:      todayISO(),
        };
        writeFileSync(STATE_FILE, JSON.stringify(reset, null, 2));
        return reset;
      }
      return stored;
    } catch {
      // Corrupt file — fall through to default
    }
  }

  const defaultState: WalletState = {
    monthlyBudget:  Number(process.env.CEO_WALLET_BUDGET_USDC || 0),
    spentThisMonth: 0,
    callCount:      0,
    lastReset:      todayISO(),
  };
  writeFileSync(STATE_FILE, JSON.stringify(defaultState, null, 2));
  return defaultState;
}

/**
 * Persist wallet state to disk. Call after every cloud spend mutation.
 */
export function saveWalletState(state: WalletState): void {
  mkdirSync('./logs/wallet', { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Record a cloud call. Returns updated state — does NOT persist.
 * Caller must call saveWalletState() themselves.
 */
export function recordCloudCall(state: WalletState, costUsdc: number): WalletState {
  return {
    ...state,
    spentThisMonth: state.spentThisMonth + costUsdc,
    callCount:      state.callCount + 1,
  };
}

/**
 * Human-readable budget report string.
 */
export function getWalletReport(state: WalletState): string {
  const burnPct = state.monthlyBudget > 0
    ? ((state.spentThisMonth / state.monthlyBudget) * 100).toFixed(1)
    : 'N/A';
  return `Wallet: $${state.spentThisMonth.toFixed(4)} / $${state.monthlyBudget} budget (${burnPct}%) | ${state.callCount} cloud calls this month`;
}

/**
 * Returns true when monthly spend has hit 95% of budget.
 * Triggers sovereign mode: all tasks routed to local Ollama.
 */
export function isFrozen(state: WalletState): boolean {
  return state.monthlyBudget > 0 && state.spentThisMonth / state.monthlyBudget >= 0.95;
}

/**
 * Returns true when monthly spend has hit 80% of budget.
 * Triggers degraded mode: non-critical tasks rerouted to local.
 */
export function isDegraded(state: WalletState): boolean {
  return state.monthlyBudget > 0 && state.spentThisMonth / state.monthlyBudget >= 0.80;
}
