// PACT Mandate API v0.1 — 5 endpoints for the generic mandate surface.
// Sixth endpoint (webhook register) reuses existing /v1/webhooks routes.
//
// All routes mounted behind `authenticate` middleware (x-api-key auth).
// `context` body field is opaque per-partner metadata
// (e.g. {source: "helixa_synagent_tg_bot", chat_id: "..."}).

import { Router, Request, Response, NextFunction } from 'express';
import * as mandate from '../services/mandate/handler';

const router = Router();

function err(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ success: false, error: { code, message } });
}

/**
 * POST /v1/mandates
 * Create a new mandate proposal.
 *
 * Body: {
 *   proposer:     string (agent or human id),
 *   counterparty: string (agent or human id),
 *   scope:        string (natural-language description),
 *   terms:        object (free-form per spec),
 *   expiry:       string (ISO 8601),
 *   context?:     object (partner metadata)
 * }
 */
router.post('/v1/mandates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { proposer, counterparty, scope, terms, expiry, context } = req.body;

    if (!proposer || typeof proposer !== 'string') return err(res, 400, 'missing_field', 'proposer is required');
    if (!counterparty || typeof counterparty !== 'string') return err(res, 400, 'missing_field', 'counterparty is required');
    if (!scope || typeof scope !== 'string') return err(res, 400, 'missing_field', 'scope is required');
    if (!terms || typeof terms !== 'object') return err(res, 400, 'missing_field', 'terms must be an object');
    if (!expiry || typeof expiry !== 'string') return err(res, 400, 'missing_field', 'expiry is required (ISO 8601)');
    if (isNaN(new Date(expiry).getTime())) return err(res, 400, 'invalid_field', 'expiry must be a valid ISO 8601 timestamp');

    const created = await mandate.propose({
      proposer_agent_id: proposer,
      counterparty_agent_id: counterparty,
      scope,
      terms,
      expires_at: expiry,
      context: context || undefined,
      issuer_customer_id: (req as any).customer?.id ?? null,
    });

    res.status(201).json({
      success: true,
      data: {
        mandate_id: created.id,
        status: created.state,
        proposer_signature_required: true,
      },
    });
  } catch (e) { next(e); }
});

/**
 * POST /v1/mandates/:id/sign
 * Sign a mandate (proposer first, then counterparty).
 *
 * Body: { signer: 'proposer'|'counterparty', signature: string }
 * Response: { mandate_id, status, drs_receipt_id }
 */
router.post('/v1/mandates/:id/sign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { signer, signature } = req.body;
    if (signer !== 'proposer' && signer !== 'counterparty') {
      return err(res, 400, 'invalid_signer', 'signer must be "proposer" or "counterparty"');
    }
    if (!signature || typeof signature !== 'string') {
      return err(res, 400, 'missing_signature', 'signature is required (hex HMAC-SHA256)');
    }

    const updated = await mandate.sign(String(req.params.id), { signer, signature });

    res.json({
      success: true,
      data: {
        mandate_id: updated.id,
        status: updated.state,
        drs_receipt_id: updated.drs_receipt_id,
      },
    });
  } catch (e) { handleMandateError(res, next, e); }
});

/**
 * GET /v1/mandates/:id
 * Fetch mandate state and full transition trail.
 */
router.get('/v1/mandates/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await mandate.get(String(req.params.id));
    if (!result) return err(res, 404, 'not_found', `Mandate ${String(req.params.id)} not found`);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

/**
 * POST /v1/mandates/:id/complete
 * Mark mandate as completed. Implicitly advances signed_by_both → in_progress
 * first if needed. Emits final DRS receipt event.
 *
 * Body: { triggered_by?: string }
 */
router.post('/v1/mandates/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const triggeredBy = (req.body?.triggered_by as string) || 'system';
    const updated = await mandate.complete(String(req.params.id), triggeredBy);
    res.json({
      success: true,
      data: { mandate_id: updated.id, status: updated.state, completed_at: updated.completed_at },
    });
  } catch (e) { handleMandateError(res, next, e); }
});

/**
 * POST /v1/mandates/:id/dispute
 * Flag a mandate as disputed. Pauses any further state changes (terminal).
 *
 * Body: { triggered_by?: string, reason: string }
 */
router.post('/v1/mandates/:id/dispute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    if (!reason || typeof reason !== 'string') return err(res, 400, 'missing_reason', 'reason is required');
    const triggeredBy = (req.body?.triggered_by as string) || 'system';
    const updated = await mandate.dispute(String(req.params.id), triggeredBy, reason);
    res.json({
      success: true,
      data: { mandate_id: updated.id, status: updated.state, disputed_at: updated.disputed_at, reason: updated.dispute_reason },
    });
  } catch (e) { handleMandateError(res, next, e); }
});

function handleMandateError(res: Response, next: NextFunction, e: unknown): void {
  if (e instanceof mandate.HttpError) {
    err(res, e.statusCode, e.code, e.message);
    return;
  }
  if (e instanceof Error && e.message.startsWith('Invalid PACT mandate transition')) {
    err(res, 409, 'invalid_transition', e.message);
    return;
  }
  next(e);
}

export default router;
