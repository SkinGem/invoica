// PACT Mandate handler — orchestrates state machine + repo + on-chain
// anchor + webhook dispatch for /v1/mandates routes.
//
// Each public function corresponds to one route action. Each state change:
//   1. Validates the transition via state-machine
//   2. Anchors on Base Sepolia (best-effort; on failure, transition is
//      still persisted so the API stays responsive — anchor can be
//      retried via a separate reconciliation job in v0.2)
//   3. Persists Mandate + MandateTransition rows
//   4. Dispatches a webhook event (fire-and-forget)

import { randomUUID } from 'crypto';
import { nextState, type MandateAction, type MandateState } from './state-machine';
import { computeMandateHash, computeMandateSignature, verifyMandateSignature, type MandateSignable } from './sign';

const CLINPAY_TREASURY_COUNTERPARTY = 'clinpay-treasury';
import { anchorMandateState, type AnchorResult } from './anchor';
import {
  createMandate,
  getMandate,
  updateMandate,
  addTransition,
  listTransitions,
  type MandateRow,
  type MandateTransitionRow,
} from './repo';
import { dispatch } from '../webhook/dispatch';
import { WebhookRepository } from '../webhook/types';
import { createWebhookEvent } from '../webhook/events';
import { prisma } from '../../lib/prisma';

const webhookRepo = new WebhookRepository(prisma);

interface ProposeInput {
  proposer_agent_id: string;
  counterparty_agent_id: string;
  scope: string;
  terms: Record<string, unknown>;
  expires_at: string;
  context?: Record<string, unknown>;
  issuer_customer_id?: string | null;
}

export async function propose(input: ProposeInput): Promise<MandateRow> {
  const id = `mnd_${randomUUID()}`;
  const now = new Date().toISOString();

  const mandate = await createMandate({
    id,
    proposer_agent_id: input.proposer_agent_id,
    counterparty_agent_id: input.counterparty_agent_id,
    scope: input.scope,
    terms: input.terms,
    context: input.context || {},
    state: 'proposed',
    pact_mandate_hash: null,
    pact_version: 'v0.3.2',
    proposer_signature: null,
    counterparty_signature: null,
    signed_by_proposer_at: null,
    signed_by_counterparty_at: null,
    completed_at: null,
    disputed_at: null,
    dispute_reason: null,
    expires_at: input.expires_at,
    drs_receipt_id: null,
    issuer_customer_id: input.issuer_customer_id ?? null,
  });

  await addTransition({
    id: `mtr_${randomUUID()}`,
    mandate_id: id,
    from_state: null,
    to_state: 'proposed',
    triggered_by: input.proposer_agent_id,
    anchor_tx_hash: null,
    anchor_chain: null,
    anchor_block_number: null,
    drs_receipt_id: null,
    metadata: { event: 'created' },
  });

  fireWebhook('mandate.proposed', mandate);
  return mandate;
}

interface SignInput {
  signer: 'proposer' | 'counterparty';
  signature: string;
}

export async function sign(id: string, input: SignInput): Promise<MandateRow> {
  const mandate = await getMandate(id);
  if (!mandate) throw new HttpError(404, 'mandate_not_found', `Mandate ${id} not found`);

  const action: MandateAction = input.signer === 'proposer' ? 'sign_proposer' : 'sign_counterparty';
  const to: MandateState = nextState(mandate.state, action);

  const signable: MandateSignable = {
    id: mandate.id,
    proposer_agent_id: mandate.proposer_agent_id,
    counterparty_agent_id: mandate.counterparty_agent_id,
    scope: mandate.scope,
    terms: mandate.terms,
    expires_at: mandate.expires_at,
  };

  const verify = verifyMandateSignature(signable, input.signature);
  if (!verify.ok) throw new HttpError(403, 'invalid_signature', verify.reason || 'invalid signature');

  const mandateHash = computeMandateHash(signable);
  const anchor = await tryAnchor(mandateHash, to);

  const patch: Partial<MandateRow> = { state: to, pact_mandate_hash: mandateHash };
  const nowIso = new Date().toISOString();
  if (input.signer === 'proposer') {
    patch.proposer_signature = input.signature;
    patch.signed_by_proposer_at = nowIso;
  } else {
    patch.counterparty_signature = input.signature;
    patch.signed_by_counterparty_at = nowIso;
  }

  const updated = await updateMandate(id, patch);
  await recordTransition(id, mandate.state, to, input.signer, anchor);

  fireWebhook(input.signer === 'proposer' ? 'mandate.signed_by_proposer' : 'mandate.signed_by_both', updated);

  // ── Auto-countersign: ClinPay campaign mandates ─────────────────────────
  // For mandates where the counterparty is the ClinPay treasury, the system
  // immediately countersigns on the proposer's behalf so AsterPay's dashboard
  // doesn't need a second human step. Same shared secret → same HMAC.
  if (
    input.signer === 'proposer' &&
    updated.state === 'signed_by_proposer' &&
    mandate.counterparty_agent_id === CLINPAY_TREASURY_COUNTERPARTY
  ) {
    try {
      const treasurySignature = computeMandateSignature(signable);
      return await sign(id, { signer: 'counterparty', signature: treasurySignature });
    } catch (err) {
      console.error(`[mandate] auto-countersign failed for ${id}:`, err);
      // Don't fail the proposer's call — they signed correctly; treasury can retry.
    }
  }

  return updated;
}

export async function complete(id: string, triggeredBy: string): Promise<MandateRow> {
  const mandate = await getMandate(id);
  if (!mandate) throw new HttpError(404, 'mandate_not_found', `Mandate ${id} not found`);

  // Allow complete from signed_by_both via implicit start, or from in_progress directly.
  let intermediate = mandate.state;
  if (mandate.state === 'signed_by_both') {
    const startTo = nextState(mandate.state, 'start');
    const anchorStart = await tryAnchor(mandate.pact_mandate_hash as `0x${string}`, startTo);
    await updateMandate(id, { state: startTo });
    await recordTransition(id, mandate.state, startTo, triggeredBy, anchorStart);
    intermediate = startTo;
  }

  const to = nextState(intermediate, 'complete');
  const anchor = await tryAnchor(mandate.pact_mandate_hash as `0x${string}`, to);
  const updated = await updateMandate(id, { state: to, completed_at: new Date().toISOString() });
  await recordTransition(id, intermediate, to, triggeredBy, anchor);

  fireWebhook('mandate.completed', updated);
  return updated;
}

export async function dispute(id: string, triggeredBy: string, reason: string): Promise<MandateRow> {
  const mandate = await getMandate(id);
  if (!mandate) throw new HttpError(404, 'mandate_not_found', `Mandate ${id} not found`);

  const to = nextState(mandate.state, 'dispute');
  const anchor = mandate.pact_mandate_hash
    ? await tryAnchor(mandate.pact_mandate_hash as `0x${string}`, to)
    : null;

  const updated = await updateMandate(id, {
    state: to,
    disputed_at: new Date().toISOString(),
    dispute_reason: reason,
  });
  await recordTransition(id, mandate.state, to, triggeredBy, anchor, { reason });

  fireWebhook('mandate.disputed', updated);
  return updated;
}

export interface MandateWithTrail extends MandateRow {
  transitions: MandateTransitionRow[];
}

export async function get(id: string): Promise<MandateWithTrail | null> {
  const mandate = await getMandate(id);
  if (!mandate) return null;
  const transitions = await listTransitions(id);
  return { ...mandate, transitions };
}

// ── Helpers ──────────────────────────────────────────────────────────

class HttpError extends Error {
  constructor(public statusCode: number, public code: string, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}
export { HttpError };

async function tryAnchor(hash: `0x${string}` | null, state: MandateState): Promise<AnchorResult | null> {
  if (!hash) return null;
  try {
    return await anchorMandateState(hash, state);
  } catch (err) {
    console.error(`[mandate] anchor failed for state=${state}:`, err);
    return null;
  }
}

async function recordTransition(
  mandateId: string,
  from: MandateState,
  to: MandateState,
  triggeredBy: string,
  anchor: AnchorResult | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await addTransition({
    id: `mtr_${randomUUID()}`,
    mandate_id: mandateId,
    from_state: from,
    to_state: to,
    triggered_by: triggeredBy,
    anchor_tx_hash: anchor?.txHash ?? null,
    anchor_chain: anchor?.chain ?? null,
    anchor_block_number: anchor ? Number(anchor.blockNumber) : null,
    drs_receipt_id: null,
    metadata,
  });
}

function fireWebhook(eventType: string, mandate: MandateRow): void {
  // Fire-and-forget — webhook dispatch errors should not block the API response.
  const event = createWebhookEvent(eventType, mandate);
  dispatch(event, webhookRepo).catch((err) =>
    console.error(`[mandate] webhook dispatch failed for ${eventType}:`, err),
  );
}
