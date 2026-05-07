// x402-invoice.ts — standard x402 v2 endpoints via PayAI facilitator.
// Pay.sh probes this. /api/sap/execute is the legacy custom protocol.
// Public route: payment IS the credential — never put behind authenticate.
import { Router, Request, Response } from 'express';
import { X402PaymentHandler } from 'x402-solana';
import { calculateAgentTax, resolveTransactionType } from '../services/tax/agenttax-client';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const USDC_MAINNET = {
  address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  decimals: 6,
};

const PRICES_USDC: Record<string, string> = {
  invoice: '10000',  // 0.01 USDC
  settle:  '5000',   // 0.005 USDC
  tax:     '20000',  // 0.02 USDC
};

let _handler: X402PaymentHandler | null = null;
function getHandler(): X402PaymentHandler {
  if (_handler) return _handler;
  const treasury = process.env.X402_SOLANA_SELLER_WALLET;
  if (!treasury) throw new Error('X402_SOLANA_SELLER_WALLET not set');
  _handler = new X402PaymentHandler({
    network: 'solana',
    treasuryAddress: treasury,
    facilitatorUrl: process.env.PAYAI_FACILITATOR_URL || 'https://facilitator.payai.network',
    apiKeyId: process.env.PAYAI_API_KEY_ID,
    apiKeySecret: process.env.PAYAI_API_KEY_SECRET,
    defaultToken: USDC_MAINNET,
    defaultDescription: 'Invoica x402 capability',
    defaultTimeoutSeconds: 60,
  });
  return _handler;
}

function getSb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

type Capability = 'invoice' | 'settle' | 'tax';

async function handleCapability(
  capability: Capability,
  body: Record<string, unknown>,
  payerHint: string,
): Promise<unknown> {
  const sb = getSb();

  if (capability === 'invoice') {
    const amount = typeof body.amount === 'number' ? body.amount : 0.01;
    const invoiceNumber = Math.floor(Date.now() / 1000);
    const { data, error } = await sb
      .from('Invoice')
      .insert({
        invoiceNumber,
        sellerName:         (body.issuer as string)    || payerHint,
        customerName:       (body.recipient as string) || '',
        customerEmail:      (body.email as string)     || `${payerHint}@x402.invoica.ai`,
        amount,
        subtotal:           amount,
        total:              amount,
        currency:           (body.currency as string)  || 'USDC',
        status:             'PENDING',
        serviceDescription: (body.description as string) || 'x402 capability invoice',
        paymentDetails:     { source: 'x402-invoice', payer: payerHint, network: 'solana-mainnet' },
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  if (capability === 'settle') {
    const invoiceId = body.invoiceId as string | undefined;
    if (!invoiceId) throw new Error('body.invoiceId required for settle');
    const { data, error } = await sb
      .from('Invoice')
      .select('id, status, amount, currency, network, createdAt, updatedAt')
      .eq('id', invoiceId)
      .single();
    if (error || !data) throw new Error(`Invoice ${invoiceId} not found`);
    return data;
  }

  // tax
  const buyerState = typeof body.buyer_state === 'string' ? body.buyer_state.trim().toUpperCase() : '';
  if (!buyerState) throw new Error('body.buyer_state required for tax');
  const amount = typeof body.amount === 'number' ? body.amount : 0.02;
  const txType = resolveTransactionType(typeof body.transaction_type === 'string' ? body.transaction_type : undefined);
  const taxLine = await calculateAgentTax({
    role: 'seller',
    amount,
    buyer_state: buyerState,
    transaction_type: txType,
    counterparty_id: payerHint,
    is_b2b: true,
  });
  if (!taxLine) throw new Error('Tax engine unavailable (set AGENTTAX_API_KEY)');
  return taxLine;
}

function makeRoute(capability: Capability, descriptionSuffix: string) {
  return async (req: Request, res: Response): Promise<void> => {
    const handler = getHandler();
    const resourceUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const requirements = await handler.createPaymentRequirements(
      {
        amount: PRICES_USDC[capability],
        asset: USDC_MAINNET,
        description: `Invoica ${capability} — ${descriptionSuffix}`,
      },
      resourceUrl,
    );

    const paymentHeader = handler.extractPayment(req.headers as Record<string, string | string[] | undefined>);
    if (!paymentHeader) {
      const challenge = handler.create402Response(requirements, resourceUrl);
      res.status(challenge.status).json(challenge.body);
      return;
    }

    const verify = await handler.verifyPayment(paymentHeader, requirements);
    if (!verify.isValid) {
      res.status(402).json({
        x402Version: 2,
        error: { code: 'PAYMENT_INVALID', message: verify.invalidReason || 'Payment verification failed' },
        accepts: [requirements],
      });
      return;
    }

    let result: unknown;
    try {
      result = await handleCapability(capability, (req.body as Record<string, unknown>) || {}, 'x402-payer');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      res.status(400).json({ success: false, error: { message: msg, code: 'CAPABILITY_ERROR' } });
      return;
    }

    const settle = await handler.settlePayment(paymentHeader, requirements);
    if (!settle.success) {
      res.status(502).json({
        success: false,
        error: { message: settle.errorReason || 'Settlement failed', code: 'SETTLEMENT_FAILED' },
        result,
      });
      return;
    }

    if (settle.transaction) {
      res.setHeader(
        'X-PAYMENT-RESPONSE',
        Buffer.from(JSON.stringify({ success: true, transaction: settle.transaction, network: settle.network })).toString('base64'),
      );
    }
    res.json({ success: true, capability, result });
  };
}

router.post('/invoice', makeRoute('invoice', 'create x402 invoice ($0.01)'));
router.post('/settle',  makeRoute('settle',  'check settlement state ($0.005)'));
router.post('/tax',     makeRoute('tax',     'tax classification line ($0.02)'));

export default router;
