const BASE_URL = process.env.ASTERPAY_API_BASE || 'https://x402.asterpay.io';

function apiKey(): string {
  const k = process.env.ASTERPAY_API_KEY || '';
  if (!k) throw new Error('ASTERPAY_API_KEY not configured');
  return k;
}

export interface CreateSessionRequest {
  sponsor_id: string;
  sponsor_callback_url: string;
  invoica_session_ref: string;
  recipient_country: string;
  amount_eur: number;
  payout_method: 'sepa' | 'wallet';
  description: string;
}

export interface CreateSessionResponse {
  session_id: string;
  hosted_page_url: string;
  token?: string;
  expires_at: string;
}

export async function createCollectSession(body: CreateSessionRequest): Promise<CreateSessionResponse> {
  const res = await fetch(`${BASE_URL}/v1/collect/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AsterPay /v1/collect/sessions ${res.status}: ${text}`);
  }
  return (await res.json()) as CreateSessionResponse;
}

export interface SettleRequest {
  session_id: string;
  amount_usdc: number;
  mandate_hash?: string;
  reference: string;
}

export interface SettleResponse {
  status: 'settled' | 'pending' | 'failed';
  provider_ref: string;
}

export async function settleCollectSession(body: SettleRequest): Promise<SettleResponse> {
  const res = await fetch(`${BASE_URL}/v1/collect/settle`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AsterPay /v1/collect/settle ${res.status}: ${text}`);
  }
  return (await res.json()) as SettleResponse;
}
