// Public DRS anchoring endpoint for ClinPay partners (primarily AsterPay).
// Spec: docs/integrations/asterpay-clinpay-spec.md §3.

import { Router, Request, Response, NextFunction } from 'express';
import { anchorExternalDrsReceipt, DrsAnchorError, type ExternalDrsAnchorInput } from '../services/clinpay/drs-anchor-external';

const router = Router();

function err(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ success: false, error: { code, message } });
}

/**
 * POST /v1/clinpay/drs/anchor
 * Body: see ExternalDrsAnchorInput.
 * Returns 201 with { receipt_id, mandate_hash, anchor_*, pact_version }.
 */
router.post('/v1/clinpay/drs/anchor', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = req.body as Partial<ExternalDrsAnchorInput>;

    // Required-field validation
    const required: Array<keyof ExternalDrsAnchorInput> = [
      'mandate_id', 'campaign_id', 'panellist_id_hash', 'visit_id', 'study_id',
      'amount_eur', 'amount_usdc', 'settlement',
    ];
    for (const field of required) {
      if (b[field] === undefined || b[field] === null) {
        return err(res, 400, 'missing_field', `${field} is required`);
      }
    }
    if (typeof b.amount_eur !== 'number' || b.amount_eur <= 0) return err(res, 400, 'invalid_field', 'amount_eur must be positive number');
    if (typeof b.amount_usdc !== 'number' || b.amount_usdc <= 0) return err(res, 400, 'invalid_field', 'amount_usdc must be positive number');
    if (typeof b.settlement !== 'object' || !b.settlement.rail || !b.settlement.settled_at) {
      return err(res, 400, 'invalid_settlement', 'settlement.rail and settlement.settled_at are required');
    }

    const result = await anchorExternalDrsReceipt(b as ExternalDrsAnchorInput);

    res.status(201).json({ success: true, data: result });
  } catch (e) {
    if (e instanceof DrsAnchorError) {
      return err(res, e.statusCode, e.code, e.message);
    }
    next(e);
  }
});

export default router;
