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
 * Canonical signable JSON. Fields ordered deterministically so the bot
 * and the server produce identical bytes.
 */
function canonicalize(m: MandateSignable): string {
  return JSON.stringify({
    id: m.id,
    proposer_agent_id: m.proposer_agent_id,
    counterparty_agent_id: m.counterparty_agent_id,
    scope: m.scope,
    terms: m.terms,
    expires_at: m.expires_at,
  });
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
