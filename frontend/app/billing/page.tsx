'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  fetchBillingBalance,
  createTopupSession,
  type BillingBalance,
  type CreditTxn,
} from '@/lib/api-client';

const PRESETS = [2000, 5000, 10000, 25000];  // $20, $50, $100, $250

function formatCents(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  const sign = cents < 0 ? '−' : '';
  return `${sign}$${dollars.toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function txnLabel(txn: CreditTxn): string {
  switch (txn.type) {
    case 'topup':       return 'Top-up';
    case 'debit':       return `Settlement fee${txn.ref_id ? ` · ${txn.ref_id.slice(0, 8)}` : ''}`;
    case 'charge':      return `Card charge${txn.ref_id ? ` · ${txn.ref_id.slice(0, 8)}` : ''}`;
    case 'refund':      return 'Refund';
    case 'outstanding': return `Outstanding fee${txn.ref_id ? ` · ${txn.ref_id.slice(0, 8)}` : ''}`;
  }
}

function txnColor(txn: CreditTxn): string {
  if (txn.type === 'topup' || txn.type === 'refund') return 'text-green-600 dark:text-green-400';
  if (txn.type === 'outstanding') return 'text-orange-600 dark:text-orange-400';
  return 'text-gray-700 dark:text-gray-300';
}

function BillingPageContent() {
  const searchParams = useSearchParams();
  const [balance, setBalance] = useState<BillingBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [topupBusy, setTopupBusy] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: 'success' | 'cancel'; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchBillingBalance();
      setBalance(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load balance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const status = searchParams.get('topup');
    if (status === 'success') {
      setBanner({ kind: 'success', message: 'Top-up successful — your balance is being updated.' });
    } else if (status === 'cancelled') {
      setBanner({ kind: 'cancel', message: 'Top-up cancelled. No charge was made.' });
    }
    load();
  }, [searchParams, load]);

  const handleTopup = async (amountCents: number) => {
    if (topupBusy) return;
    if (amountCents < 1000) { setError('Minimum top-up is $10'); return; }
    if (amountCents > 100000) { setError('Maximum single top-up is $1,000'); return; }
    try {
      setTopupBusy(true);
      setError(null);
      const { url } = await createTopupSession(amountCents);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setTopupBusy(false);
    }
  };

  const handleCustomTopup = () => {
    const cents = Math.round(parseFloat(customAmount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) { setError('Enter a valid amount'); return; }
    handleTopup(cents);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2 dark:text-white">Billing</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Pay-as-you-go credits · 1% per settled invoice (min $0.01, cap $5)</p>

      {banner && (
        <div className={`mb-6 rounded-xl border p-4 text-sm ${
          banner.kind === 'success'
            ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800/30 dark:bg-green-950/30 dark:text-green-400'
            : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
        }`}>
          {banner.message}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800/30 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Balance */}
      <section className="mb-8 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current balance</p>
        <p className="text-4xl font-bold text-gray-900 dark:text-white">
          {loading ? '—' : balance ? formatCents(balance.balance_cents) : '$0.00'}
        </p>
        {balance?.updated_at && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Updated {formatDate(balance.updated_at)}</p>
        )}
      </section>

      {/* Top-up */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Add credits</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {PRESETS.map(cents => (
            <button
              key={cents}
              disabled={topupBusy}
              onClick={() => handleTopup(cents)}
              className="border dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg p-4 text-center hover:border-[#635BFF] hover:bg-[#635BFF]/5 dark:hover:border-[#635BFF] dark:hover:bg-[#635BFF]/10 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <p className="text-2xl font-bold">${cents / 100}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">add to balance</p>
            </button>
          ))}
        </div>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Custom amount (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">$</span>
              <input
                type="number"
                min="10"
                max="1000"
                step="1"
                placeholder="50"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                disabled={topupBusy}
                className="w-full pl-7 pr-3 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:border-[#635BFF] disabled:opacity-50"
              />
            </div>
          </div>
          <button
            disabled={topupBusy || !customAmount}
            onClick={handleCustomTopup}
            className="px-4 py-2 bg-[#635BFF] text-white rounded-lg hover:bg-[#5347e6] disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {topupBusy ? 'Redirecting…' : 'Add credits'}
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Min $10, max $1,000 per top-up. Card details are saved for automatic top-ups when balance runs low.</p>
      </section>

      {/* Recent transactions */}
      <section>
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Recent activity</h2>
        {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
        {!loading && balance && balance.recent_transactions.length === 0 && (
          <div className="rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
            No transactions yet. Add credits above to get started.
          </div>
        )}
        {!loading && balance && balance.recent_transactions.length > 0 && (
          <div className="rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800 overflow-hidden">
            {balance.recent_transactions.map((txn, i) => (
              <div
                key={txn.id}
                className={`flex items-center justify-between p-4 ${
                  i !== balance.recent_transactions.length - 1 ? 'border-b dark:border-gray-800' : ''
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{txnLabel(txn)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(txn.created_at)}</p>
                </div>
                <p className={`text-sm font-mono font-semibold ${txnColor(txn)}`}>
                  {txn.amount_cents > 0 ? '+' : ''}{formatCents(txn.amount_cents)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto p-6"><p className="text-sm text-gray-500">Loading…</p></div>}>
      <BillingPageContent />
    </Suspense>
  );
}
