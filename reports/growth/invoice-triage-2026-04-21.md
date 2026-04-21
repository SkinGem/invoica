# Invoice Triage — 2026-04-21

**Trigger:** CFO priorities memo flagged 12 of 13 invoices stuck PENDING, 7.7% settlement rate. Investigating whether it's a payment-flow bug or something else.

## Finding — it's not a payment-flow bug

All 13 invoices in the system are **demo/test data**. Not a single one comes from a real external customer.

| Category | Count | Customers |
|---|---|---|
| Self-dealing (internal agent) | 2 | `sap-agent@x402.invoica.ai` |
| PACT demo test runs | 8 | `nova@creator.ai`, `aria@agent.ai` |
| `buyer@example.com` literal test data | 2 | — |
| Internal Solana agent | 1 | `3feudtV2@agents.solana` (the 1 COMPLETED) |

**Additional smells:**
- `chain` column is NULL on every single invoice (schema has no `chain` field — it's under `paymentDetails` JSONB)
- `txHash` not populated on any invoice — the "no-tx" flag is universal
- The 13 invoices span 2026-03-16 to 2026-04-03, which lines up with the PACT demo development window, not organic customer activity
- The 1 COMPLETED is also internal

## Implication

The "revenue crisis" framing in the CEO priorities memo is technically correct but strategically misleading:

- **Surface metric:** 12 of 13 PENDING = 92% non-payment rate, $0 MRR
- **Actual state:** zero external customer invoice traffic. The 92% is internal test data that was never expected to settle.

Plan §14 baseline already called this out: "External customers: 0 today." What we see in the Invoice table is consistent with that baseline.

## What's actually broken vs. what's noise

**Not broken (noise):**
- Payment completion flow — no real customers to complete anything
- Settlement detection — chain field missing on test invoices because they were never expected to settle on-chain
- PENDING age on March 16 invoices — they were demo tests from 5+ weeks ago, abandoned

**Actually broken (needs action):**
- Internal test data pollutes the metrics, making the revenue story look uniformly bad
- Public-facing metrics (per plan §M2-CUST-01) would leak these self-dealing numbers if not filtered
- The one COMPLETED invoice settled at 0.01 USDC from an internal agent — also self-dealing

## Recommendation

1. **Before M2 claims work:** purge or archive the 13 test invoices, OR flag them with an `isTest: true` boolean so dashboards can exclude them. Otherwise the public marketing surface will show "$0.01 settled, 12 pending" which is technically accurate and reputationally terrible.
2. **Post-M1:** focus M2 customer-acquisition energy where it belongs — getting 5 real external signups to CREATE their first invoice (plan §M2-CUST-03 concierge playbook). Payment flow can wait; there's nothing flowing through it to fix.
3. **Refresh CFO dashboard:** split metrics into `internal_test` vs `external_real` from day one (plan §M2-CUST-01).

## Next steps owner-level

- Decision: purge test invoices or flag them?
- Who's the first real customer target? (36-target list from bizdev was in an earlier directive — resurrect it)
- Is the $1000 `buyer@example.com` test invoice something we're using for demos? If yes, move it to a test Supabase project, not prod.

## Auth change impact — already live

M1-SEC-01 shipped 2026-04-21 wrapped 10 read-side routes with `authenticate`. External callers who want to query `/v1/metrics`, `/v1/reputation/leaderboard`, etc. now need a valid API key. No known external consumers of those endpoints today (the dashboard uses them with a session token) so the change is invisible to current usage.
