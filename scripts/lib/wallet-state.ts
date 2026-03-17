/**
 * wallet-state.ts — CFO budget tracking for ClawRouter spend
 *
 * Accumulates spend from ClawRouter X-Payment-Amount headers.
 * Enforces degraded (≥80%) and frozen (≥95%) modes to protect the wallet.
 * Persists to logs/wallet/state.json across sprint runs.
 *
 * Unified API — matches Kognai's wallet-state singleton pattern.
 * Backward-compatible exports retained for orchestrate-agents-v2.ts.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(__dirname, '../..');
const STATE_FILE = resolve(PROJECT_ROOT, 'logs/wallet/state.json');
const DEFAULT_BUDGET = parseFloat(process.env.CEO_WALLET_BUDGET_USDC || '25'); // $25/month default

interface WalletStateData {
  monthlyBudget: number;
  spentThisMonth: number;
  callCount: number;
  lastReset: string; // ISO date string
}

function loadState(): WalletStateData {
  if (existsSync(STATE_FILE)) {
    try {
      const raw = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
      // Auto-reset on new month
      const lastReset = new Date(raw.lastReset);
      const now = new Date();
      if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
        return freshState();
      }
      return raw;
    } catch { /* fall through */ }
  }
  return freshState();
}

function freshState(): WalletStateData {
  return {
    monthlyBudget: DEFAULT_BUDGET,
    spentThisMonth: 0,
    callCount: 0,
    lastReset: new Date().toISOString(),
  };
}

function saveState(data: WalletStateData): void {
  try {
    mkdirSync(resolve(PROJECT_ROOT, 'logs/wallet'), { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch { /* non-fatal */ }
}

// Singleton
let _state = loadState();

// ── Primary API (matches Kognai pattern) ────────────────────────────────────

export interface WalletState {
  monthlyBudget: number;
  spentThisMonth: number;
  callCount: number;
  remaining: number;
  burnPct: number;
  isDegraded: boolean; // ≥80%
  isFrozen: boolean;   // ≥95%
}

export function getWalletState(): WalletState {
  const remaining = Math.max(0, _state.monthlyBudget - _state.spentThisMonth);
  const burnPct = _state.monthlyBudget > 0
    ? (_state.spentThisMonth / _state.monthlyBudget) * 100
    : 0;
  return {
    monthlyBudget: _state.monthlyBudget,
    spentThisMonth: _state.spentThisMonth,
    callCount: _state.callCount,
    remaining,
    burnPct,
    isDegraded: burnPct >= 80,
    isFrozen: burnPct >= 95,
  };
}

export function recordSpend(costUsdc: number): void {
  _state.spentThisMonth += costUsdc;
  _state.callCount += 1;
  saveState(_state);
}

export function resetWallet(): void {
  _state = freshState();
  saveState(_state);
}

export function logWalletStatus(): void {
  const s = getWalletState();
  const status = s.isFrozen ? '🔴 FROZEN' : s.isDegraded ? '🟡 DEGRADED' : '🟢 OK';
  console.log(`  💳 Wallet ${status}: $${s.spentThisMonth.toFixed(4)}/$${s.monthlyBudget} (${s.burnPct.toFixed(1)}%)`);
}

// ── Backward-compatible API (for orchestrate-agents-v2.ts) ──────────────────

export function loadWalletState(): WalletState {
  _state = loadState(); // re-read from disk
  return getWalletState();
}

export function saveWalletState(_ws: WalletState): void {
  // Sync singleton state from caller's copy and persist
  _state.spentThisMonth = _ws.spentThisMonth;
  _state.callCount = _ws.callCount;
  saveState(_state);
}

export function recordCloudCall(state: WalletState, costUsdc: number): WalletState {
  return {
    ...state,
    spentThisMonth: state.spentThisMonth + costUsdc,
    callCount: state.callCount + 1,
    remaining: Math.max(0, state.monthlyBudget - state.spentThisMonth - costUsdc),
    burnPct: state.monthlyBudget > 0
      ? ((state.spentThisMonth + costUsdc) / state.monthlyBudget) * 100
      : 0,
    isDegraded: state.monthlyBudget > 0 && (state.spentThisMonth + costUsdc) / state.monthlyBudget >= 0.80,
    isFrozen: state.monthlyBudget > 0 && (state.spentThisMonth + costUsdc) / state.monthlyBudget >= 0.95,
  };
}

export function getWalletReport(state: WalletState): string {
  const burnPct = state.monthlyBudget > 0
    ? ((state.spentThisMonth / state.monthlyBudget) * 100).toFixed(1)
    : 'N/A';
  return `Wallet: $${state.spentThisMonth.toFixed(4)} / $${state.monthlyBudget} budget (${burnPct}%) | ${state.callCount} cloud calls this month`;
}

export function isFrozen(state: WalletState): boolean {
  return state.monthlyBudget > 0 && state.spentThisMonth / state.monthlyBudget >= 0.95;
}

export function isDegraded(state: WalletState): boolean {
  return state.monthlyBudget > 0 && state.spentThisMonth / state.monthlyBudget >= 0.80;
}
