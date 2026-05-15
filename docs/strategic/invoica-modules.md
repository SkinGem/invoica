# Invoica Modules — Canonical Module Catalog

**Status:** Draft v0.1 · 2026-05-15
**Owner:** Tarek (Godman)
**Trigger:** Kognai master docs landed 2026-05-15 reframing Invoica's commercial surface from per-transaction fee → per-module credit-based subscription. This document locks the module names + maps current Invoica capabilities to them + flags gaps.

**Companion docs:**
- `~/Documents/Kognai/Master Documents/kog_reconciled_tokenomics_credit_ux.md` — the source of the module framing
- `~/Documents/Kognai/Master Documents/kognai_constitutional_beneficial_unit_rule.md` — pricing constraint (module fees must be < merchant build cost)
- `~/Documents/Kognai/Master Documents/kognai_vault_recovery_operational_spec.md` — Identity/Trust separation principle

---

## 1. Canonical module set

Seven modules. The first three are named in the master docs; **Mandates** is a dedicated module per owner decision 2026-05-15 (BOND mandate executor lives here, not split across Permissions + Settlement); the remaining three resolve the doc's "etc."

| Module | Purpose | Maturity |
|---|---|---|
| **Identity** | Merchant + agent identity records, KYB attestation, selective disclosure | THIN — aspirational |
| **Trust** | PACT mandate verification, Helixa Chamber 2 ceiling, BOND default writeback, reputation feed — **one module, three internal lenses** (static / reputation / ceiling) | STRONG |
| **Permissions** | Agent scope grants + revocation flow, API-key tier, mandate scope enforcement | RAW PRIMITIVES, no merchant-facing surface |
| **Mandates** | BOND recurring-deal authorization + executor, EIP-712 mandate schema, period accounting, default classification | SHIPPED (`@godman-protocols/bond@0.1.0`, npm 2026-05-12) |
| **Invoicing** | Invoice issuance, state machine, DRS receipts, webhook delivery | STRONG (Invoica's nominal core) |
| **Tax** | Multi-jurisdiction VAT + US sales tax, statute citation, confidence scoring | STRONG |
| **Settlement** | On-chain detection (5 chains), AsterPay SEPA, payment events, settlement webhooks | STRONG |

Trust is the foundational module — all others depend on it transitively.

---

## 2. Module specifications

### 2.1 Identity

**Purpose.** Establish who the merchant is, who their counterparty is, and what facts about each are safe to disclose to the other.

**Today's capabilities:**
- `Customer` table with `id`, `email`, `stripe_customer_id`, `default_payment_method_id`
- `ApiKey` table with bcrypt-hashed credentials, tier metadata, customer linkage
- Customer scoping on settle-side endpoints (`Invoice.issuer_customer_id`, `ClinPaySession.issuer_customer_id`)

**Code locations:**
- `backend/src/services/api-keys.ts` — API key issuance + verification
- `backend/src/services/api-key-repo-supabase.ts` — Supabase persistence
- `backend/src/middleware/auth.ts` — request-time customer resolution
- Migrations `012_billing_credits.sql`, `013_invoice_issuer_customer_id.sql`, `014_clinpay_session_issuer_customer_id.sql`

**Gaps:**
- No KYB attestation surface. Merchant signup creates a Customer row; nothing verifies the merchant is who they claim to be.
- No selective disclosure infrastructure. The VR transaction protocol §6.3 envisions Invoica issuing invoices "attributing it to the user's verified identity (selectively disclosed)" — we don't have a credential-presentation layer.
- No bridge to the Vault product (which owns user identity in the Kognai stack).

**Open question — naming overlap with Vault:**
The Kognai stack positions the Vault as the identity product. Calling Invoica's customer/KYB layer "Identity" creates ambiguity. Alternatives: "Onboarding," "Merchant Verification," "Merchant Records." Decision needed before any merchant-facing docs ship.

---

### 2.2 Trust

**Purpose.** Decide whether a counterparty's authorization is valid and whether their reputation supports the requested action.

**Today's capabilities:**
- PACT mandate verification (HMAC-SHA256 over canonical JSON, fail-closed on missing secret, requires `maxPaymentUsdc` + `expiresAt`)
- Helixa Chamber 2 ceiling enforcement (REJECTED / PROBATION / STANDARD / TRUSTED / VERIFIED_KYC tiers with per-invoice USDC caps)
- `HELIXA_POLICY` env var: `fail-closed` (prod default) or `fail-open` (founder-only)
- BOND default model: `WILLFUL_DEFAULT` reduces bulk-pricing tier; `INSUFFICIENT_FUNDS` triggers circuit-breaker grace
- `AgentReputation` table with score, tier, invoicesCompleted, invoicesDisputed

**Code locations:**
- `backend/src/lib/pact-verify.ts` — mandate verification (PACT v0.2)
- `backend/src/lib/helixa.ts` — Helixa credentials + trust ceiling lookup
- `~/kognai/workspace/godman-protocols/bond/src/verify.ts` — BOND mandate verification + default classification
- `backend/prisma/schema.prisma` — `AgentReputation` model

**Sub-capabilities (one module, three internal lenses):**
1. **Static trust** — does this mandate authorize this action?
2. **Reputation trust** — what does Helixa say about this DID's history?
3. **Trust ceiling** — what's the per-invoice USDC cap for this trust tier?

The three converge at the merchant's risk-model layer. Per the vault-recovery doc §11.4: "A merchant query that asks 'should I trust this agent for €10,000?' gets a composite answer drawn from both sources."

**Gaps:**
- No public reputation-attestation writeback API. BOND defaults could write to Helixa; today they only write to local `AgentReputation`.
- No grantor-side "show me my reputation" view.
- Helixa unreachable path is config-gated (fail-closed in prod) but no escalation/notification surface.

---

### 2.3 Permissions

**Purpose.** Allow a principal (human, corporate, or agent) to grant a delegated party (typically an agent) scoped authority, with explicit revocation and clear blast-radius bounds.

**Today's capabilities:**
- API-key tier system (`free`, `paid`) with permissions array on `ApiKey`
- PACT mandate scope: `actions[]`, `resources[]`, `maxPaymentUsdc`, `description`
- BOND `RecurringDealSchema.scope`: `quantity_per_period`, `total_periods`, `amount_per_period`, `cancellation_notice_periods`
- Stripe off-session charge authorization (saved card with `setup_future_usage: 'off_session'`)

**Code locations:**
- `backend/src/services/api-keys.ts` — `ApiKey.permissions: string[]`
- `backend/src/lib/pact-verify.ts` — `MandateScope` interface
- `~/kognai/workspace/godman-protocols/bond/src/types.ts` — `RecurringDealSchema`
- `backend/src/lib/stripe.ts` — `getOrCreateStripeCustomer`, off-session charge

**Gaps:**
- No unified merchant-facing surface. Three separate scope models (API-key, PACT, BOND) live side-by-side without a single view that says "here's everything this agent is currently allowed to do on this merchant's behalf."
- No revocation flow on PACT/BOND mandates beyond `expiresAt` — once a mandate is signed, the only kill switch is letting it expire or invalidating the signing secret.
- No grant-time UX. PACT mandates today are issued programmatically; no merchant clicks "grant this agent up to $50/week."

**This is the most architecturally raw of the six modules.** Permission primitives exist; the merchant-facing surface around them does not.

---

### 2.4 Invoicing

**Purpose.** Issue compliant, durable, audit-grade invoices for transactions an agent has executed. The nominal core of Invoica.

**Today's capabilities:**
- `Invoice` table with sequential `invoiceNumber`, state machine PENDING → PROCESSING → SETTLED → COMPLETED (with state-machine guards)
- Public POST `/v1/invoices` for issuance
- PATCH `/v1/invoices/:id/status` for transitions (with PACT + Helixa checks on SETTLED)
- Bulk operations (`/v1/invoices/bulk/{status,cancel}`)
- DRS receipt minting on SETTLED for ClinPay flow (`@godman-protocols/drs` schema, PACT v0.3.2 stamp)
- Webhook delivery to registered endpoints
- 7-year retention by design (EU compliance)
- Test/sandbox isolation via `Invoice.isTest`

**Code locations:**
- `backend/src/routes/invoices.ts` — main CRUD + state transitions
- `backend/src/routes/invoices-export.ts` — CSV / PDF exports
- `backend/src/routes/invoice-download.ts` — public download links
- `backend/src/services/invoice.ts` — `markAsSettled`, state guards
- `backend/src/services/clinpay/drs-receipt.ts` — DRS receipt mint + flip
- `backend/src/routes/x402-invoice.ts` — standard x402 v2 endpoints (PayAI facilitator)
- `backend/src/routes/sap-execute.ts` — legacy SAP-x402 custom protocol

**Gaps:**
- No merchant-facing invoice-template customization (currently one shape per flow)
- No multi-currency invoice grouping (each invoice is one currency)
- No partial-settlement model (BOND v0.2 question)

---

### 2.5 Tax

**Purpose.** Generate jurisdiction-correct tax lines (rate, statute citation, confidence) on every invoice so the merchant + their auditor have a defensible record.

**Today's capabilities:**
- **US sales tax via AgentTax** — 5 states (CA, TX, NY, FL, WA); statute citation; confidence scoring; `requires_review` flag below 60-confidence threshold
- **UK VAT** — native HMRC engine (`uk-vat.ts`), 20% standard rate, reverse-charge for VAT-registered B2B, statute "UK VAT applied at 20% (HMRC standard rate)" or "UK VAT reverse charge — customer to account for VAT to HMRC (VAT Act 1994 s.8)"
- **EU VAT validator** via VIES API (with Redis caching) — `services/tax/vat-validator.ts`
- **EU local fallback** — 27 EU countries with rate tables (no statute citation yet)
- **`AgentTaxLine` shape** — `source` (`agenttax` / `local_fallback`), `total_tax`, `rate`, `jurisdiction`, `statute`, `confidence_score`, `confidence_level`, `requires_review`, `classification_basis`, `engine_version`, `calculated_at`
- Surfaced in: x402 `/api/x402/tax` endpoint, Invoice paymentDetails.tax, DRS receipt `tax_line`

**Code locations:**
- `backend/src/services/tax/agenttax-client.ts`
- `backend/src/services/tax/uk-vat.ts`
- `backend/src/services/tax/vat-validator.ts`
- `backend/src/services/tax/calculator.ts`
- `backend/src/services/tax/location-resolver.ts`
- `backend/src/services/tax/types.ts`

**Gaps:**
- Tier-2 EU jurisdictions (BG, HR, CZ, etc.) fall back to local rate tables without statute citation — not audit-grade for those countries
- No partial-tax-line generation (e.g., one invoice split across goods-tax + services-tax)
- No tax-line audit log distinct from the invoice itself
- Currency units inconsistency (just fixed for UK VAT on 2026-05-15 — `f710e8e` — but worth a sweep of the calculator family to confirm consistency)

---

### 2.6 Mandates

**Purpose.** Authorize and execute recurring agent-to-agent payment commitments. Sits between Trust (which says *is this counterparty allowed?*) and Settlement (which says *did the money move?*).

**Today's capabilities:**
- `@godman-protocols/bond@0.1.0` (npm, shipped 2026-05-12) — Apache-2.0
  - `RecurringDealSchema` — EIP-712 typed-data, both-party signed
  - `MandateModeHeaders` — `X-Mandate-ID`, `X-Mandate-Period`, `X-Mandate-Total-Periods` on x402 requests
  - `verifyMandateRequest()` — the four executor pre-execution checks (attested on-chain, correct period, amount match, seller signature)
  - `classifyDefault()` — `WILLFUL_DEFAULT` vs `INSUFFICIENT_FUNDS` distinction
  - `trustImpactFor()` — proportional reputation penalty (writes back through the Trust module)
  - Period math: `periodWindowStart()`, `currentPeriod()`, `buildFinalState()`
- BOND_VERSION constant: `0.1`
- 23/23 smoke tests pass

**Code locations:**
- `~/kognai/workspace/godman-protocols/bond/` — package source
- `github.com/Godman-s/bond` — public repo

**Composition with other modules:**
- **Mandates → Trust** for the post-default writeback (willful default lowers the DID's Helixa ceiling for future mandates)
- **Mandates → Settlement** for the actual x402 payment execution (in-period payments can use any x402 scheme — exact, up-to, or batch settlement)
- **Mandates → Permissions** to verify the mandate scope authorizes the requested period payment

**Gaps:**
- Live EAS attestation read/write helpers (BYO via the caller hook today)
- Mandate amendment flow (re-sign vs amendment-attestation)
- Partial-period delivery attestation format
- Multi-party mandates (A → B → C sub-contracting)
- Cross-chain mandates (negotiation on chain X, settlement on chain Y)
- Private mandates (ZK-attested with on-chain commitment)

All v0.2 candidates per the BOND spec's "Deferred to v0.2" list.

---

### 2.7 Settlement

**Purpose.** Detect that a payment has actually landed (on-chain or via fiat rail) and flip the invoice state + mint the receipt that proves it.

**Today's capabilities:**
- **On-chain detection** for 5 chains: Solana, Base, Polygon, Arbitrum, SKALE Base mainnet
- **AsterPay SEPA rail** for fiat (EU MiCA-aligned, EUR collect → real bank account)
- `PaymentEvents` table with `UNIQUE(chain, txHash)` enforcing exactly-once detection
- DRS receipt mint coupled to settlement (1:1 with settled ClinPay session)
- x402 v2 standard endpoints (PayAI facilitator) + legacy SAP-x402 path
- Settlement webhook delivery to registered endpoints
- Settlement detector / poller for chain confirmations

**Code locations:**
- `backend/src/services/settlement/` — chain-specific detectors
- `backend/src/services/settlement-poller.ts` — periodic check
- `backend/src/services/asterpay/` — SEPA collect rail (verify, client, mandate, clinpay-session)
- `backend/src/routes/x402-invoice.ts` — standard v2 endpoints
- `backend/src/routes/sap-execute.ts` — legacy custom protocol
- `backend/src/routes/settlement-summary.ts` — aggregated reporting
- `backend/src/routes/clinpay-reports.ts` — DRS rollup view (new 2026-05-13)
- Migration `004_payment_events.sql`

**Gaps:**
- No cross-chain mandate routing (BOND v0.2 open question)
- AsterPay rail today is sandbox-bilateral; production rail requires the corporate entity (WS-4 work)
- DRS receipts on x402 (non-ClinPay) flow only when explicitly written — not auto-minted on every x402 settlement

---

## 3. Dependency graph

```
                              Trust
                                ▲
                    ┌───────────┼───────────┐
                    │           │           │
                  Mandates  Permissions   (foundation
                    │           │          for all)
                    │           │
                    ▼           ▼
              Settlement ◄── Invoicing ──► Tax
                                ▲
                                │
                             Identity
                          (whose invoice?)
```

- **Trust is foundational.** Every other module routes through it for authorization checks.
- **Mandates → Trust** for default writeback (BOND defaults lower Helixa ceiling).
- **Mandates → Settlement + Permissions** for execution.
- **Identity feeds Invoicing** (whose invoice is this?).
- **Invoicing depends on Settlement** for state transitions.
- **Tax depends on Identity** (whose jurisdiction governs?).
- **Permissions cuts across all six** — every action passes a scope check.

If billing becomes per-module activation: **Trust cannot be disabled** (it would silently break the other modules). Either make it permanently-on / non-billable, or include it implicitly in every other module's price. **Mandates is opt-in** — a merchant on flat per-call x402 doesn't need it.

---

## 4. Mapping to legacy "Product Suite" language (CLAUDE.md)

For continuity with the existing CLAUDE.md product table:

| CLAUDE.md name | New module | Notes |
|---|---|---|
| Invoice Middleware (x402) | Invoicing + Settlement + Permissions | Splits across three |
| Tax Compliance Engine | Tax | Direct rename |
| Settlement Detection | Settlement | Direct rename |
| Dashboard & Analytics | (cross-cutting, not a module) | UX surface, not a billing unit |
| Reputation Scoring API | Trust (reputation sub-capability) | Sub-bundle of Trust |
| Agent Marketplace | — | Out of scope for module catalog (different product) |
| Gas Backstop | Settlement (deprioritized) | Could be a Settlement sub-feature |
| SOL Incinerator | — | Deprioritized |

---

## 5. Pricing constraint (constitutional)

Per `kognai_constitutional_beneficial_unit_rule.md`:

> *"Invoica module fees. Must be lower than the merchant's cost of building and maintaining the equivalent capability internally."*

For each module, the merchant's build-and-maintain cost is roughly:

| Module | Merchant build cost (rough) | Fee ceiling |
|---|---|---|
| Identity | Low — most merchants already have one | Tight; this module is hard to sell standalone |
| Trust | High — Helixa integration + PACT verify + reputation infra | Wide margin available |
| Permissions | Medium — scope/grant systems are common | Moderate margin |
| Mandates | High — EIP-712 + EAS + default model + executor; building this is months of work | Wide margin |
| Invoicing | High — invoice numbering + state + retention + audit | Wide margin |
| Tax | Very high — multi-jurisdiction tax engines cost $10k+/mo from incumbents | Widest margin |
| Settlement | High — chain integrations + SEPA rails + reconciliation | Wide margin |

**Tax has the strongest pricing power.** Mandates, Trust, and Settlement next. Identity is the weakest standalone module (most merchants have a Stripe Customer or equivalent already).

---

## 6. Resolved decisions

All locked 2026-05-15.

- ✅ **Trust is one module.** Three sub-capabilities (static authorization / reputation lookup / trust ceiling) live as internal lenses, not separate billing units. They converge at one risk-model output.

- ✅ **BOND mandate executor gets a dedicated 7th module — "Mandates".** Not split across Permissions and Settlement. Mandates is opt-in; merchants on flat per-call x402 don't activate it.

- ✅ **Identity name retained.** "Identity" stays the Invoica module name. The Kognai stack has two identity surfaces (Invoica = merchant identity, Vault = consumer/human identity) — they are architecturally distinct and apply to different sides of the transaction. Disambiguate at point-of-use ("Invoica Identity" vs "Vault Identity") when both products appear in the same conversation. Same pattern as Stripe's "Customer" vs a CRM's "Customer."

- ✅ **Trust is implicit, not separately billable.** Trust is foundational — disabling it would silently break every other module. Cost is folded into the per-call rates of the other modules. No standalone Trust activation step, no Trust subscription fee.

- ✅ **Modules can activate atomically.** A merchant can activate Tax without Invoicing, Mandates without Settlement, etc. Each module is a standalone API surface. Cross-module dependencies (e.g., Invoicing reading Settlement state) still resolve when both are active, but inactive modules don't block activated ones.

- ✅ **Billing model = module activation gates API access; pay-per-use within active modules.**
   - Module activation is a binary opt-in (the merchant declares which modules they want exposed to their integration). Activation itself is free / not separately charged.
   - Per-call debit happens against the merchant's credit balance for any call into an activated module.
   - Reconciles cleanly with the May 7 Stripe-billing infra: pre-loaded credit balance + per-event debit. The "1% on settlement" mechanic shipped May 7 becomes the **Invoicing module's** per-call rate (specifically the on-SETTLED hook); other modules will have their own per-call rates TBD.
   - Trust calls (PACT verify, Helixa lookup) folded into the caller-module's rate, never debited separately.

---

## 7. What changes for current work

| Active thread | Impact |
|---|---|
| Stripe billing M2 (shipped May 7) | Don't change the infra. **Reframe "1% on settlement" as the Invoicing module's per-call rate** (specifically on the SETTLED hook). Other modules (Tax, Settlement, Mandates) need their own per-call rates, TBD. Trust calls fold into the caller-module's rate. |
| AG PoC (week of May 18) | Pitch unchanged. ClinPay flow = Invoicing + Settlement + Tax modules activated; Trust is implicit; Mandates inactive (no recurring deals yet — All Global is per-completion). Pricing stays at 2% / floor / cap, framed as the Invoicing module's per-call rate. |
| BOND v0.1 (shipped May 12) | **Now the foundation of the Mandates module.** Already aligned. |
| Docs site (docs.invoica.ai) | New `/concepts/modules` page summarizing the 7 modules. PACT page (live) sits inside the Trust narrative. BOND deserves its own page under Mandates. |
| Frontend dashboard | New surface: `/modules` page showing which are active per merchant + per-module debit history. Module-activation toggles. Replaces the legacy "Billing" page in the long run. |

---

## 8. Next steps in priority order

1. ✅ **Codename freeze 2026-05-15** — names locked: Identity / Trust / Permissions / Mandates / Invoicing / Tax / Settlement. Future docs / frontend / billing reference this catalog.
2. **Per-module per-call rate decisions** — Invoicing rate is shipped (1% on SETTLED). Tax, Settlement, Mandates, Permissions, Identity rates need owner-set numbers. Constrained by §5 (must be < merchant build cost).
3. **Docs site update** — `docs.invoica.ai/concepts/modules` index page + one page per module. PACT page (live) already fits inside Trust. BOND deserves its own page inside Mandates.
4. **Frontend planning** — `app.invoica.ai/modules` page design. Module-activation toggles + per-module debit history.
5. **Module-activation gate in backend** — middleware that checks "is this module active for this customer?" before serving the call. Currently every endpoint is implicitly active for every customer; explicit activation is part of the new model.
6. **Billing reframe** — when ready (`don't touch billing for now` per 2026-05-15 owner instruction), reconcile the May 7 infra with the per-module-activation gate. Module activation = binary flag on Customer; per-call debit logic stays.
7. **Identity gap closure** — design selective-disclosure infrastructure (the VR transaction protocol §6.3 envisions Invoica issuing invoices with selectively-disclosed buyer identity). Module name kept; the surface needs building.

---

**Living document.** Last updated 2026-05-15 — same day the Kognai master docs forced the framing. Will revise as decisions land.
