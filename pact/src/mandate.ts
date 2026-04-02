/**
 * @invoica/pact — Mandate issuance and verification
 * Zero external dependencies — uses Node.js built-in crypto module.
 *
 * Usage:
 *   const mandate = issueMandate({ grantor, scope }, signingSecret);
 *   const header  = encodeMandateHeader(mandate);
 *   // Set header: X-Pact-Mandate: <header>
 *
 * Server-side verification mirrors backend/src/lib/pact-verify.ts.
 */
import * as crypto from 'crypto';
import type { PactMandate, PactIssueOptions, PactVerifyResult } from './types';

// ── Internal helpers ──────────────────────────────────────────────────────

function hmacSha256(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function buildSignable(m: Omit<PactMandate, 'signature'>): string {
  return JSON.stringify({
    id: m.id,
    grantor: m.grantor,
    grantee: m.grantee,
    scope: m.scope,
    expiresAt: m.expiresAt,
    issuedAt: m.issuedAt,
  });
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Issue a new signed PACT mandate.
 *
 * @param options  Mandate configuration (grantor, scope, optional TTL)
 * @param secret   Shared HMAC-SHA256 signing secret (must match PACT_SIGNING_SECRET on the server)
 * @returns        Signed PactMandate ready to encode as X-Pact-Mandate header
 *
 * @example
 * const mandate = issueMandate(
 *   { grantor: 'agent-wallet-abc', scope: { maxPaymentUsdc: 10 } },
 *   process.env.PACT_SIGNING_SECRET!
 * );
 * headers['X-Pact-Mandate'] = encodeMandateHeader(mandate);
 */
export function issueMandate(
  options: PactIssueOptions,
  secret: string,
): PactMandate {
  if (!secret) throw new Error('[pact] signingSecret is required');
  if (!options.grantor) throw new Error('[pact] options.grantor is required');

  const now = new Date();
  const ttl = options.ttlMs ?? 60 * 60 * 1000; // default 1 hour
  const mandate: Omit<PactMandate, 'signature'> = {
    id: crypto.randomUUID(),
    grantor: options.grantor,
    grantee: options.grantee ?? 'invoica',
    scope: options.scope,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttl).toISOString(),
  };

  return { ...mandate, signature: hmacSha256(buildSignable(mandate), secret) };
}

/**
 * Verify a PACT mandate received in an X-Pact-Mandate header.
 * Mirrors the logic in backend/src/lib/pact-verify.ts.
 *
 * @param header      Raw value of the X-Pact-Mandate request header
 * @param amountUsdc  The payment amount being requested (checked against scope.maxPaymentUsdc)
 * @param secret      Shared signing secret
 */
export function verifyMandate(
  header: string | undefined,
  amountUsdc: number,
  secret: string,
): PactVerifyResult {
  if (!header) return { allowed: true };
  if (!secret) return { allowed: true }; // no secret = verification disabled

  let mandate: PactMandate;
  try {
    mandate = JSON.parse(header) as PactMandate;
  } catch {
    return { allowed: false, reason: 'Invalid mandate JSON' };
  }

  if (mandate.expiresAt && new Date(mandate.expiresAt) < new Date()) {
    return { allowed: false, reason: 'Mandate expired' };
  }

  const expected = hmacSha256(buildSignable(mandate), secret);
  if (expected !== mandate.signature) {
    return { allowed: false, reason: 'Invalid mandate signature' };
  }

  const cap = mandate.scope?.maxPaymentUsdc;
  if (cap !== undefined && cap < amountUsdc) {
    return { allowed: false, reason: `Mandate cap ${cap} USDC < requested ${amountUsdc} USDC` };
  }

  return { allowed: true };
}

/**
 * Encode a PactMandate for use as the X-Pact-Mandate HTTP header value.
 * @returns JSON string — set directly as the header value.
 */
export function encodeMandateHeader(mandate: PactMandate): string {
  return JSON.stringify(mandate);
}