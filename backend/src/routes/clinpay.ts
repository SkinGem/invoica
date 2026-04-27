import express, { Router, Request, Response, NextFunction } from 'express';
import { verifyAsterPayCallback } from '../services/asterpay/verify';
import { createCollectSession } from '../services/asterpay/client';

// Sandbox-only in-memory idempotency. DB-backed before production (Sprint 2).
const SEEN_NONCES = new Map<string, number>();
const NONCE_TTL_MS = 30 * 60 * 1000;

function pruneSeenNonces(now: number = Date.now()): void {
  for (const [n, t] of SEEN_NONCES) {
    if (now - t > NONCE_TTL_MS) SEEN_NONCES.delete(n);
  }
}

// Webhook router — registered BEFORE app.use(express.json()) so raw body is preserved
// for HMAC verification over `${t}.${nonce}.${raw_body}`.
export const clinpayWebhookRouter = Router();

clinpayWebhookRouter.post(
  '/webhooks/asterpay/:studyId',
  express.raw({ type: '*/*', limit: '1mb' }),
  async (req: Request, res: Response, _next: NextFunction) => {
    const signatureHeader = req.headers['x-asterpay-signature'] as string | undefined;
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
    const secret = process.env.ASTERPAY_WEBHOOK_SECRET || '';

    const verify = verifyAsterPayCallback(signatureHeader, rawBody, secret);
    if (!verify.valid) {
      console.warn(`[clinpay] webhook rejected: ${verify.reason}`);
      res.status(401).json({ success: false, error: { message: 'Invalid signature', code: verify.reason || 'INVALID_SIGNATURE' } });
      return;
    }

    pruneSeenNonces();
    if (verify.nonce && SEEN_NONCES.has(verify.nonce)) {
      console.warn(`[clinpay] duplicate nonce, idempotent ack: ${verify.nonce}`);
      res.status(200).json({ success: true, idempotent: true });
      return;
    }
    if (verify.nonce) SEEN_NONCES.set(verify.nonce, verify.timestampMs ?? Date.now());

    let payload: { event?: string; session_id?: string; data?: Record<string, unknown> };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      res.status(400).json({ success: false, error: { message: 'Invalid JSON', code: 'BAD_BODY' } });
      return;
    }

    const studyId = req.params.studyId;
    const event = payload.event || 'unknown';
    const sessionId = payload.session_id;

    // Days 4-7 will fill these branches with PACT verify, invoice issue, DRS mint, AgentTax.
    switch (event) {
      case 'session.submitted':
        console.log(`[clinpay] session.submitted study=${studyId} session=${sessionId}`);
        break;
      case 'session.settled':
        console.log(`[clinpay] session.settled study=${studyId} session=${sessionId}`);
        break;
      case 'session.failed':
        console.warn(`[clinpay] session.failed study=${studyId} session=${sessionId}`);
        break;
      case 'session.expired':
        console.log(`[clinpay] session.expired study=${studyId} session=${sessionId}`);
        break;
      default:
        console.warn(`[clinpay] unknown event '${event}' study=${studyId}`);
    }

    res.status(200).json({ success: true, event, studyId });
  },
);

// Redirect router — registered AFTER app.use(express.json()) so req.body is parsed.
// TODO Sprint 2: add CRO authentication before production (currently public for sandbox).
export const clinpayRouter = Router();

clinpayRouter.post('/api/redirect-to-payment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { visitId, studyId, amountEur, recipientCountry, payoutMethod, description } = req.body || {};
    if (!visitId || !studyId || typeof amountEur !== 'number') {
      res.status(400).json({ success: false, error: { message: 'visitId, studyId, amountEur required', code: 'VALIDATION_ERROR' } });
      return;
    }
    if (amountEur <= 0 || amountEur > 999) {
      res.status(400).json({ success: false, error: { message: 'amountEur must be > 0 and <= 999 (sandbox travel-rule cap)', code: 'VALIDATION_ERROR' } });
      return;
    }

    const callbackBase = process.env.INVOICA_PUBLIC_URL || 'https://api.invoica.ai';
    const callbackUrl = `${callbackBase}/webhooks/asterpay/${encodeURIComponent(String(studyId))}`;

    const session = await createCollectSession({
      sponsor_id: String(studyId),
      sponsor_callback_url: callbackUrl,
      invoica_session_ref: String(visitId),
      recipient_country: typeof recipientCountry === 'string' ? recipientCountry : 'FR',
      amount_eur: amountEur,
      payout_method: payoutMethod === 'wallet' ? 'wallet' : 'sepa',
      description: typeof description === 'string' ? description : `Clinical trial reimbursement — visit ${visitId}`,
    });

    res.json({
      success: true,
      data: {
        hosted_page_url: session.hosted_page_url,
        sessionId: session.session_id,
        token: session.token,
        expiresAt: session.expires_at,
      },
    });
  } catch (err) {
    next(err);
  }
});
