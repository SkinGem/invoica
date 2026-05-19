// PACT mandate signing — HMAC-SHA256 over canonical mandate body.
//
// Used by /v1/mandates/:id/sign. The Helixa Synagent bot signs on behalf
// of TG users with the shared PACT_SIGNING_SECRET. v0.2 will add EIP-712
// wallet signatures; for v0.1 testnet this server-side HMAC model matches
// the existing PACT v0.3.2 primitive at lib/pact-verify.ts.

import * as crypto from 'crypto';

const SECRET = process.env.PACT_SIGNING_SECRET || '';

export interface MandateSignable {
  id: string;
  proposer_agent_id: string;
  counterparty_agent_id: string;
  scope: string;
  terms: unknown;
  expires_at: string;
}

function hmacSha256(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Recursively sort all object keys for deterministic JSON stringification.
 * Strings/numbers/null/arrays pass through; arrays sort their elements
 * (since order is meaningful) but objects get keys sorted alphabetically.
 */
function sortKeys(v: unknown): unknown {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(sortKeys);
  const sorted: Record<string, unknown> = {};
  Object.keys(v as Record<string, unknown>).sort().forEach((k) => {
    sorted[k] = sortKeys((v as Record<string, unknown>)[k]);
  });
  return sorted;
}

/**
 * Canonical signable JSON. Survives DB roundtrips:
 *   - Object keys sorted alphabetically (JSONB doesn't preserve insertion order)
 *   - Timestamps normalized via toISOString() (TIMESTAMPTZ reformats)
 *   - No whitespace
 */
function canonicalize(m: MandateSignable): string {
  const normalized = {
    counterparty_agent_id: m.counterparty_agent_id,
    expires_at: new Date(m.expires_at).toISOString(),
    id: m.id,
    proposer_agent_id: m.proposer_agent_id,
    scope: m.scope,
    terms: sortKeys(m.terms),
  };
  return JSON.stringify(normalized);
}

export function computeMandateSignature(m: MandateSignable): string {
  if (!SECRET) throw new Error('PACT_SIGNING_SECRET not configured');
  return hmacSha256(canonicalize(m), SECRET);
}

export function computeMandateHash(m: MandateSignable): `0x${string}` {
  return ('0x' + crypto.createHash('sha256').update(canonicalize(m)).digest('hex')) as `0x${string}`;
}

export function verifyMandateSignature(m: MandateSignable, signature: string): { ok: boolean; reason?: string } {
  if (!SECRET) return { ok: false, reason: 'PACT_SIGNING_SECRET not configured' };
  if (!signature) return { ok: false, reason: 'signature missing' };
  const expected = computeMandateSignature(m);
  if (!timingSafeStringEqual(expected, signature)) return { ok: false, reason: 'invalid signature' };
  return { ok: true };
}
