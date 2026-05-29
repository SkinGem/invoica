// Diagnostic: dump top 10 invoices by invoiceNumber DESC.
// Looking for non-integer (string) values that break POST /v1/invoices.
//
// Run on Hetzner: cd ~/apps/Invoica && npx tsx scripts/inspect-invoice-number.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in env');
  process.exit(1);
}

const sb = createClient(url, key);

(async () => {
  const { data, error } = await sb
    .from('Invoice')
    .select('id, invoiceNumber, status, createdAt')
    .order('invoiceNumber', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Query failed:', error);
    process.exit(1);
  }

  console.log('Top 10 invoices by invoiceNumber DESC:');
  console.log('---');
  for (const row of data || []) {
    const type = typeof row.invoiceNumber;
    const value = JSON.stringify(row.invoiceNumber);
    console.log(`  id=${row.id}  invoiceNumber=${value}  (${type})  status=${row.status}  createdAt=${row.createdAt}`);
  }

  const corrupt = (data || []).filter(r => typeof r.invoiceNumber !== 'number');
  if (corrupt.length > 0) {
    console.log('---');
    console.log(`FOUND ${corrupt.length} non-integer invoiceNumber row(s) — these break POST /v1/invoices`);
    console.log('Run: DELETE FROM "Invoice" WHERE id IN (' + corrupt.map(r => `'${r.id}'`).join(', ') + ');');
  }
})();
