import { createHmac, randomUUID } from 'node:crypto';

// Sandbox-only synthetic PACT mandate generator.
// Real mandates come from the sponsor (CRO) in production, signed with their key.
// Sandbox loops back: Invoica self-issues using PACT_SIGNING_SECRET so the
// verify path is exercised end-to-end on session.submitted webhooks.

export interface SyntheticMandate {
  id: string;
  grantor: string;
  grantee: string;
  scope: {
    actions: string[];
    resources: string[];
    maxPaymentUsdc: number;
    description: string;
  };
  expiresAt: string;
  issuedAt: string;
  signature: string;
}

function mandateSignature(m: Omit<SyntheticMandate, 'signature'>, secret: string): string {
  const signable = JSON.stringify({
    id: m.id,
    grantor: m.grantor,
    grantee: m.grantee,
    scope: m.scope,
    expiresAt: m.expiresAt,
    issuedAt: m.issuedAt,
  });
  return createHmac('sha256', secret).update(signable).digest('hex');
}

export function synthesizeSponsorMandate(
  studyId: string,
  amountUsdc: number,
  expiresAtIso: string,
): SyntheticMandate {
  const secret = process.env.PACT_SIGNING_SECRET || '';
  if (!secret) {
    throw new Error('PACT_SIGNING_SECRET not configured — cannot synthesize sandbox mandate');
  }
  const base = {
    id: `mandate-${randomUUID()}`,
    grantor: `clinpay-sponsor-${studyId}`,
    grantee: 'invoica-clinpay',
    scope: {
      actions: ['clinpay:settle'],
      resources: [`clinpay/${studyId}/*`],
      maxPaymentUsdc: amountUsdc,
      description: `ClinPay sandbox mandate — study ${studyId}`,
    },
    expiresAt: expiresAtIso,
    issuedAt: new Date().toISOString(),
  };
  const signature = mandateSignature(base, secret);
  return { ...base, signature };
}

export function hashMandate(m: SyntheticMandate): string {
  return m.signature.slice(0, 16);
}
