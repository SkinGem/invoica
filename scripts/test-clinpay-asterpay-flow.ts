// End-to-end verification of the AsterPay × Invoica ClinPay integration.
// Mirrors what Petteri's dashboard will do:
//   1. POST /v1/mandates — create campaign mandate (counterparty=clinpay-treasury)
//   2. POST /v1/mandates/:id/sign as proposer (sponsor signing in dashboard)
//      → expect auto-countersign by treasury → state=signed_by_both
//   3. POST /v1/clinpay/drs/anchor — anchor a panellist payout receipt
//   4. GET  /v1/mandates/:id — verify state + transitions

import * as crypto from 'crypto';

const API_URL = process.env.API_URL || 'https://api.invoica.ai';
const KEY = process.env.INVOICA_KEY;
const SECRET = process.env.PACT_SIGNING_SECRET;
if (!KEY) throw new Error('INVOICA_KEY required');
if (!SECRET) throw new Error('PACT_SIGNING_SECRET required');

function sortKeys(v: unknown): unknown {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(sortKeys);
  const sorted: Record<string, unknown> = {};
  Object.keys(v as Record<string, unknown>).sort().forEach((k) => {
    sorted[k] = sortKeys((v as Record<string, unknown>)[k]);
  });
  return sorted;
}

function signMandate(m: {
  id: string;
  proposer_agent_id: string;
  counterparty_agent_id: string;
  scope: string;
  terms: unknown;
  expires_at: string;
}): string {
  const canonical = JSON.stringify({
    counterparty_agent_id: m.counterparty_agent_id,
    expires_at: new Date(m.expires_at).toISOString(),
    id: m.id,
    proposer_agent_id: m.proposer_agent_id,
    scope: m.scope,
    terms: sortKeys(m.terms),
  });
  return crypto.createHmac('sha256', SECRET!).update(canonical).digest('hex');
}

async function call(method: string, path: string, body?: unknown): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'x-api-key': KEY!, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  console.log(`  ${method} ${path} → ${res.status}`);
  if (res.status >= 400) {
    console.error('  ERROR:', JSON.stringify(json, null, 2));
    throw new Error(`${method} ${path} failed (${res.status})`);
  }
  return json;
}

async function main() {
  const sponsorId = `test-sponsor-${crypto.randomBytes(3).toString('hex')}`;
  const campaignId = `test-campaign-${crypto.randomBytes(3).toString('hex')}`;
  const panellistIdHash = crypto.createHash('sha256').update(`panellist-${Date.now()}`).digest('hex');
  console.log('\n=== ClinPay × AsterPay flow test ===');
  console.log(`  sponsor:  ${sponsorId}`);
  console.log(`  campaign: ${campaignId}\n`);

  // 1. Propose
  console.log('[1] propose mandate (counterparty=clinpay-treasury)');
  const proposal = {
    proposer: sponsorId,
    counterparty: 'clinpay-treasury',
    scope: 'Test campaign — HCP honoraria up to $1k cap',
    terms: {
      campaign_id: campaignId,
      max_total_usdc: '1000.00',
      max_per_payout_usdc: '200.00',
      expected_panellists: 10,
      currency_payout: 'EUR',
      jurisdiction_whitelist: ['GB', 'DE', 'FR'],
    },
    expiry: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    context: { source: 'test-asterpay-flow', campaign_id: campaignId },
  };
  const created = await call('POST', '/v1/mandates', proposal);
  const mandateId = created.data.mandate_id;
  console.log(`  → mandate_id=${mandateId} state=${created.data.status}\n`);

  // 2. Sponsor signs → expect auto-countersign
  console.log('[2] sponsor signs as proposer → expect auto-countersign by clinpay-treasury');
  const signable = {
    id: mandateId,
    proposer_agent_id: sponsorId,
    counterparty_agent_id: 'clinpay-treasury',
    scope: proposal.scope,
    terms: proposal.terms,
    expires_at: proposal.expiry,
  };
  const sig = signMandate(signable);
  const signed = await call('POST', `/v1/mandates/${mandateId}/sign`, { signer: 'proposer', signature: sig });
  console.log(`  → state after sponsor sign: ${signed.data.status}`);
  if (signed.data.status !== 'signed_by_both') {
    console.error(`  ✗ FAIL — expected 'signed_by_both' (auto-countersign), got '${signed.data.status}'`);
    process.exit(1);
  }
  console.log('  ✓ auto-countersign worked — mandate is signed_by_both in one round-trip\n');

  // 3. Anchor a DRS receipt for a panellist payout (simulating AsterPay's call after SEPA settle)
  console.log('[3] anchor DRS receipt for one panellist payout');
  const anchored = await call('POST', '/v1/clinpay/drs/anchor', {
    mandate_id: mandateId,
    campaign_id: campaignId,
    panellist_id_hash: panellistIdHash,
    visit_id: 'visit-001',
    study_id: 'test-study',
    amount_eur: 100.00,
    amount_usdc: 102.00,
    fee_breakdown: { asterpay_fee_usdc: 1.01, invoica_fee_usdc: 0.99 },
    settlement: {
      rail: 'sepa_instant',
      sepa_tx_ref: `ESCT${Date.now()}`,
      settled_at: new Date().toISOString(),
    },
    tax_line: { jurisdiction: 'GB', rate: 0.20, amount: 20.00, statute: 'VAT Notice 700' },
  });
  console.log(`  → receipt_id=${anchored.data.receipt_id}`);
  console.log(`  → mandate_hash=${anchored.data.mandate_hash.slice(0, 18)}…`);
  console.log(`  → anchor_chain=${anchored.data.anchor_chain || '(none — best-effort failed)'}`);
  if (anchored.data.anchor_tx_hash) {
    console.log(`  → anchor_tx=${anchored.data.anchor_tx_hash.slice(0, 18)}…`);
    console.log(`  → explorer=${anchored.data.explorer_url}`);
  }
  console.log('');

  // 4. Verify mandate trail
  console.log('[4] verify mandate state + transitions');
  const fetched = await call('GET', `/v1/mandates/${mandateId}`);
  console.log(`  → state=${fetched.data.state}, transitions=${fetched.data.transitions.length}`);
  fetched.data.transitions.forEach((t: any, i: number) => {
    console.log(`    ${i + 1}. ${t.from_state || '(initial)'} → ${t.to_state}` +
      (t.anchor_tx_hash ? ` [tx=${t.anchor_tx_hash.slice(0, 10)}…]` : ''));
  });
  console.log('\n=== PASS ===');
  console.log(`Mandate ${mandateId} ready for additional payout anchors.`);
}

main().catch(err => { console.error('\n=== FAIL ===\n', err); process.exit(1); });
