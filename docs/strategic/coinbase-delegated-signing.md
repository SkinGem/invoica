# Coinbase Delegated Signing — Design + Security Model

**Status:** Draft v0.1 · 2026-05-18
**Source:** INTEL-049 (Kognai Notion Change Log) + Coinbase CDP docs (https://docs.cdp.coinbase.com/embedded-wallets/delegated-signing)
**Purpose:** Lock the design before implementation. Spec the security model around the broad-scope reality.

---

## 1. What this unlocks

Without delegated signing, every Invoica settlement requires the sponsor agent (or a human) to be present to sign. With it:

- Sponsor grants Invoica a time-bound delegation at study setup
- CRO webhook fires → Invoica backend signs the x402 payment autonomously
- Patient receives EUR within minutes, no sponsor presence required
- Same pattern enables: recurring B2B invoice payments, escrow auto-release, async ClinPay wallet payouts

This is the difference between "semi-autonomous" and "truly agentic" ClinPay.

## 2. ⚠ Security reality

Per the current Coinbase CDP docs, **operation-specific scoping is NOT a supported feature.** A granted delegation gives broad signing authority — any of these operations works under the same delegation:

- `signEvmTransaction`, `signEvmMessage`, `signEvmTypedData`
- `sendEvmTransaction`, `sendEvmAsset`, `sendUserOperation`
- `createEvmEip7702Delegation`
- Solana equivalents

The INTEL-049 ticket assumed we could request `sendEvmAsset`-only scope from Coinbase. **That request remains to be made — likely as an enterprise feature ask.** Until/unless granted, Invoica must enforce scope at the application layer.

## 3. Mitigation: Invoica enforces scope before calling CDP

A wrapper service (`backend/src/services/coinbase-cdp/delegated-signer.ts`) sits between Invoica and the CDP SDK. Every call goes through it. The wrapper:

1. Checks the operation against an allowlist (only `sendEvmAsset`, no exceptions)
2. Validates the destination address is in the AsterPay-settlement allowlist
3. Validates the amount against the active PACT mandate's `maxPaymentUsdc`
4. Validates the period (if BOND mandate) hasn't been settled already
5. Writes an immutable audit log entry BEFORE the CDP call
6. Calls `cdp.endUser.sendEvmAsset` with the verified params

Anything that doesn't pass all 5 checks is refused at the wrapper layer. Compromise of Invoica backend would still be bounded: the wrapper is the only path to CDP, and it only signs payments to known settlement addresses within mandate-authorized amounts.

## 4. Delegation lifecycle constraints

| Aspect | Decision | Reasoning |
|---|---|---|
| Default delegation duration | **7 days** | Per-week sponsor re-grant. Bounded blast radius. Much shorter than the 30 days TICKET-048 sketched. |
| Max delegation duration | **30 days** (configurable per sponsor tier) | Enterprise sponsors may demand longer cycles; capped to prevent indefinite grants |
| Scope type | **User-scoped** (not account-scoped) | Sponsors typically have one funding wallet per study; user-scope simpler |
| Auto-revoke triggers | Study close, sponsor manual revoke, anomaly detection | Anomalies: unusual destination, off-pattern amount, off-pattern timing |
| Re-grant cadence | Owner notifies sponsor 24h before expiry | Smooth UX, no surprise lapses |

## 5. Data model

New table `SponsorDelegation`:

```sql
CREATE TABLE "SponsorDelegation" (
  id                       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sponsor_customer_id      TEXT NOT NULL REFERENCES "Customer"(id) ON DELETE CASCADE,
  cdp_user_id              TEXT NOT NULL,           -- the CDP end-user UUID
  cdp_address              TEXT NOT NULL,           -- the EVM address the sponsor's wallet uses
  delegation_scope         TEXT NOT NULL CHECK (delegation_scope IN ('user', 'account')),
  granted_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at               TIMESTAMPTZ NOT NULL,
  revoked_at               TIMESTAMPTZ,
  revoked_reason           TEXT,
  active_status            TEXT NOT NULL CHECK (active_status IN ('active', 'expired', 'revoked', 'anomaly_locked')),
  -- One active delegation per sponsor (CDP enforces this on their side too)
  CONSTRAINT one_active_per_sponsor EXCLUDE USING gist (
    sponsor_customer_id WITH =,
    active_status WITH =
  ) WHERE (active_status = 'active')
);
CREATE INDEX idx_sponsor_delegation_sponsor ON "SponsorDelegation"(sponsor_customer_id) WHERE active_status = 'active';
```

New table `DelegatedSigningAuditLog` (immutable):

```sql
CREATE TABLE "DelegatedSigningAuditLog" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  delegation_id   TEXT NOT NULL REFERENCES "SponsorDelegation"(id),
  invoice_id      TEXT REFERENCES "Invoice"(id),
  mandate_hash    TEXT,                   -- PACT or BOND mandate, if applicable
  operation       TEXT NOT NULL,          -- always "sendEvmAsset" in v0.1
  destination     TEXT NOT NULL,          -- on-chain target address
  amount_usdc     NUMERIC(19, 6) NOT NULL,
  network         TEXT NOT NULL,          -- "base", "polygon", etc.
  webhook_trigger TEXT,                   -- the CRO webhook event that triggered this
  cdp_tx_hash     TEXT,                   -- the resulting on-chain tx hash (null if failed)
  status          TEXT NOT NULL CHECK (status IN ('pending', 'submitted', 'confirmed', 'failed', 'denied_at_wrapper')),
  denial_reason   TEXT,                   -- populated only when wrapper denied the call
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_delegated_audit_delegation ON "DelegatedSigningAuditLog"(delegation_id, created_at DESC);
CREATE INDEX idx_delegated_audit_invoice ON "DelegatedSigningAuditLog"(invoice_id) WHERE invoice_id IS NOT NULL;
```

Audit log is append-only by convention (no DELETE/UPDATE — enforced at app layer + a DB role permission for production).

## 6. API surface (Invoica-side)

```
POST /v1/sponsors/:customer_id/delegations/grant
  Initiates the grant flow. Returns the frontend SDK config the
  sponsor's browser uses to call cdp.createDelegation().

POST /v1/sponsors/:customer_id/delegations/confirm
  Frontend posts the granted delegation back. Backend persists to
  SponsorDelegation table.

POST /v1/sponsors/:customer_id/delegations/revoke
  Sponsor-initiated revoke. Wrapper calls cdp.endUser.revokeDelegationForEndUser().

GET  /v1/sponsors/:customer_id/delegations
  List active + historical delegations for sponsor dashboard.

INTERNAL: backend signer
  delegatedSigner.sendUsdc({ sponsorId, mandateHash, destination, amountUsdc, network, webhookTrigger })
  → Runs 5-check wrapper, writes audit log, calls cdp.endUser.sendEvmAsset
```

All endpoints scoped via `Invoice.issuer_customer_id` / `Customer` records.

## 7. Files to create (when implementation greenlit)

```
supabase/migrations/015_sponsor_delegations.sql       (new — schema above)
backend/src/services/coinbase-cdp/
  ├─ delegated-signer.ts                              (wrapper, the 5-check enforcer)
  ├─ delegation-lifecycle.ts                          (grant / revoke / expiry watcher)
  ├─ types.ts
  └─ cdp-client.ts                                    (singleton CdpClient instance)
backend/src/routes/sponsor-delegations.ts             (Grant/Confirm/Revoke/List)
backend/src/services/clinpay/                         (modify: settle-side fires delegatedSigner)
frontend/app/sponsors/delegations/page.tsx            (sponsor-facing grant UI)
```

Estimated effort: **5-7 person-days** for the backend + frontend + migration + tests. Plus owner action items below.

## 8. Owner action items (before implementation greenlit)

1. **Sign up for Coinbase CDP** at https://portal.cdp.coinbase.com — get `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CDP_WALLET_SECRET`
2. **Enable Delegated Signing** in CDP Portal → Embedded Wallets → Policies
3. **Request operation-specific scoping as an enterprise feature** — write Coinbase CDP support with this brief:

   > *Subject: Operation-scoped delegation request for enterprise integration*
   >
   > Invoica is integrating Delegated Signing for an enterprise clinical-trial payment use case (ClinPay). Sponsors grant time-bound delegations so we can settle USDC payments to a known set of escrow/payout addresses upon CRO webhook events.
   >
   > Current broad scope works at the application layer (we enforce `sendEvmAsset` only + destination allowlist + amount caps in our wrapper). However, for enterprise sponsor trust, we'd like to request **operation-specific scoping at the CDP layer** restricting our delegation to `sendEvmAsset` only.
   >
   > Use case volume: starting at €60k-€304k/year, scaling to €1.5M+ within 12 months across multiple sponsor customers in the healthcare market research vertical.
   >
   > Is this available as an enterprise feature, or on the roadmap?

4. **Decide max delegation duration** for sponsor tiers (7d / 30d / custom for enterprise)
5. **Decide anomaly detection thresholds** (unusual destination = any address not in allowlist; off-pattern amount = > 110% of mandate cap; off-pattern timing = > X std-dev from sponsor's typical webhook cadence)

## 9. Composition with PACT + BOND

Delegated Signing is the *execution* primitive — the cryptographic act of signing the on-chain tx. PACT/BOND are the *authorization* primitives — who's allowed to spend, how much, and over what period.

The chain:

```
Sponsor signs PACT (or BOND) mandate
    ↓ (authorization: "I authorize €X on Y studies for Z duration")
Sponsor grants CDP delegation to Invoica
    ↓ (execution capability: "Invoica can sign txs for me until expiry")
CRO webhook fires
    ↓
Invoica's wrapper checks mandate scope + destination + amount
    ↓
Wrapper calls cdp.endUser.sendEvmAsset
    ↓
USDC moves on Base → AsterPay → SEPA → bank
```

PACT/BOND say *what's authorized*. CDP delegated signing says *how Invoica acts on that authorization without the sponsor being online*. Both are required for fully agentic execution.

## 10. Open questions

1. **Are sponsors comfortable granting CDP-broad delegations** even with Invoica's wrapper guarantees? May need legal language in the sponsor onboarding contract.
2. **Multi-network strategy:** delegation is per-network (Base, Polygon, etc.). For x402-on-Solana flows, separate delegation needed.
3. **CDP outage handling:** if Coinbase CDP is down, Invoica's settlement path is blocked. Fallback to manual sponsor signing? Defer settlement?
4. **Pricing:** CDP delegated signing pricing is not documented publicly. If per-call fee, must be < AG's per-payout settlement margin to preserve unit economics.
5. **Audit log retention:** 7 years (matches EU invoice retention) seems right but should confirm with legal once entity is set up.

## 11. Decision: build now or defer?

Arguments **for now:**
- AG demo conversation gets stronger ("fully agentic, no human in the settlement loop")
- Unblocks LEAD-001 enterprise recurring-payment story
- True agentic execution is the BOND v0.1 promise; right now BOND requires the seller to be present
- Coinbase CDP team likely to amplify a customer story about delegated signing

Arguments **for defer:**
- AG demo on Wed/Thu doesn't require it (we can demo with the current semi-agentic flow + verbally say "delegated signing comes next")
- 5-7 days of engineering vs the sponsor dashboard work which AG will see in week 2
- Owner action items (CDP signup + enterprise scope request) take real time too
- The current ClinPay flow already works without it

**Recommended:** **defer the implementation 2-3 weeks** until after AG demo lands. Use AG's actual operational feedback ("we wish settlement happened without us being online") to validate the priority. Spend the next 2 weeks on items #2 (sponsor dashboard) and #3 (pitch-deck reframe) which directly affect AG conversion.

Counter-recommend if: enterprise lead (LEAD-001) or Coinbase CDP team explicitly asks for delegated signing as a precondition to next conversation. Then build immediately.

---

**Document complete.** Implementation scaffolding deferred per Section 11 recommendation. When greenlit, this doc + Section 7 file list + Section 5 schema is the starting point.
