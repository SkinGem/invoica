import express, { Router, Request, Response, NextFunction } from 'express';
import { verifyAsterPayCallback } from '../services/asterpay/verify';
import { createCollectSession, settleCollectSession } from '../services/asterpay/client';
import { synthesizeSponsorMandate } from '../services/asterpay/mandate';
import {
  createClinPaySession,
  findByAsterPaySessionId,
  updateSessionStatus,
  createClinPayInvoice,
} from '../services/asterpay/clinpay-session';
import { verifyPactMandate } from '../lib/pact-verify';

// Sandbox-only in-memory idempotency. DB-backed before production (Sprint 2).
const SEEN_NONCES = new Map<string, number>();
const NONCE_TTL_MS = 30 * 60 * 1000;

function pruneSeenNonces(now: number = Date.now()): void {
  for (const [n, t] of SEEN_NONCES) {
    if (now - t > NONCE_TTL_MS) SEEN_NONCES.delete(n);
  }
}

// Sandbox 1:1 EUR -> USDC. Replace with real FX before Sprint 2 production.
function eurToUsdc(amountEur: number): number {
  return amountEur;
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

    const studyId = String(req.params.studyId);
    const event = payload.event || 'unknown';
    const asterpaySessionId = payload.session_id;

    if (!asterpaySessionId) {
      console.warn(`[clinpay] webhook missing session_id event=${event}`);
      res.status(200).json({ success: true, ignored: 'missing_session_id' });
      return;
    }

    try {
      switch (event) {
        case 'session.submitted':
          await handleSessionSubmitted(asterpaySessionId, studyId, payload);
          break;
        case 'session.settled':
          await handleSessionSettled(asterpaySessionId, payload);
          break;
        case 'session.failed':
          await handleSessionFailed(asterpaySessionId, payload);
          break;
        case 'session.expired':
          await handleSessionExpired(asterpaySessionId, payload);
          break;
        default:
          console.warn(`[clinpay] unknown event '${event}' study=${studyId}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[clinpay] handler ${event} failed: ${msg}`);
      // Always 200 the webhook so AsterPay doesn't retry on our internal errors;
      // surface failures via ClinPaySession.status='failed' + last_event.
      res.status(200).json({ success: false, error: msg });
      return;
    }

    res.status(200).json({ success: true, event, studyId });
  },
);

async function handleSessionSubmitted(
  asterpaySessionId: string,
  studyId: string,
  payload: { session_id?: string; data?: Record<string, unknown> },
): Promise<void> {
  const session = await findByAsterPaySessionId(asterpaySessionId);
  if (!session) {
    console.warn(`[clinpay] session.submitted: no ClinPaySession for asterpay=${asterpaySessionId}`);
    return;
  }
  if (session.study_id !== studyId) {
    console.warn(`[clinpay] session.submitted: studyId mismatch path=${studyId} stored=${session.study_id}`);
    return;
  }

  const pact = verifyPactMandate(session.mandate_json, session.amount_usdc);
  if (!pact.allowed) {
    console.error(`[clinpay] PACT mandate denied for asterpay=${asterpaySessionId}: ${pact.reason}`);
    await updateSessionStatus(session.id, 'failed', { last_event: { event: 'session.submitted', error: pact.reason } });
    return;
  }

  const invoice = await createClinPayInvoice({
    asterpay_session_id: asterpaySessionId,
    study_id: session.study_id,
    visit_id: session.visit_id,
    amount_usdc: session.amount_usdc,
    mandate_hash: session.mandate_hash,
  });
  console.log(`[clinpay] invoice issued #${invoice.invoiceNumber} (${invoice.id}) for asterpay=${asterpaySessionId}`);

  // Persist session state immediately so a settle failure doesn't orphan the invoice.
  await updateSessionStatus(session.id, 'submitted', {
    invoice_id: invoice.id,
    last_event: { event: 'session.submitted', invoice_number: invoice.invoiceNumber, ...payload },
  });

  // Best-effort settle. /v1/collect/settle is x402-paywalled ($0.10 USDC sandbox);
  // x402 client integration is Sprint 2 scope. For now, attempt and capture the
  // outcome without bubbling up failure.
  try {
    const settle = await settleCollectSession({
      session_id: asterpaySessionId,
      amount_usdc: session.amount_usdc,
      mandate_hash: session.mandate_hash,
      reference: session.visit_id,
    });
    console.log(`[clinpay] settle response status=${settle.status} ref=${settle.provider_ref}`);
    await updateSessionStatus(session.id, 'submitted', {
      last_event: { event: 'settle_ok', settle_status: settle.status, provider_ref: settle.provider_ref },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const x402Gated = msg.includes('402');
    console.warn(`[clinpay] settle ${x402Gated ? '402-gated (x402 client TBD Sprint 2)' : 'failed'}: ${msg.slice(0, 200)}`);
    await updateSessionStatus(session.id, 'submitted', {
      last_event: { event: 'settle_deferred', x402_gated: x402Gated, error: msg.slice(0, 500) },
    });
  }
}

async function handleSessionSettled(
  asterpaySessionId: string,
  payload: { data?: Record<string, unknown> },
): Promise<void> {
  // Day 6-7 will mint DRS receipt + AgentTax recordTax here. For now, just persist.
  const session = await findByAsterPaySessionId(asterpaySessionId);
  if (!session) return;
  await updateSessionStatus(session.id, 'settled', { last_event: { event: 'session.settled', ...payload } });
  console.log(`[clinpay] session.settled persisted asterpay=${asterpaySessionId}`);
}

async function handleSessionFailed(
  asterpaySessionId: string,
  payload: { data?: Record<string, unknown> },
): Promise<void> {
  const session = await findByAsterPaySessionId(asterpaySessionId);
  if (!session) return;
  await updateSessionStatus(session.id, 'failed', { last_event: { event: 'session.failed', ...payload } });
  console.warn(`[clinpay] session.failed persisted asterpay=${asterpaySessionId}`);
}

async function handleSessionExpired(
  asterpaySessionId: string,
  payload: { data?: Record<string, unknown> },
): Promise<void> {
  const session = await findByAsterPaySessionId(asterpaySessionId);
  if (!session) return;
  await updateSessionStatus(session.id, 'expired', { last_event: { event: 'session.expired', ...payload } });
}

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

    const amountUsdc = eurToUsdc(amountEur);
    const mandate = synthesizeSponsorMandate(String(studyId), amountUsdc, session.expires_at);

    await createClinPaySession({
      asterpay_session_id: session.session_id,
      study_id: String(studyId),
      visit_id: String(visitId),
      amount_eur: amountEur,
      amount_usdc: amountUsdc,
      recipient_country: typeof recipientCountry === 'string' ? recipientCountry : 'FR',
      payout_method: payoutMethod === 'wallet' ? 'wallet' : 'sepa',
      mandate,
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
