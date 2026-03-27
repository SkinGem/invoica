/**
 * pact-verify.ts — Inline PACT v0.2 mandate verification
 * Does NOT import @godman-protocols/pact (not on npm — server cannot install it).
 * Inlines the minimal HMAC-SHA256 subset needed for invoice payment gating.
 *
 * Usage: verifyPactMandate(header, amountUsdc) → { allowed: boolean; reason?: string }
 * Env:   PACT_SIGNING_SECRET — shared secret between grantor agent and Invoica
 */
import * as crypto from 'crypto';

const PACT_SIGNING_SECRET = process.env.PACT_SIGNING_SECRET || '';

interface MandateScope {
  actions?: string[];
  resources?: string[];
  maxPaymentUsdc?: number;
  description?: string;
}

interface PactMandate {
  id: string;
  grantor: string;
  grantee: string;
  scope: MandateScope;
  expiresAt?: string;
  issuedAt: string;
  signature: string;
}

function hmacSha256(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function mandateSignature(m: PactMandate): string {
  const signable = JSON.stringify({
    id: m.id,
    grantor: m.grantor,
    grantee: m.grantee,
    scope: m.scope,
    expiresAt: m.expiresAt,
    issuedAt: m.issuedAt,
  });
  return hmacSha256(signable, PACT_SIGNING_SECRET);
}

/**
 * Verify a PACT mandate from an X-Pact-Mandate request header.
 * Returns { allowed: true } if no header (mandate is optional — backward compatible).
 * Returns { allowed: false, reason } if mandate is present but invalid.
 */
export function verifyPactMandate(
  mandateHeader: string | undefined,
  amountUsdc: number
): { allowed: boolean; reason?: string } {
  if (!mandateHeader) return { allowed: true };
  if (!PACT_SIGNING_SECRET) {
    console.warn('[pact-verify] PACT_SIGNING_SECRET not set — skipping check');
    return { allowed: true };
  }
  let mandate: PactMandate;
  try {
    mandate = JSON.parse(mandateHeader) as PactMandate;
  } catch {
    return { allowed: false, reason: 'Invalid mandate JSON' };
  }
  if (mandate.expiresAt && new Date(mandate.expiresAt) < new Date()) {
    return { allowed: false, reason: 'Mandate expired' };
  }
  const expected = mandateSignature(mandate);
  if (expected !== mandate.signature) {
    return { allowed: false, reason: 'Invalid mandate signature' };
  }
  const cap = mandate.scope?.maxPaymentUsdc;
  if (cap !== undefined && cap < amountUsdc) {
    return { allowed: false, reason: `Mandate cap ${cap} USDC < invoice ${amountUsdc} USDC` };
  }
  return { allowed: true };
}