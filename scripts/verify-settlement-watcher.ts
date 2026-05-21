// End-to-end verification of the settlement watcher auto-settle path,
// without requiring a real on-chain USDC transfer.
//
// 1. Create a fresh PENDING SKALE invoice with a unique amount
// 2. Synthesize a SettlementMatch (as if observed by EvmSettlementDetector)
// 3. Invoke autoSettleFromTransfer() — the same code the watcher calls
// 4. Verify status flips PENDING → SETTLED in the DB
// 5. Verify PaymentEvents row created with source='evm-detector'
//
// If this passes, the integration is proven end-to-end except for the RPC
// scan step itself — which has been running 3.5k cycles in production
// without errors on base/arbitrum/skale (verified separately via logs).

import 'dotenv/config';
import { autoSettleFromTransfer } from '../backend/src/services/settlement/auto-settle';
import type { SettlementMatch } from '../backend/src/services/settlement/evm-detector';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const API_URL = process.env.API_URL || 'https://api.invoica.ai';
const KEY = process.env.INVOICA_KEY;
if (!KEY) throw new Error('INVOICA_KEY required');

const SELLER_WALLET = process.env.X402_SELLER_WALLET || '0x3e127c918C83714616CF2416f8A620F1340C19f1';

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function main() {
  console.log('=== Settlement watcher verification ===\n');

  // Unique amount avoids matching any other PENDING invoice on the same chain.
  const uniqueAmount = Number((0.10 + Math.random() * 0.01).toFixed(6));

  // Step 1 — create PENDING invoice
  console.log(`[1] creating PENDING SKALE invoice for ${uniqueAmount} USDC...`);
  const createRes = await fetch(`${API_URL}/v1/invoices`, {
    method: 'POST',
    headers: { 'x-api-key': KEY!, 'content-type': 'application/json' },
    body: JSON.stringify({
      amount: uniqueAmount,
      currency: 'USDC',
      customerEmail: 'watcher-verification@invoica.ai',
      customerName: 'Watcher verification test',
      chain: 'skale',
    }),
  });
  if (!createRes.ok) throw new Error(`POST /v1/invoices failed ${createRes.status}: ${await createRes.text()}`);
  const created: any = await createRes.json();
  const invoiceId = created.data.id;
  const invoiceNumber = created.data.invoiceNumber;
  const paymentAddress = created.data.paymentDetails.paymentAddress;
  console.log(`    ✓ created ${invoiceId} (#${invoiceNumber}), paymentAddress=${paymentAddress}\n`);

  // Step 2 — synthesize a SettlementMatch as if the watcher observed an
  // on-chain transfer to the seller wallet for exactly this amount.
  const fakeTxHash = '0x' + crypto.randomBytes(32).toString('hex');
  const transfer: SettlementMatch = {
    invoiceId: '',
    txHash: fakeTxHash,
    amount: uniqueAmount,
    from: '0x' + '11'.repeat(20),
    to: paymentAddress || SELLER_WALLET,
    blockNumber: 1_900_000,
    timestamp: Math.floor(Date.now() / 1000),
    chain: 'skale',
  };
  console.log(`[2] synthesizing SettlementMatch · txHash=${fakeTxHash.slice(0, 18)}…\n`);

  // Step 3 — invoke the same code path the watcher calls.
  console.log('[3] invoking autoSettleFromTransfer()...');
  const result = await autoSettleFromTransfer(transfer);
  console.log(`    result: ${JSON.stringify(result, null, 2)}\n`);
  if (!result.matched) {
    console.error(`    ✗ FAIL — auto-settle did not match. reason: ${result.reason}`);
    process.exit(1);
  }
  if (result.invoiceId !== invoiceId) {
    console.error(`    ✗ FAIL — matched wrong invoice. got=${result.invoiceId} expected=${invoiceId}`);
    process.exit(1);
  }
  console.log(`    ✓ matched invoice #${result.invoiceNumber}\n`);

  // Step 4 — verify DB state.
  console.log('[4] verifying DB state...');
  const { data: inv, error: invErr } = await sb()
    .from('Invoice')
    .select('id, status, "settledAt", "paymentDetails"')
    .eq('id', invoiceId)
    .single();
  if (invErr || !inv) {
    console.error(`    ✗ FAIL — could not refetch invoice: ${invErr?.message}`);
    process.exit(1);
  }
  console.log(`    invoice.status=${inv.status}, settledAt=${inv.settledAt}`);
  console.log(`    paymentDetails.txHash=${inv.paymentDetails?.txHash}`);
  console.log(`    paymentDetails.settlementSource=${inv.paymentDetails?.settlementSource}`);
  if (inv.status !== 'SETTLED') {
    console.error(`    ✗ FAIL — status is ${inv.status}, expected SETTLED`);
    process.exit(1);
  }
  if (inv.paymentDetails?.txHash !== fakeTxHash) {
    console.error(`    ✗ FAIL — paymentDetails.txHash mismatch`);
    process.exit(1);
  }
  if (inv.paymentDetails?.settlementSource !== 'evm-detector') {
    console.error(`    ✗ FAIL — settlementSource=${inv.paymentDetails?.settlementSource} (expected evm-detector)`);
    process.exit(1);
  }
  console.log('    ✓ invoice fully transitioned\n');

  // Step 5 — verify PaymentEvents row.
  const { data: events, error: peErr } = await sb()
    .from('PaymentEvents')
    .select('"invoiceId", chain, "txHash", "amountUsdc", source')
    .eq('txHash', fakeTxHash);
  if (peErr) {
    console.error(`    ✗ FAIL — could not query PaymentEvents: ${peErr.message}`);
    process.exit(1);
  }
  console.log(`[5] PaymentEvents rows for this tx: ${events?.length}`);
  if (!events || events.length !== 1) {
    console.error(`    ✗ FAIL — expected exactly 1 PaymentEvents row`);
    process.exit(1);
  }
  const ev: any = events[0];
  if (ev.source !== 'evm-detector') {
    console.error(`    ✗ FAIL — PaymentEvents.source=${ev.source} (expected evm-detector)`);
    process.exit(1);
  }
  console.log(`    ✓ source=evm-detector, amount=${ev.amountUsdc}, chain=${ev.chain}\n`);

  console.log('=== PASS ===');
  console.log(`Test invoice left in DB for inspection: ${invoiceId} (#${invoiceNumber})`);
}

main().catch(err => {
  console.error('=== FAIL ===');
  console.error(err);
  process.exit(1);
});
