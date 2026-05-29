// Bypass the broken POST /v1/invoices. Insert a fresh PENDING SKALE invoice
// directly via Supabase service role, then poll until SETTLED.
//
// Run on Hetzner: cd ~/apps/Invoica && npx tsx scripts/skale-direct-create-and-poll.ts [amount=0.10]

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing Supabase env'); process.exit(1); }

const sb = createClient(url, key);
const AMOUNT = Number(process.argv[2] || '0.10');
const POLL_S = Number(process.env.POLL_S || '5');
const TIMEOUT_S = Number(process.env.TIMEOUT_S || '600');

// SKALE Base mainnet — pulled from backend/src/config/chains.ts
const SKALE_USDC = '0x85889c8c714505E0c94b30fcfcF64fE3Ac8FCb20';
const SELLER = process.env.X402_SELLER_WALLET || process.env.SELLER_WALLET;
if (!SELLER) { console.error('Missing X402_SELLER_WALLET env'); process.exit(1); }

(async () => {
  // Compute next invoiceNumber as max + 1, integer.
  const { data: maxData } = await sb
    .from('Invoice')
    .select('invoiceNumber')
    .order('invoiceNumber', { ascending: false })
    .limit(1)
    .single();
  const maxNum = (maxData as any)?.invoiceNumber;
  const nextNumber = (typeof maxNum === 'number' ? maxNum : 0) + 1;
  const now = new Date().toISOString();

  const record = {
    invoiceNumber: nextNumber,
    status: 'PENDING',
    amount: AMOUNT,
    currency: 'USDC',
    customerEmail: 'quigley@helixa.example',
    customerName: 'helixa-pact-validation',
    companyId: null,
    paymentDetails: {
      chain: 'skale',
      paymentAddress: SELLER,
      usdcAddress: SKALE_USDC,
    },
    createdAt: now,
    updatedAt: now,
  };

  const { data: created, error } = await sb
    .from('Invoice')
    .insert(record)
    .select('id, invoiceNumber, amount, paymentDetails, createdAt')
    .single();

  if (error || !created) {
    console.error('Direct insert failed:', error);
    process.exit(1);
  }

  const createdAt = new Date((created as any).createdAt).getTime();

  console.log(`
================================================================
INVOICE CREATED (direct DB, bypassed broken POST)
  ID:             ${(created as any).id}
  Number:         ${(created as any).invoiceNumber}
  Amount:         ${AMOUNT} USDC
  Chain:          SKALE Base
  USDC contract:  ${SKALE_USDC}

>>> SEND ${AMOUNT} USDC.e ON SKALE TO:
    ${SELLER}
================================================================
`);

  const deadline = Date.now() + TIMEOUT_S * 1000;
  let lastStatus = 'PENDING';

  while (Date.now() < deadline) {
    const { data: row } = await sb
      .from('Invoice')
      .select('status, paymentDetails')
      .eq('id', (created as any).id)
      .single();
    const status = (row as any)?.status as string;
    if (status !== lastStatus) {
      console.log(`[${new Date().toISOString().slice(11, 19)}]  status=${status}`);
      lastStatus = status;
    }
    if (status === 'SETTLED') {
      const settled = Date.now();
      const latency = Math.floor((settled - createdAt) / 1000);
      const pd = typeof (row as any).paymentDetails === 'string' ? JSON.parse((row as any).paymentDetails) : (row as any).paymentDetails;
      const out = {
        captured_at_utc: new Date().toISOString(),
        chain: 'skale-base-mainnet',
        invoice_id: (created as any).id,
        invoice_number: (created as any).invoiceNumber,
        amount_usdc: AMOUNT,
        payment_address: SELLER,
        usdc_contract: SKALE_USDC,
        status: 'SETTLED',
        tx_hash: pd?.txHash || null,
        settlement_block_number: pd?.settlementBlockNumber || null,
        settlement_source: pd?.settlementSource || null,
        latency_seconds_create_to_settled: latency,
        explorer_tx: pd?.txHash ? `https://skale-base-explorer.skalenodes.com/tx/${pd.txHash}` : null,
        method: 'direct-db-create (POST /v1/invoices broken with INV-000001 type error)',
      };
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const outFile = `reports/skale-happy-path-${ts}.json`;
      fs.mkdirSync('reports', { recursive: true });
      fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
      console.log(`
================================================================
SETTLED in ${latency}s
  Tx hash: ${pd?.txHash}
  Block:   ${pd?.settlementBlockNumber}
  Source:  ${pd?.settlementSource}

Capture: ${outFile}
================================================================
`);
      process.exit(0);
    }
    await new Promise(r => setTimeout(r, POLL_S * 1000));
  }
  console.error(`Timeout after ${TIMEOUT_S}s — last status: ${lastStatus}`);
  process.exit(1);
})();
