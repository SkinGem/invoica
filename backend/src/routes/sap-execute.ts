// sap-execute.ts — SAP merchant endpoint
// Accepts X-Payment headers, verifies Solana escrow, routes capability.
// No auth middleware — escrow payment is the credential.
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const CAPABILITY_PRICES: Record<string, number> = {
  'payment:invoice':  0.01,
  'payment:settle':   0.005,
  'compliance:tax':   0.02,
};

async function verifyEscrow(
  escrowPda: string,
  requiredUsdc: number
): Promise<{ ok: boolean; balance: number; error?: string }> {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const body = JSON.stringify({
    jsonrpc: '2.0', id: 1, method: 'getTokenAccountBalance', params: [escrowPda],
  });
  const resp = await fetch(rpcUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
  });
  const json = await resp.json() as { error?: unknown; result?: { value?: { uiAmount?: string } } };
  if (json.error || !json.result?.value) {
    return { ok: false, balance: 0, error: 'Escrow account not found or invalid' };
  }
  const balance = parseFloat(json.result.value.uiAmount || '0');
  return { ok: balance >= requiredUsdc, balance };
}

function getSb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

router.post('/execute', async (req: Request, res: Response) => {
  // 1. Validate payment headers
  const protocol  = req.headers['x-payment-protocol']  as string | undefined;
  const escrowPda = req.headers['x-payment-escrow-pda'] as string | undefined;
  const depositor = req.headers['x-payment-depositor'] as string | undefined;
  const network   = (req.headers['x-payment-network'] as string | undefined) || 'solana-mainnet';

  if (!protocol || protocol !== 'SAP-x402') {
    res.status(400).json({
      success: false,
      error: { message: 'Missing or invalid X-Payment-Protocol header', code: 'MISSING_PAYMENT_PROTOCOL' },
    });
    return;
  }
  if (!escrowPda) {
    res.status(400).json({
      success: false,
      error: { message: 'Missing X-Payment-Escrow-PDA header', code: 'MISSING_ESCROW_PDA' },
    });
    return;
  }

  // 2. Parse and validate body
  const { capability, params = {} } = req.body as { capability?: string; params?: Record<string, unknown> };
  if (!capability || !CAPABILITY_PRICES[capability]) {
    const valid = Object.keys(CAPABILITY_PRICES).join(', ');
    res.status(400).json({
      success: false,
      error: { message: `Unknown capability: ${capability ?? '(none)'}. Valid: ${valid}`, code: 'UNKNOWN_CAPABILITY' },
    });
    return;
  }

  const requiredUsdc = CAPABILITY_PRICES[capability];

  // 3. Verify Solana escrow balance
  let escrowResult: { ok: boolean; balance: number; error?: string };
  try {
    escrowResult = await verifyEscrow(escrowPda, requiredUsdc);
  } catch {
    res.status(503).json({
      success: false,
      error: { message: 'Escrow verification failed (RPC error)', code: 'ESCROW_RPC_ERROR' },
    });
    return;
  }

  if (!escrowResult.ok) {
    res.status(402).json({
      success: false,
      error: {
        message: `Escrow underfunded. Required: ${requiredUsdc} USDC, found: ${escrowResult.balance} USDC.${escrowResult.error ? ' ' + escrowResult.error : ''}`,
        code: 'PAYMENT_REQUIRED',
      },
      payment: { protocol: 'SAP-x402', requiredUsdc, escrowPda, network },
    });
    return;
  }

  // 4. Route capability
  const sb = getSb();
  let result: unknown;

  try {
    if (capability === 'payment:invoice') {
      const p = params as Record<string, unknown>;
      const { data: invoice, error } = await sb
        .from('Invoice')
        .insert({
          issuer:      p.issuer      || depositor || 'sap-agent',
          recipient:   p.recipient   || '',
          amount:      p.amount      ?? requiredUsdc,
          currency:    p.currency    || 'USDC',
          network,
          status:      'PENDING',
          description: p.description || 'SAP-brokered invoice',
          metadata:    { source: 'sap-execute', escrowPda, depositor },
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      result = invoice;

    } else if (capability === 'payment:settle') {
      const invoiceId = params.invoiceId as string | undefined;
      if (!invoiceId) {
        res.status(400).json({
          success: false,
          error: { message: 'params.invoiceId required for payment:settle', code: 'MISSING_INVOICE_ID' },
        });
        return;
      }
      const { data: invoice, error } = await sb
        .from('Invoice')
        .select('id, status, amount, currency, network, createdAt, updatedAt')
        .eq('id', invoiceId)
        .single();
      if (error || !invoice) {
        res.status(404).json({
          success: false,
          error: { message: `Invoice ${invoiceId} not found`, code: 'INVOICE_NOT_FOUND' },
        });
        return;
      }
      result = invoice;

    } else {
      // compliance:tax — full wiring in later sprint
      result = { status: 'queued', message: 'Tax report will be delivered to your agent wallet' };
    }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[sap-execute] capability error: ${msg}`);
    res.status(500).json({
      success: false,
      error: { message: 'Capability execution failed', code: 'CAPABILITY_ERROR' },
    });
    return;
  }

  // 5. Log escrow for async settlement processing
  console.info(
    `[sap-execute] settled escrow=${escrowPda} depositor=${depositor} capability=${capability} price=${requiredUsdc}`
  );

  res.json({ success: true, capability, result });
});

export default router;
