// Poll a specific invoice ID until SETTLED. Writes the artifact when it flips.
// Usage: cd ~/apps/Invoica && npx tsx scripts/skale-poll-id.ts <invoice-id>

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const ID = process.argv[2];
if (!ID) { console.error('Usage: npx tsx scripts/skale-poll-id.ts <invoice-id>'); process.exit(1); }

const POLL_S = 5;
const TIMEOUT_S = 600;

(async () => {
  const { data: start } = await sb.from('Invoice').select('id, invoiceNumber, amount, paymentDetails, createdAt').eq('id', ID).single();
  if (!start) { console.error('Invoice not found'); process.exit(1); }
  const created = new Date((start as any).createdAt).getTime();
  const pd0 = typeof (start as any).paymentDetails === 'string' ? JSON.parse((start as any).paymentDetails) : (start as any).paymentDetails;
  console.log(`Polling invoice ${ID} · #${(start as any).invoiceNumber} · ${(start as any).amount} USDC on ${pd0?.chain} → ${pd0?.paymentAddress}`);

  const deadline = Date.now() + TIMEOUT_S * 1000;
  let last = '';
  while (Date.now() < deadline) {
    const { data: row } = await sb.from('Invoice').select('status, paymentDetails').eq('id', ID).single();
    const status = (row as any)?.status as string;
    if (status !== last) { console.log(`[${new Date().toISOString().slice(11, 19)}]  status=${status}`); last = status; }
    if (status === 'SETTLED') {
      const pd = typeof (row as any).paymentDetails === 'string' ? JSON.parse((row as any).paymentDetails) : (row as any).paymentDetails;
      const latency = Math.floor((Date.now() - created) / 1000);
      const out = {
        captured_at_utc: new Date().toISOString(),
        chain: 'skale-base-mainnet',
        invoice_id: ID,
        invoice_number: (start as any).invoiceNumber,
        amount_usdc: (start as any).amount,
        payment_address: pd?.paymentAddress,
        usdc_contract: pd?.usdcAddress,
        status: 'SETTLED',
        tx_hash: pd?.txHash || null,
        settlement_block_number: pd?.settlementBlockNumber || null,
        settlement_source: pd?.settlementSource || null,
        latency_seconds_create_to_settled: latency,
        explorer_tx: pd?.txHash ? `https://skale-base-explorer.skalenodes.com/tx/${pd.txHash}` : null,
      };
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const file = `reports/skale-happy-path-${ts}.json`;
      fs.mkdirSync('reports', { recursive: true });
      fs.writeFileSync(file, JSON.stringify(out, null, 2));
      console.log(`\nSETTLED in ${latency}s · tx ${pd?.txHash} · block ${pd?.settlementBlockNumber}\nCapture: ${file}`);
      process.exit(0);
    }
    await new Promise(r => setTimeout(r, POLL_S * 1000));
  }
  console.error(`Timeout · last=${last}`);
  process.exit(1);
})();
