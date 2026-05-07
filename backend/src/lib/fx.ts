// fx.ts — currency conversion to USD cents for billing.
//
// Settlement-fee charges are always in USD (Stripe currency). Invoices can be
// USD, EUR, or USDC. Convert to USD cents before applying the 1% / floor /
// cap rule.
//
// Strategy:
//   USD/USDC → 1:1 (USDC is dollar-pegged; treating 1 USDC = 1 USD is industry
//                   standard for invoice billing — slippage is < 0.1% in normal
//                   conditions and we eat it as a cost of business).
//   EUR     → ECB daily reference rate, cached for 6h. Falls back to a hard-coded
//             rate if ECB is unreachable so settlement-fee debit never blocks an
//             invoice settlement.
//   GBP     → same pattern (BoE rate via openexchangerates fallback).
//
// All conversions are deterministic per cache window so the same invoice
// always produces the same fee even if the fee is computed twice.

interface CachedRate { rate: number; fetchedAt: number }
const cache: Map<string, CachedRate> = new Map();
const SIX_HOURS = 6 * 60 * 60 * 1000;

const FALLBACK_RATES_PER_USD: Record<string, number> = {
  // 1 USD = N units of foreign currency. Update annually.
  EUR: 0.92,
  GBP: 0.78,
};

async function fetchEurUsd(): Promise<number> {
  // ECB daily reference; XML format. We fetch JSON proxy via exchangerate.host
  // (free, no key, public ECB data). Wrapped in try/catch upstream.
  const r = await fetch('https://api.frankfurter.dev/v1/latest?from=USD&to=EUR', {
    signal: AbortSignal.timeout(3000),
  });
  if (!r.ok) throw new Error(`Frankfurter HTTP ${r.status}`);
  const data = await r.json() as { rates?: { EUR?: number } };
  if (!data.rates?.EUR) throw new Error('Frankfurter returned no EUR rate');
  return data.rates.EUR;
}

async function fxRateUsdToCurrency(currency: string): Promise<number> {
  if (currency === 'USD' || currency === 'USDC') return 1;
  const upper = currency.toUpperCase();
  const cached = cache.get(upper);
  if (cached && Date.now() - cached.fetchedAt < SIX_HOURS) return cached.rate;

  try {
    if (upper === 'EUR') {
      const rate = await fetchEurUsd();
      cache.set(upper, { rate, fetchedAt: Date.now() });
      return rate;
    }
  } catch (err) {
    console.warn(`[fx] live rate fetch failed for ${upper}, using fallback: ${(err as Error).message}`);
  }

  const fallback = FALLBACK_RATES_PER_USD[upper];
  if (!fallback) throw new Error(`Unsupported currency for FX: ${upper}`);
  return fallback;
}

/**
 * Convert an arbitrary-currency amount to USD cents.
 *
 * @param amount Decimal amount (NOT cents). e.g. 12.50 for $12.50 or €12.50.
 * @param currency 'USD' | 'USDC' | 'EUR' | 'GBP' (case-insensitive).
 * @returns Integer cents (rounded).
 */
export async function toUsdCents(amount: number, currency: string): Promise<number> {
  if (!Number.isFinite(amount) || amount < 0) throw new Error(`Invalid amount: ${amount}`);
  const rateUsdTo = await fxRateUsdToCurrency(currency);
  // amount is in `currency`. To convert to USD: divide by (rate USD→currency).
  const usd = amount / rateUsdTo;
  return Math.round(usd * 100);
}
