// Fallback path while POST /v1/invoices is broken (INV-000001 type error).
// Finds the most recent PENDING SKALE invoice, prints paymentAddress, polls until SETTLED.
//
// Run on Hetzner: cd ~/apps/Invoica && npx tsx scripts/skale-poll-existing.ts
// Then send the printed amount in USDC.e on SKALE to the printed paymentAddress.

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing Supabase env');
  process.exit(1);
}

const sb = createClient(url, key);
const POLL_S = Number(process.env.POLL_S || '5');
const TIMEOUT_S = Number(process.env.TIMEOUT_S || '600');

(async () => {
  // Find the most recent PENDING invoice on SKALE.
  const { data, error } = await sb
    .from('Invoice')
    .select('id, invoiceNumber, status, amount, currency, paymentDetails, createdAt')
    .eq('status', 'PENDING')
    .order('createdAt', { ascending: false })
    .limit(20);

  if (error) { console.error(error); process.exit(1); }

  const skaleRows = (data || []).filter((r: any) => {
    const pd = typeof r.paymentDetails === 'string' ? JSON.parse(r.paymentDetails) : r.paymentDetails;
    return pd?.chain === 'skale';
  });

  if (skaleRows.length === 0) {
    console.error('No PENDING SKALE invoices found. Last 20 PENDING:');
    for (const r of data || []) {
      const pd = typeof r.paymentDetails === 'string' ? JSON.parse(r.paymentDetails) : r.paymentDetails;
      console.error(`  ${r.id}  chain=${pd?.chain}  amount=${r.amount} ${r.currency}  created=${r.createdAt}`);
    }
    process.exit(1);
  }

  const target = skaleRows[0];
  const pd = typeof target.paymentDetails === 'string' ? JSON.parse(target.paymentDetails) : target.paymentDetails;
  const payAddr = pd?.paymentAddress;
  const usdc = pd?.usdcAddress;
  const created = new Date(target.createdAt).getTime();

  console.log(`
================================================================
USING EXISTING PENDING SKALE INVOICE
  ID:             ${target.id}
  Number:         ${target.invoiceNumber}
  Amount:         ${target.amount} ${target.currency}
  Chain:          SKALE Base
  USDC contract:  ${usdc}

>>> SEND ${target.amount} USDC.e ON SKALE TO:
    ${payAddr}
================================================================
`);

  const deadline = Date.now() + TIMEOUT_S * 1000;
  let lastStatus = 'PENDING';

  while (Date.now() < deadline) {
    const { data: row } = await sb
      .from('Invoice')
      .select('id, status, paymentDetails')
      .eq('id', target.id)
      .single();

    const status = row?.status as string;
    if (status !== lastStatus) {
      console.log(`[${new Date().toISOString().slice(11, 19)}]  status=${status}`);
      lastStatus = status;
    }

    if (status === 'SETTLED') {
      const settled = Date.now();
      const latency = Math.floor((settled - created) / 1000);
      const pd2 = typeof row?.paymentDetails === 'string' ? JSON.parse(row.paymentDetails) : row?.paymentDetails;

      const out = {
        captured_at_utc: new Date().toISOString(),
        chain: 'skale-base-mainnet',
        invoice_id: target.id,
        invoice_number: target.invoiceNumber,
        amount_usdc: target.amount,
        payment_address: payAddr,
        usdc_contract: usdc,
        status: 'SETTLED',
        tx_hash: pd2?.txHash || null,
        settlement_block_number: pd2?.settlementBlockNumber || null,
        settlement_source: pd2?.settlementSource || null,
        latency_seconds_create_to_settled: latency,
        explorer_tx: pd2?.txHash ? `https://skale-base-explorer.skalenodes.com/tx/${pd2.txHash}` : null,
        method: 'paid-existing-pending-invoice',
        note: 'POST /v1/invoices is broken (INV-000001 type error). Used pre-existing PENDING invoice for happy-path capture.',
      };

      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const outFile = `reports/skale-happy-path-${ts}.json`;
      fs.mkdirSync('reports', { recursive: true });
      fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
      console.log(`
================================================================
SETTLED in ${latency}s
  Tx hash: ${pd2?.txHash}
  Block:   ${pd2?.settlementBlockNumber}
  Source:  ${pd2?.settlementSource}

Capture file: ${outFile}
(paste contents to Quigley)
================================================================
`);
      process.exit(0);
    }

    await new Promise(r => setTimeout(r, POLL_S * 1000));
  }

  console.error(`Timeout after ${TIMEOUT_S}s — last status: ${lastStatus}`);
  process.exit(1);
})();
