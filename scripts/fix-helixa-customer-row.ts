// Hot-fix: backfill the missing Customer row for helixa-synagent-beta.
// The Mandate FK Mandate_issuer_customer_id_fkey requires Customer(id) to exist.
// api-keys persist had failed when Quigley's creds were minted on 2026-05-19,
// so the Customer row was never created — blocking POST /v1/mandates.
//
// Run on Hetzner: cd ~/apps/Invoica && npx tsx scripts/fix-helixa-customer-row.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const CUSTOMER_ID = 'helixa-synagent-beta';

(async () => {
  // 1. Check if Customer row already exists.
  const { data: existing } = await sb.from('Customer').select('id, email, created_at').eq('id', CUSTOMER_ID).maybeSingle();
  if (existing) {
    console.log(`✓ Customer "${CUSTOMER_ID}" already exists — no fix needed.`);
    console.log(existing);
    process.exit(0);
  }

  // 2. Find the email from the ApiKey row (mirrors what migration 012's backfill does).
  const { data: apiKey } = await sb
    .from('ApiKey')
    .select('customerId, customerEmail, createdAt')
    .eq('customerId', CUSTOMER_ID)
    .order('createdAt', { ascending: false })
    .limit(1)
    .maybeSingle();

  const email = apiKey?.customerEmail || 'quigley@helixa.example';
  console.log(`Inserting Customer row · id="${CUSTOMER_ID}" · email="${email}"${apiKey?.customerEmail ? ' (from ApiKey)' : ' (fallback)'}`);

  const { data: created, error } = await sb
    .from('Customer')
    .insert({ id: CUSTOMER_ID, email })
    .select('id, email, created_at')
    .single();

  if (error) {
    console.error('Insert failed:', error);
    process.exit(1);
  }

  console.log('✓ Created:', created);

  // 3. Initialize Credit row (per migration 012 invariant).
  const { error: credErr } = await sb
    .from('Credit')
    .insert({ customer_id: CUSTOMER_ID, balance_cents: 0 });
  if (credErr && !String(credErr.message).includes('duplicate')) {
    console.warn('Credit row warning:', credErr.message);
  } else {
    console.log('✓ Credit row initialized (or already existed)');
  }

  console.log('\nPOST /v1/mandates should now work for helixa-synagent-beta.');
})();
