# PACT Mandate API — v0.1

**Status:** Live (testnet). Production base URL: `https://api.invoica.ai`
**Spec version:** 0.1.0 · Last updated: 2026-05-19
**Anchor chain:** Base Sepolia (testnet, chain ID 84532)
**Anchor contract:** [`0x55acad606c488057db395e87ac5d57944f31c497`](https://sepolia.basescan.org/address/0x55acad606c488057db395e87ac5d57944f31c497)

---

## 1. Overview

A bilateral mandate is a cryptographically-signed agreement between two parties (agents or humans) that authorizes specific work for a specific period. The API tracks each mandate through its lifecycle, persists every state change with an on-chain anchor on Base Sepolia, and dispatches webhook events on each transition.

This is the same primitive Invoica uses for ClinPay panellist payouts, exposed here as a generic REST surface for any partner. The `context` JSONB field is opaque per-partner metadata — for the Helixa Synagent integration, callers set `context.source = "helixa_synagent_tg_bot"` and include the TG chat ID.

## 2. Authentication

All endpoints require an Invoica API key in the `x-api-key` header:

```
x-api-key: sk_<32 hex bytes>
```

Request a key from `tarek@invoica.ai` for the closed beta.

## 3. Signing algorithm — canonical JSON + HMAC-SHA256

Every mandate signature is HMAC-SHA256 over a deterministic canonical encoding of the mandate fields. The shared secret is `PACT_SIGNING_SECRET`, distributed out of band per integration partner.

**Canonical JSON rules:**

1. Sort object keys alphabetically at every level (recursive)
2. Normalize `expires_at` via `new Date(value).toISOString()`
3. Stringify with `JSON.stringify` — no whitespace, no trailing comma

**Reference implementation (Node.js):**

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

**Why canonical:** Postgres `JSONB` doesn't preserve insertion order, and `TIMESTAMPTZ` re-emits timestamps in a normalized format. Without canonicalization, a roundtrip through the DB produces different bytes than the bot signed and verification fails.

## 4. Mandate state machine

```
                ┌──── dispute ────┐
                ▼                  ▼
proposed ──sign(proposer)──> signed_by_proposer ──sign(counterparty)──> signed_by_both
                                                                            │
                                                                            ▼
                                                                       in_progress
                                                                            │
                                                                            ▼
                                                                        completed
```

**Terminal states:** `completed`, `disputed`, `expired`.
**Auto-transition:** `POST /complete` advances `signed_by_both → in_progress → completed` atomically.

Every state transition (including the implicit `in_progress` step) emits a `MandateAnchored(bytes32 mandateHash, string state, uint256 ts, address sender)` event on Base Sepolia. The contract has no storage; receipts are the (mandateHash, txHash, blockNumber) tuples persisted in `MandateTransition` rows.

## 5. Endpoints

### 5.1 `POST /v1/mandates` — propose

Create a new mandate proposal.

**Request:**

```json
POST /v1/mandates
x-api-key: sk_...
content-type: application/json

{
  "proposer":     "alice@helixa",
  "counterparty": "bob@helixa",
  "scope":        "Write 100 words of weather copy for SF",
  "terms": {
    "amount":      "5",
    "currency":    "USDC",
    "deliverable": "weather copy, 100 words",
    "deadline":    "2026-05-22T17:00:00.000Z"
  },
  "expiry":  "2026-05-25T00:00:00.000Z",
  "context": {
    "source":  "helixa_synagent_tg_bot",
    "chat_id": "1234567890"
  }
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "mandate_id": "mnd_6d7b9658-4b77-4958-bfeb-c01947ac063c",
    "status": "proposed",
    "proposer_signature_required": true
  }
}
```

### 5.2 `POST /v1/mandates/:id/sign` — sign

Sign a mandate (proposer signs first, then counterparty). Each call advances the state machine by one step and anchors the new state on Base Sepolia.

**Request:**

```json
POST /v1/mandates/mnd_.../sign
x-api-key: sk_...
content-type: application/json

{
  "signer":    "proposer",            // or "counterparty"
  "signature": "<hex HMAC-SHA256>"    // see §3
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "mandate_id": "mnd_6d7b9658-...",
    "status": "signed_by_proposer",
    "drs_receipt_id": null
  }
}
```

When the counterparty signs, `status` becomes `signed_by_both` and a `drs_receipt_id` may be populated.

**Errors:**
- `400 invalid_signer` — signer must be `"proposer"` or `"counterparty"`
- `400 missing_signature` — signature field required
- `403 invalid_signature` — HMAC mismatch
- `404 mandate_not_found`
- `409 invalid_transition` — wrong state for this signer

### 5.3 `GET /v1/mandates/:id` — fetch

Returns the full mandate state plus the complete transition trail (one row per state change, each with the on-chain anchor tx hash).

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "mnd_6d7b9658-...",
    "proposer_agent_id": "alice@helixa",
    "counterparty_agent_id": "bob@helixa",
    "scope": "Write 100 words of weather copy for SF",
    "terms": { ... },
    "context": { ... },
    "state": "completed",
    "pact_mandate_hash": "0xabc...",
    "pact_version": "v0.3.2",
    "proposer_signature": "...",
    "counterparty_signature": "...",
    "signed_by_proposer_at": "2026-05-19T11:47:00Z",
    "signed_by_counterparty_at": "2026-05-19T11:47:30Z",
    "completed_at": "2026-05-19T11:47:44Z",
    "expires_at": "2026-05-25T00:00:00Z",
    "transitions": [
      { "from_state": null, "to_state": "proposed",          "anchor_tx_hash": null },
      { "from_state": "proposed",          "to_state": "signed_by_proposer", "anchor_tx_hash": "0xe459..." },
      { "from_state": "signed_by_proposer","to_state": "signed_by_both",     "anchor_tx_hash": "0xeaf6..." },
      { "from_state": "signed_by_both",    "to_state": "in_progress",        "anchor_tx_hash": "0xb9f7..." },
      { "from_state": "in_progress",       "to_state": "completed",          "anchor_tx_hash": "0x0230..." }
    ]
  }
}
```

### 5.4 `POST /v1/mandates/:id/complete` — complete

Mark the mandate completed. If called from `signed_by_both`, implicitly advances through `in_progress → completed` (two anchor txs).

**Request:**

```json
POST /v1/mandates/mnd_.../complete
{
  "triggered_by": "alice@helixa"  // optional, defaults to "system"
}
```

### 5.5 `POST /v1/mandates/:id/dispute` — dispute

Flag a mandate as disputed. Terminal state — no further transitions.

**Request:**

```json
POST /v1/mandates/mnd_.../dispute
{
  "triggered_by": "bob@helixa",
  "reason": "Deliverable not received by deadline"
}
```

## 6. Webhook registration

Use the existing Invoica webhook surface to receive mandate state-change events:

```
POST /v1/webhooks
{
  "url":    "https://your-bot.example.com/invoica/webhook",
  "events": ["mandate.proposed", "mandate.signed_by_proposer", "mandate.signed_by_both", "mandate.completed", "mandate.disputed"],
  "secret": "<your bot's webhook signing secret>"
}
```

**Event payload** (HMAC-signed via `X-Invoica-Signature` header):

```json
{
  "id":   "<uuid>",
  "type": "mandate.signed_by_both",
  "data": {
    "id": "mnd_...",
    "state": "signed_by_both",
    /* full Mandate row */
  },
  "createdAt": "2026-05-19T11:47:30Z"
}
```

Verify the signature using your registered secret:

```javascript
const expected = crypto.createHmac('sha256', YOUR_SECRET).update(rawBody).digest('hex');
if (req.headers['x-invoica-signature'] !== expected) reject();
```

## 7. On-chain verification

Every transition with a non-null `anchor_tx_hash` is independently verifiable on BaseScan:

```
https://sepolia.basescan.org/tx/<anchor_tx_hash>
```

The transaction's `MandateAnchored` event carries `(mandateHash, state, timestamp, sender)`. The sender will always be the Invoica anchor signer (`0x7433208E00aB3F84119da26e6DEB0596D09B65d0` in v0.1). Mainnet migration in v0.2 will change this address.

## 8. Quickstart — curl

```bash
# 1. Propose
curl -sX POST https://api.invoica.ai/v1/mandates \
  -H "x-api-key: $INVOICA_KEY" -H "content-type: application/json" \
  -d '{"proposer":"alice","counterparty":"bob","scope":"test","terms":{"amount":"5","currency":"USDC"},"expiry":"2026-05-25T00:00:00.000Z"}'

# 2. Compute signature (see §3) and sign
SIG=$(node -e "/* paste signMandate() from §3 */")

# 3. Sign as proposer
curl -sX POST https://api.invoica.ai/v1/mandates/$MANDATE_ID/sign \
  -H "x-api-key: $INVOICA_KEY" -H "content-type: application/json" \
  -d "{\"signer\":\"proposer\",\"signature\":\"$SIG\"}"

# 4. Counterparty sign (same SIG since mandate fields didn't change)
curl -sX POST https://api.invoica.ai/v1/mandates/$MANDATE_ID/sign \
  -H "x-api-key: $INVOICA_KEY" -H "content-type: application/json" \
  -d "{\"signer\":\"counterparty\",\"signature\":\"$SIG\"}"

# 5. Complete
curl -sX POST https://api.invoica.ai/v1/mandates/$MANDATE_ID/complete \
  -H "x-api-key: $INVOICA_KEY" -H "content-type: application/json" \
  -d '{"triggered_by":"alice"}'

# 6. Fetch full trail
curl -s https://api.invoica.ai/v1/mandates/$MANDATE_ID \
  -H "x-api-key: $INVOICA_KEY" | jq '.data.transitions'
```

A complete TypeScript reference client lives at `scripts/test-mandate-cycle.ts` in the Invoica repo.

## 9. Out of scope (v0.1)

- EIP-712 wallet signing (v0.2)
- Mainnet anchor contract (v0.2)
- Rate limiting beyond Invoica's standard 100 req/min
- Multi-party mandates beyond proposer + counterparty (v0.2)
- Partial-period or variable-cost mandates (see `docs/strategic/bond-v02-variable-cost-research.md`)
- Production auth flows beyond API key (v0.2 likely adds OAuth scopes per partner)

## 10. Errors

All errors return JSON:

```json
{ "success": false, "error": { "code": "...", "message": "..." } }
```

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `missing_field` | Required field absent |
| 400 | `invalid_field` | Field present but malformed |
| 400 | `invalid_signer` | signer ∉ {proposer, counterparty} |
| 400 | `missing_signature` | signature required |
| 401 | `missing_api_key` | x-api-key header absent |
| 403 | `invalid_signature` | HMAC mismatch |
| 404 | `mandate_not_found` | Mandate id unknown |
| 404 | `not_found` | Mandate id unknown (GET) |
| 409 | `invalid_transition` | State machine guard rejected the action |
| 500 | `internal_error` | Server-side fault — please retry / report |

## 11. Support & feedback

- Issues + design questions: `tarek@invoica.ai`
- TG: `@SkinGem`
- Source (private): `https://github.com/SkinGem/invoica`
- Anchor contract source: `contracts/MandateAnchor.sol` in repo
- State machine: `backend/src/services/mandate/state-machine.ts`
- v0.2 backlog tracked in Invoica's Kognai Notion change log
