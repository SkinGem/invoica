import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const OUTPUT_PATH = path.join(__dirname, '../../public/aiax/sections/trust_signals.json');

const PARTNERSHIPS = [
  { name: 'Helixa', role: 'First PACT-integrated partner', since: '2026-05-28' },
  { name: 'ClinPay / AsterPay', role: 'Clinical trial payment rail', since: '2026-05-22' },
];

async function buildTrustSignals(): Promise<void> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { count: drsCount } = await supabase
    .from('drs_receipts')
    .select('*', { count: 'exact', head: true });

  const { count: mandateCount } = await supabase
    .from('mandates')
    .select('*', { count: 'exact', head: true });

  const { count: settledCount } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'settled');

  const trustSignals = {
    section_id: 'trust_signals',
    version: '0.1',
    generated_at: new Date().toISOString(),
    metrics: {
      drs_receipts_issued: drsCount ?? 0,
      mandates_anchored: mandateCount ?? 0,
      invoices_settled: settledCount ?? 0,
    },
    partnerships: PARTNERSHIPS,
    pact_endpoint: 'https://api.invoica.ai/v1/mandates',
    spec_url: 'https://kognai.ai/aiax/spec/v0.1',
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(trustSignals, null, 2));
  console.log(`[trust-signals-builder] Written to ${OUTPUT_PATH}`);
  console.log(`  drs_receipts=${trustSignals.metrics.drs_receipts_issued} mandates=${trustSignals.metrics.mandates_anchored} settled=${trustSignals.metrics.invoices_settled}`);
}

buildTrustSignals()
  .then(() => process.exit(0))
  .catch((err) => { console.error('[trust-signals-builder] ERROR:', err); process.exit(1); });

export { buildTrustSignals };
