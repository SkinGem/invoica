# AsterPay × Invoica — ClinPay Integration Spec

**For:** AsterPay engineering, integrating ClinPay's patient-pull-from-escrow flow.
**Version:** 0.1 · **Status:** Sprint 1 deliverable · **Last updated:** 2026-05-22

This document covers the Invoica-side surfaces AsterPay needs to wire:

1. **PACT mandate signing** — one mandate per campaign, signed by sponsor at funding time
2. **DRS anchoring** — per-event audit receipt anchored on Base mainnet
3. **Audit-pack format** — CSV + PDF columns for sponsor export (Sprint 2)

---

## 1. Base URL + Authentication

**Production:** `https://api.invoica.ai`
**Sandbox:** same domain, use sandbox API keys (`invoica_sk_sb_*` prefix bypass paywall on `/settle`).

All endpoints require `x-api-key` header:

```
x-api-key: sk_<32 hex bytes>
```

AsterPay's existing partner key works for both flows below. Request rotation any time.

---

## 2. PACT Mandate — campaign funding

We reuse the **generic** `/v1/mandates` API (the same surface used for the Helixa Synagent integration — already in production). For ClinPay, mandate semantics:

| Field | Value for ClinPay campaign |
|---|---|
| `proposer` | sponsor agent id, e.g. `"ag-campaign-z"` |
| `counterparty` | `"clinpay-treasury"` (fixed) |
| `scope` | free-text description of the campaign |
| `terms` | JSON with campaign parameters (see below) |
| `expiry` | campaign close date (ISO 8601) |
| `context` | partner metadata, e.g. `{ source: "asterpay-dashboard", campaign_id: "z" }` |

**Recommended `terms` shape for ClinPay:**

```json
{
  "campaign_id":           "ag-campaign-z",
  "max_total_usdc":        "20000.00",
  "max_per_payout_usdc":   "200.00",
  "expected_panellists":   1000,
  "currency_payout":       "EUR",
  "eligibility_criteria":  ["healthcare_professional", "EU_resident"],
  "jurisdiction_whitelist": ["GB", "DE", "FR", "ES", "IT"]
}
```

Free-form — Invoica doesn't enforce schema, but these fields will be canonicalized into the signed bytes and appear verbatim in the DRS receipt audit trail.

### Endpoints AsterPay calls

#### `POST /v1/mandates` — create proposal

```http
POST https://api.invoica.ai/v1/mandates
x-api-key: sk_...
content-type: application/json

{
  "proposer":      "ag-campaign-z",
  "counterparty":  "clinpay-treasury",
  "scope":         "All Global panel — campaign Z, HCP honoraria up to €20k cap",
  "terms":         { /* see above */ },
  "expiry":        "2026-12-31T00:00:00.000Z",
  "context":       { "source": "asterpay-dashboard", "campaign_id": "z" }
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "mandate_id": "mnd_<uuid>",
    "status": "proposed",
    "proposer_signature_required": true
  }
}
```

#### `POST /v1/mandates/:id/sign` — sponsor signs

Sponsor signs in the AsterPay dashboard. Signature = **HMAC-SHA256** over canonical mandate bytes using the shared `PACT_SIGNING_SECRET` distributed to AsterPay out-of-band.

**Canonical JSON rules** (must match exactly — DB roundtrip stable):

1. Sort all object keys alphabetically (recursive)
2. Normalize `expires_at` via `new Date(value).toISOString()`
3. Stringify with `JSON.stringify` — no whitespace

**Reference (Node.js):**

```javascript
const crypto = require('crypto');

function sortKeys(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(sortKeys);
  const sorted = {};
  Object.keys(v).sort().forEach(k => { sorted[k] = sortKeys(v[k]); });
  return sorted;
}

function signMandate(mandate, secret) {
  const canonical = JSON.stringify({
    counterparty_agent_id: mandate.counterparty_agent_id,
    expires_at: new Date(mandate.expires_at).toISOString(),
    id: mandate.id,
    proposer_agent_id: mandate.proposer_agent_id,
    scope: mandate.scope,
    terms: sortKeys(mandate.terms),
  });
  return crypto.createHmac('sha256', secret).update(canonical).digest('hex');
}
```

Then POST:

```http
POST https://api.invoica.ai/v1/mandates/{mandate_id}/sign
{
  "signer":    "proposer",
  "signature": "<hex HMAC>"
}
```

#### Counterparty (ClinPay treasury) signs

For v1, **Invoica auto-signs as counterparty** on mandate creation via a system process. AsterPay doesn't need to do anything here — the mandate flips to `signed_by_both` automatically once the proposer signs.

#### `GET /v1/mandates/:id` — pre-event eligibility check

Before debiting the escrow on each panellist event, AsterPay calls this to verify the mandate is still valid (status, expiry, remaining capacity):

```http
GET https://api.invoica.ai/v1/mandates/{mandate_id}
x-api-key: sk_...
```

Returns the full mandate object + transition trail. Check:

- `state === 'signed_by_both'` or `'in_progress'`
- `expires_at > now()`
- Sum of DRS receipts linked to this mandate ≤ `terms.max_total_usdc` (AsterPay's local accounting — Invoica doesn't enforce this)

### EIP-712 sponsor signing (v2, deferred)

Current v1 uses HMAC because sponsor dashboard signing UX is server-side. v2 will add EIP-712 wallet sigs — same `/sign` endpoint accepts either type, schema differs. Not needed for the AG/GP launch.

---

## 3. DRS Anchoring — per-event audit receipt

Every panellist payout produces a Deal Receipt anchored on Base mainnet for sponsor audit. AsterPay calls this AFTER the SEPA Instant is confirmed delivered.

### `POST /v1/clinpay/drs/anchor`

> **Note:** This endpoint will be exposed by Invoica in Sprint 1 (currently the DRS minting function is internal at `services/clinpay/drs-receipt.ts → mintDrsReceipt()`). New route will be at `backend/src/routes/clinpay-drs.ts`. Spec below is the contract.

```http
POST https://api.invoica.ai/v1/clinpay/drs/anchor
x-api-key: sk_...
content-type: application/json

{
  "mandate_id":           "mnd_<uuid>",
  "campaign_id":          "ag-campaign-z",
  "panellist_id_hash":    "<sha256 of panellist email or wallet>",
  "visit_id":             "visit-007",
  "study_id":             "study-z",
  "amount_eur":           100.00,
  "amount_usdc":          102.00,
  "fee_breakdown": {
    "asterpay_fee_usdc":  1.01,
    "invoica_fee_usdc":   0.99
  },
  "settlement": {
    "rail":               "sepa_instant",
    "sepa_tx_ref":        "ESCT202605221234567890",
    "settled_at":         "2026-05-22T14:23:01.000Z"
  },
  "tax_line": {
    "jurisdiction":       "GB",
    "rate":               0.20,
    "amount":             20.00,
    "statute":            "VAT Notice 700, HMRC"
  }
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "receipt_id":         "drs_<uuid>",
    "mandate_hash":       "<sha256 of mandate canonical bytes>",
    "anchor_chain":       "base",
    "anchor_tx_hash":     "0x...",
    "anchor_block_number": 41710900,
    "explorer_url":       "https://basescan.org/tx/0x...",
    "pact_version":       "v0.3.2"
  }
}
```

Anchoring is **best-effort** — if Base is congested, the receipt is persisted in DB immediately and the anchor tx is queued. AsterPay should treat the receipt as confirmed once the response arrives; the on-chain anchor is the audit artifact.

---

## 4. Audit-pack format (Sprint 2 preview — for early alignment)

Sponsor exports get two files: a CSV (machine-readable) and a PDF (branded, signature page).

### CSV columns (one row per panellist event)

```
campaign_id, panellist_id_hash, visit_id, study_id,
date, time_utc,
amount_eur, amount_usdc, currency_payout,
asterpay_fee_usdc, invoica_fee_usdc,
sepa_tx_ref, settlement_rail,
tax_jurisdiction, tax_rate, tax_amount, tax_statute,
mandate_id, mandate_hash,
drs_receipt_id, anchor_tx_hash, anchor_block_number,
pact_version, anchor_chain
```

UTF-8, headers in row 1, RFC 4180 quoting.

### PDF structure

1. **Cover page** — sponsor name, campaign ID, period covered, total payout count, total amount, generation timestamp, audit-pack hash (SHA-256 of the CSV)
2. **Summary table** — by-jurisdiction tax totals, by-week payout volume, fee breakdown
3. **Detail pages** — same CSV columns, paginated
4. **Cryptographic appendix** — mandate signature(s), DRS receipt hashes, anchor tx URLs for sponsor's audit-trail verification

### Generation endpoint

```http
POST https://api.invoica.ai/v1/clinpay/audit-pack
x-api-key: sk_...

{
  "campaign_id":  "ag-campaign-z",
  "from":         "2026-06-01T00:00:00.000Z",
  "to":           "2026-06-30T23:59:59.000Z",
  "format":       "csv" | "pdf" | "both"
}
```

Returns signed S3 URLs that expire in 1 hour (or inline content for CSV under 5MB).

---

## 5. Webhook events (Invoica → AsterPay)

Optional. If AsterPay registers a webhook at `/v1/webhooks`, Invoica fires on:

| Event | Trigger |
|---|---|
| `mandate.signed_by_both` | Sponsor + ClinPay countersign — campaign funded and active |
| `mandate.expired` | Mandate hit `expires_at` — block further events |
| `mandate.cap_warning` | DRS receipt sum reached 80% of `terms.max_total_usdc` |
| `drs.anchor_confirmed` | On-chain anchor tx confirmed (1 block on Base) |
| `drs.anchor_failed` | Anchor retry exhausted (rare; receipt still in DB) |

HMAC-signed per the existing `/v1/webhooks` registration flow.

---

## 6. Sandbox + test credentials

For Sprint 1/2 builds:

- **Sandbox API key:** request rotation from Invoica directly (DM)
- **Sandbox keys bypass x402 paywall** on `/settle` endpoints — full cycle testable without funding USDC
- **Sandbox DRS receipts** anchor to Base Sepolia (not mainnet) — same shape, free to mint
- **Sandbox mandate-signing secret** is separate from production; rotates 2026-05-30 (existing AsterPay sandbox creds)

---

## 7. Open questions for the partnership agreement

These don't block engineering but should land before AG signs the production study:

1. **Fee split mechanics** — current 2% gross. AsterPay collects, reconciles with Invoica weekly/monthly. Need written split percentage + cadence.
2. **Sandbox credentials rotation cadence** — currently 2026-05-30; aligning on quarterly rotation going forward.
3. **Per-sponsor signing secrets** — v1 uses one shared `PACT_SIGNING_SECRET` across all sponsors. v2 per-sponsor keys (sponsor isolation, leak blast-radius).
4. **Audit-pack hosting** — Invoica generates + signs URLs; AsterPay dashboard surfaces. Or AsterPay generates from raw CSV/DRS data. Defer to whoever ships dashboard first.

---

*Maintainer: Invoica team · Contact: support@invoica.ai*
