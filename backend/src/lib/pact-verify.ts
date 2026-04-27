/**
 * pact-verify.ts — Inline PACT v0.2 mandate verification
 * Inlines the minimal HMAC-SHA256 subset needed for invoice payment gating.
 *
 * Hardened per TICKET-044 (AsterPay smoke audit, Apr 14 2026):
 *   Fix 1 (P0) — fail-closed on missing PACT_SIGNING_SECRET when a mandate is present
 *   Fix 4 (P0) — require maxPaymentUsdc + expiresAt in mandate (no blank cheques)
 *   Fix 5 (P2) — crypto.timingSafeEqual for HMAC comparison
 *
 * Usage: verifyPactMandate(header, amountUsdc) → { allowed: boolean; reason?: string }
 * Env:   PACT_SIGNING_SECRET — shared secret between grantor agent and Invoica
 */
import * as crypto from 'crypto';

const PACT_SIGNING_SECRET = process.env.PACT_SIGNING_SECRET || '';

interface MandateScope {
  actions?: string[];
  resources?: string[];
  maxPaymentUsdc: number;
  description?: string;
}

interface PactMandate {
  id: string;
  grantor: string;
  grantee: string;
  scope: MandateScope;
  expiresAt: string;
  issuedAt: string;
  signature: string;
}

function hmacSha256(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
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
 *
 * - No mandate header → allowed (mandates remain optional on this endpoint)
 * - Mandate present + secret unset → denied (fail-closed on misconfig)
 * - Mandate present + secret set → verify schema, expiry, signature, cap
 */
export function verifyPactMandate(
  mandateHeader: string | undefined,
  amountUsdc: number
): { allowed: boolean; reason?: string } {
  if (!mandateHeader) return { allowed: true };

  if (!PACT_SIGNING_SECRET) {
    return { allowed: false, reason: 'PACT_SIGNING_SECRET not configured' };
  }

  let mandate: PactMandate;
  try {
    mandate = JSON.parse(mandateHeader) as PactMandate;
  } catch {
    return { allowed: false, reason: 'Invalid mandate JSON' };
  }

  if (!mandate.expiresAt) {
    return { allowed: false, reason: 'Mandate missing expiresAt' };
  }
  if (typeof mandate.scope?.maxPaymentUsdc !== 'number' || !(mandate.scope.maxPaymentUsdc > 0)) {
    return { allowed: false, reason: 'Mandate missing or non-positive maxPaymentUsdc' };
  }

  if (new Date(mandate.expiresAt) < new Date()) {
    return { allowed: false, reason: 'Mandate expired' };
  }

  const expected = mandateSignature(mandate);
  if (!timingSafeStringEqual(expected, mandate.signature)) {
    return { allowed: false, reason: 'Invalid mandate signature' };
  }

  if (mandate.scope.maxPaymentUsdc < amountUsdc) {
    return { allowed: false, reason: `Mandate cap ${mandate.scope.maxPaymentUsdc} USDC < invoice ${amountUsdc} USDC` };
  }

  return { allowed: true };
}