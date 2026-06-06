'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { fetchBillingStatus, BillingStatus } from '@/lib/api-client';

interface UsageData {
  invoiceCountThisMonth: number;
  apiCallCountThisMonth: number;
  monthlyResetAt: string;
  plan: string;
}

const PLAN_LIMITS: Record<string, { invoices: number; apiCalls: number }> = {
  free: { invoices: 100, apiCalls: 1000 },
  pro: { invoices: 10000, apiCalls: 100000 },
  enterprise: { invoices: Infinity, apiCalls: Infinity },
};

function UsageBar({ used, limit, label, color }: { used: number; limit: number; label: string; color: string }) {
  const pct = limit === Infinity ? 0 : Math.min((used / limit) * 100, 100);
  const isUnlimited = limit === Infinity;
  const isNearLimit = pct > 80;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 shadow-sm p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{label}</h3>
        <span className={`text-sm font-mono ${isNearLimit ? 'text-red-600 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
          {used.toLocaleString()} / {isUnlimited ? 'Unlimited' : limit.toLocaleString()}
        </span>
      </div>
      <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isNearLimit ? 'bg-red-500' : color
          }`}
          style={{ width: `${isUnlimited ? 0 : pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {isUnlimited ? 'Unlimited plan' : `${Math.round(pct)}% used`}
        </span>
        {!isUnlimited && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {(limit - used).toLocaleString()} remaining
          </span>
        )}
      </div>
    </div>
  );
}

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch usage from UserProfile
        const { data: profile } = await supabase
          .from('UserProfile')
          .select('invoice_count_this_month, api_call_count_this_month, monthly_reset_at, subscription_plan')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUsage({
            invoiceCountThisMonth: profile.invoice_count_this_month || 0,
            apiCallCountThisMonth: profile.api_call_count_this_month || 0,
            monthlyResetAt: profile.monthly_reset_at,
            plan: profile.subscription_plan || 'free',
          });
        }

        // Fetch billing status
        const billingData = await fetchBillingStatus().catch(() => null);
        if (billingData) setBilling(billingData);
      } catch (err) {
        console.error('Failed to load usage:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const plan = usage?.plan || billing?.subscription_plan || 'free';
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const resetDate = usage?.monthlyResetAt
    ? new Date(usage.monthlyResetAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Next month';

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold dark:text-white">Usage</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Monitor your API usage and plan limits</p>
      </div>

      {/* Current Plan */}
      <div className="bg-gradient-to-r from-[#635BFF] to-[#818CF8] rounded-xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70">Current Plan</p>
            <h2 className="text-2xl font-bold capitalize mt-1">{plan}</h2>
            <p className="text-sm text-white/60 mt-1">
              Resets on {resetDate}
            </p>
          </div>
          {plan === 'free' && (
            <a
              href="/billing"
              className="px-5 py-2.5 bg-white text-[#635BFF] rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              Beta — All features included
            </a>
          )}
        </div>
      </div>

      {/* Usage Bars */}
      <div className="space-y-4 mb-8">
        <UsageBar
          used={usage?.invoiceCountThisMonth || 0}
          limit={limits.invoices}
          label="Invoices This Month"
          color="bg-[#635BFF]"
        />
        <UsageBar
          used={usage?.apiCallCountThisMonth || 0}
          limit={limits.apiCalls}
          label="API Calls This Month"
          color="bg-emerald-500"
        />
      </div>

      {/* Plan Comparison */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 shadow-sm p-6">
        <h3 className="font-semibold mb-4 dark:text-white">Plan Limits</h3>
        <div className="overflow-hidden rounded-lg border dark:border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Feature</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Free</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Pro</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t dark:border-gray-800">
                <td className="px-4 py-3 dark:text-gray-300">Invoices / month</td>
                <td className="px-4 py-3 text-center dark:text-gray-300">100</td>
                <td className="px-4 py-3 text-center dark:text-gray-300">10,000</td>
                <td className="px-4 py-3 text-center dark:text-gray-300">Unlimited</td>
              </tr>
              <tr className="border-t dark:border-gray-800">
                <td className="px-4 py-3 dark:text-gray-300">API calls / month</td>
                <td className="px-4 py-3 text-center dark:text-gray-300">1,000</td>
                <td className="px-4 py-3 text-center dark:text-gray-300">100,000</td>
                <td className="px-4 py-3 text-center dark:text-gray-300">Unlimited</td>
              </tr>
              <tr className="border-t dark:border-gray-800">
                <td className="px-4 py-3 dark:text-gray-300">Webhooks</td>
                <td className="px-4 py-3 text-center dark:text-gray-300">3</td>
                <td className="px-4 py-3 text-center dark:text-gray-300">Unlimited</td>
                <td className="px-4 py-3 text-center dark:text-gray-300">Unlimited</td>
              </tr>
              <tr className="border-t dark:border-gray-800">
                <td className="px-4 py-3 dark:text-gray-300">Support</td>
                <td className="px-4 py-3 text-center dark:text-gray-300">Community</td>
                <td className="px-4 py-3 text-center dark:text-gray-300">Priority</td>
                <td className="px-4 py-3 text-center dark:text-gray-300">Dedicated</td>
              </tr>
              <tr className="border-t dark:border-gray-800">
                <td className="px-4 py-3 dark:text-gray-300">Price</td>
                <td className="px-4 py-3 text-center font-medium">$0</td>
                <td className="px-4 py-3 text-center font-medium">$49/mo</td>
                <td className="px-4 py-3 text-center font-medium">Custom</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
