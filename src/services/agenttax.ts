// AgentTax Service — TICKET-017-AGENTTAX-02
// x402 pay-per-call tax calculation API ($0.001 USDC/call on Base mainnet)
// Docs: eval-014-agenttax-x402.json

const AGENTTAX_BASE_URL = 'https://www.agenttax.io';
const AGENTTAX_API_KEY = process.env.AGENTTAX_API_KEY ?? '';

export interface AgentTaxRequest {
  amount: number;           // USD amount
  buyer_state: string;      // 2-letter US state code
  transaction_type: 'saas' | 'api_access' | 'subscription' | 'ai_labor' | 'data_purchase' | 'compute';
  counterparty_id: string;  // Invoica client_id
  work_type?: 'compute' | 'research' | 'content' | 'consulting' | 'trading';
  is_b2b?: boolean;
}

export interface TaxLine {
  amount_usd: number;
  rate: number;
  type: 'sales' | 'use' | 'exempt';
  jurisdiction: string;
  note: string;
  confidence_score: number;
  confidence_level: 'high' | 'medium' | 'low';
  mode: 'live' | 'demo' | 'skipped';
  calculated_at: string;
}

/**
 * Calculate tax for an Invoica transaction using AgentTax API.
 * Returns null if buyer_state is non-US or amount <= 0.
 * Throws if demo mode is detected (never use in production).
 */
export async function calculateTax(req: AgentTaxRequest): Promise<TaxLine | null> {
  if (!req.buyer_state || req.buyer_state.length !== 2 || req.amount <= 0) return null;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (AGENTTAX_API_KEY) headers['X-API-Key'] = AGENTTAX_API_KEY;

  try {
    const res = await fetch(`${AGENTTAX_BASE_URL}/api/v1/calculate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...req, role: 'seller' }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) throw new Error(`AgentTax HTTP ${res.status}`);
    const data = await res.json() as any;

    // Guard: never use demo mode in production (per eval-014 invoica_implication)
    if (data.mode === 'demo') throw new Error('AgentTax demo mode detected — set AGENTTAX_API_KEY');
    if (!data.success) throw new Error(`AgentTax error: ${data.error ?? 'unknown'}`);

    return {
      amount_usd:        data.sales_tax?.amount ?? data.total_tax ?? 0,
      rate:              data.sales_tax?.rate ?? data.combined_rate ?? 0,
      type:              (data.sales_tax?.type ?? 'sales') as TaxLine['type'],
      jurisdiction:      data.sales_tax?.jurisdiction ?? req.buyer_state,
      note:              data.sales_tax?.note ?? '',
      confidence_score:  data.confidence?.score ?? 0,
      confidence_level:  (data.confidence?.level ?? 'low') as TaxLine['confidence_level'],
      mode:             'live',
      calculated_at:     new Date().toISOString(),
    };
  } catch (err: any) {
    // Graceful degradation — log and skip tax line rather than blocking invoice
    console.warn(`[AgentTax] calculateTax failed (${err.message}) — returning null`);
    return null;
  }
}
