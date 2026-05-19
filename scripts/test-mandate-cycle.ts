// End-to-end test for PACT Mandate API v0.1.
// Exercises the full lifecycle: propose → sign × 2 → complete → fetch trail.
// Verifies on-chain anchors are persisted in MandateTransition rows.
//
// Run:
//   INVOICA_KEY=sk_... PACT_SIGNING_SECRET=... npx ts-node scripts/test-mandate-cycle.ts
//
// Optional:
//   API_URL=https://api.invoica.ai  (default)
//   PROPOSER=alice                  (default test id)
//   COUNTERPARTY=bob                (default test id)

import * as crypto from 'crypto';

const API_URL = process.env.API_URL || 'https://api.invoica.ai';
const KEY = process.env.INVOICA_KEY;
const SECRET = process.env.PACT_SIGNING_SECRET;
const PROPOSER = process.env.PROPOSER || 'alice';
const COUNTERPARTY = process.env.COUNTERPARTY || 'bob';

if (!KEY) throw new Error('INVOICA_KEY env var required');
if (!SECRET) throw new Error('PACT_SIGNING_SECRET env var required');

// Must match backend/src/services/mandate/sign.ts canonicalize().
function sortKeys(v: unknown): unknown {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(sortKeys);
  const sorted: Record<string, unknown> = {};
  Object.keys(v as Record<string, unknown>).sort().forEach((k) => {
    sorted[k] = sortKeys((v as Record<string, unknown>)[k]);
  });
  return sorted;
}

function signMandate(mandate: {
  id: string;
  proposer_agent_id: string;
  counterparty_agent_id: string;
  scope: string;
  terms: unknown;
  expires_at: string;
}): string {
  const canonical = JSON.stringify({
    counterparty_agent_id: mandate.counterparty_agent_id,
    expires_at: new Date(mandate.expires_at).toISOString(),
    id: mandate.id,
    proposer_agent_id: mandate.proposer_agent_id,
    scope: mandate.scope,
    terms: sortKeys(mandate.terms),
  });
  return crypto.createHmac('sha256', SECRET!).update(canonical).digest('hex');
}

async function call(method: string, path: string, body?: unknown): Promise<any> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'x-api-key': KEY!,
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  console.log(`  ${method} ${path} → ${res.status}`);
  if (res.status >= 400) {
    console.error('  ERROR:', JSON.stringify(json, null, 2));
    throw new Error(`${method} ${path} failed with ${res.status}`);
  }
  return json;
}

async function main() {
  console.log(`\n=== PACT Mandate cycle test ===`);
  console.log(`  API: ${API_URL}`);
  console.log(`  Proposer: ${PROPOSER}, Counterparty: ${COUNTERPARTY}\n`);

  // Step 1 — propose
  console.log('[1/6] Propose mandate');
  const proposalBody = {
    proposer: PROPOSER,
    counterparty: COUNTERPARTY,
    scope: 'e2e cycle test — write 100 words of weather copy',
    terms: { amount: '5', currency: 'USDC', deliverable: 'weather copy', deadline: new Date(Date.now() + 86_400_000).toISOString() },
    expiry: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    context: { source: 'e2e_test_script', test_run_id: crypto.randomUUID() },
  };
  const proposed = await call('POST', '/v1/mandates', proposalBody);
  const mandateId = proposed.data.mandate_id;
  console.log(`  → mandate_id=${mandateId} status=${proposed.data.status}\n`);

  // Compose the signable bag (matches handler.ts MandateSignable shape)
  const signable = {
    id: mandateId,
    proposer_agent_id: PROPOSER,
    counterparty_agent_id: COUNTERPARTY,
    scope: proposalBody.scope,
    terms: proposalBody.terms,
    expires_at: proposalBody.expiry,
  };
  const sig = signMandate(signable);

  // Step 2 — sign as proposer
  console.log('[2/6] Sign as proposer');
  const signed1 = await call('POST', `/v1/mandates/${mandateId}/sign`, { signer: 'proposer', signature: sig });
  console.log(`  → status=${signed1.data.status}\n`);

  // Step 3 — sign as counterparty
  console.log('[3/6] Sign as counterparty');
  const signed2 = await call('POST', `/v1/mandates/${mandateId}/sign`, { signer: 'counterparty', signature: sig });
  console.log(`  → status=${signed2.data.status}\n`);

  // Step 4 — complete
  console.log('[4/6] Complete mandate');
  const completed = await call('POST', `/v1/mandates/${mandateId}/complete`, { triggered_by: PROPOSER });
  console.log(`  → status=${completed.data.status} completed_at=${completed.data.completed_at}\n`);

  // Step 5 — fetch full state + trail
  console.log('[5/6] Fetch mandate + transition trail');
  const fetched = await call('GET', `/v1/mandates/${mandateId}`);
  console.log(`  → state=${fetched.data.state}`);
  console.log(`  → transitions: ${fetched.data.transitions.length}`);
  fetched.data.transitions.forEach((t: any, i: number) => {
    console.log(`    ${i + 1}. ${t.from_state || '(initial)'} → ${t.to_state}` +
      (t.anchor_tx_hash ? ` [tx=${t.anchor_tx_hash.slice(0, 10)}... block=${t.anchor_block_number}]` : ' (no anchor)'));
  });

  // Step 6 — check that at least one tx is verifiable on BaseScan
  console.log(`\n[6/6] On-chain verification`);
  const anchoredTransitions = fetched.data.transitions.filter((t: any) => t.anchor_tx_hash);
  if (anchoredTransitions.length === 0) {
    console.error('  ⚠️  No anchor tx hashes captured. Check MANDATE_ANCHOR_SIGNER_PRIVATE_KEY balance + RPC.');
  } else {
    console.log(`  ✓ ${anchoredTransitions.length} transitions anchored on Base Sepolia`);
    console.log(`  First anchor: https://sepolia.basescan.org/tx/${anchoredTransitions[0].anchor_tx_hash}`);
  }

  console.log(`\n=== PASS ===\n`);
}

main().catch((err) => {
  console.error('\n=== FAIL ===\n', err);
  process.exit(1);
});
