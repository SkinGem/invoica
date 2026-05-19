# Legal Entity Setup — Owner Action Checklist

**Status:** Brief, not lawyer work · 2026-05-18
**Source:** STRATEGY ClinPay separate entity (Notion 2026-04-24) + kognai_pre_scale_readiness_brief (2026-05-15)
**Trigger:** AG conversion to paid pilot blocks on having a counterparty entity. AsterPay LOI also blocks on this. Multiple threads converge here.

---

## 1. Why this matters now

Three concrete blockers:

1. **AG paid pilot** — Franco's procurement will ask for a counterparty entity. Today, Founder-as-individual would have to sign. Workable for the PoC, not workable beyond.
2. **AsterPay LOI / MSA** — Petteri's partnership progresses to a signed MSA at production. Counterparty needs to be a registered entity, not a person.
3. **Stripe live keys** — production Stripe processing requires a registered business with banking documentation (the same is true for Bridge for USDC ACH).
4. **Helixa, PayAI, future partners** — same pattern. Every commercial agreement that scales needs an entity.

The Kognai master docs (`kog_reconciled_tokenomics_credit_ux.md`, `kognai_pre_scale_readiness_brief.md`) explicitly call out:

> *"Possibly a separate jurisdiction for the token entity (Estonia, BVI, or similar) and a French SAS for Invoica's merchant business."*

> *"Before… the AsterPay LOI is signed, a corporate entity… must exist."*

## 2. Recommended structure

| Entity | Jurisdiction | Purpose |
|---|---|---|
| **Invoica SAS** (or similar French co.) | France | The merchant-side SaaS business. Customer contracts, AsterPay MSA, Stripe processing, Helixa partnership. Founder lives + operates here. |
| **ClinPay (subsidiary or sister)** | France or Ireland | Clinical-trial-specific commercial entity. May or may not stay separate depending on legal advice. Per STRATEGY doc: separate keeps the IQVIA exit thesis cleaner. |
| **Kognai Labs (token entity)** | Estonia / BVI / similar | Holds KOG token rights, IP for Godman Protocols (PACT, BOND, DRS, etc.), open-source license assignments. Lower-friction crypto jurisdiction. |

The Invoica side can run for 3-12 months as just the French SAS before the token entity is needed. **Invoica SAS is the priority.**

## 3. Concrete steps (owner action sequence)

### Step 1 — Choose a French legal counsel
Ask: business formation + SaaS + payment processing + GDPR
Sources: French legal-tech firms (Hubsy, Captain Contrat, Legalstart), or traditional firms (Latournerie Wolfrom, Reed Smith Paris).
Cost: typically €800-€2,000 to incorporate a basic SAS; €3-8k if you want regulated/payment-services advice baked in.

### Step 2 — Decide on capital + shareholders
- Sole shareholder = simplest (SAS unipersonnelle / SASU)
- Capital: €1 minimum legally; €1,000-10,000 is normal for credibility
- Director: yourself
- Equity split for future: leave room for advisors / partners / employee pool

### Step 3 — File the incorporation
French SAS typical timeline: 1-3 weeks via legal-tech provider, 4-8 weeks via traditional firm.
Deliverables: KBIS extract (≈ certificate of incorporation), SIREN/SIRET numbers, articles of association.

### Step 4 — Open business banking
Options: traditional French banks (BNP, Société Générale, Crédit Agricole — slow), neo-banks (Qonto, Shine, Revolut Business — faster), or US-based (Mercury — only if remote entity allowed).
Need: KBIS, ID, proof of address.
Timeline: 1-4 weeks. Qonto is typically fastest.

### Step 5 — Sign first commercial contracts under the entity
Order of priority:
1. AsterPay MSA (replaces the current informal partnership working relationship)
2. AG paid pilot agreement
3. Stripe live keys + business profile
4. Helixa partnership agreement (when commercial terms land)
5. PayAI x402 facilitator MSA (once they have an entity too)

### Step 6 — Set up accounting
French SAS needs: French chartered accountant (expert-comptable), monthly bookkeeping, annual tax filing. Cost: €100-400/month for early-stage.

### Step 7 — Plan tax + VAT registration
SAS in France is automatically VAT-registered (unless small-entity exemption). The Invoica SaaS revenue is B2B SaaS — reverse-charge VAT for EU customers, regular VAT for French customers.

## 4. What can wait (deferred until 6-12 months in)

- Token entity (Estonia/BVI) — only matters when KOG goes public or when the open-source IP needs a separate home
- Multi-jurisdiction subsidiaries — only when expanding into specific markets that demand local presence
- ClinPay separate entity — depends on IQVIA-exit thesis being concrete; can run as Invoica SAS division for now

## 5. Costs (rough)

| Item | Cost |
|---|---|
| SAS incorporation (legal-tech) | €800-2,000 one-time |
| Bank account setup | €0-200 (some banks charge) |
| Monthly bookkeeping | €100-400/month |
| Annual tax filing | €1,000-3,000/year |
| Initial capital | €1-10,000 (refundable as company capital) |
| **Total Year 1** | **€3,000-€10,000** |

Comfortably within the runway and recoverable from the first AG production study.

## 6. Critical path timing

| Milestone | Earliest date |
|---|---|
| Engage legal counsel | This week |
| File incorporation | Within 2 weeks of engagement |
| KBIS issued | 1-3 weeks after filing |
| Bank account opened | 1-4 weeks after KBIS |
| **AG paid pilot can be signed under the entity** | **6-10 weeks total** |

This matches AG's likely timeline anyway:
- This week: PoC demo
- Next 2 weeks: PoC validation cycles
- Weeks 3-6: production-study scoping
- Weeks 6-10: contracts + integration
- AG paid pilot live: roughly mid-July 2026

If Invoica SAS exists by early-to-mid July, the timeline holds. Engagement THIS WEEK is the trigger.

## 7. What can you do under personal name in the meantime

- ✅ PoC contracts (the founder as individual sole prop / freelancer)
- ✅ Sandbox testing with AG
- ✅ AsterPay sandbox MSA addendum (already happening)
- ❌ Production processing of customer money beyond ~€10k aggregate
- ❌ Multi-counterparty MSAs (Stripe + AsterPay + PayAI all need the same entity)
- ❌ Signing partnership deals with regulated parties (Helixa)
- ❌ Hiring (employment law) — not relevant yet but worth knowing

The PoC + early-week-of-engagement work is fine on personal. **Anything from production-paid-pilot onward needs the entity.**

## 8. Action items (owner-only)

- [ ] Pick a legal-tech provider this week (Hubsy, Captain Contrat, or Legalstart are the fastest French options)
- [ ] Initiate incorporation with French SAS (sole-shareholder, you as director)
- [ ] In parallel: open a Qonto / Shine business account application (can start before KBIS; finalizes when KBIS issues)
- [ ] Engage an expert-comptable (chartered accountant) for monthly bookkeeping
- [ ] Track timeline weekly: KBIS issued, bank ready, MSA-ready
- [ ] Once entity is live, transition AsterPay MSA + AG production contract to it

## 9. Things to think about, even if not act on

- **Equity:** if there's any chance you'll bring on co-founders, advisors, or take outside investment within 12 months, structure the SAS to allow easy equity issuance (don't over-concentrate; consider a small advisor pool)
- **Domain ownership:** invoica.ai is currently in your name; transfer to the SAS once it exists
- **IP assignment:** any code/IP you've personally written for Invoica should be assigned to the SAS via a one-page contribution agreement at incorporation
- **GDPR:** as soon as the SAS processes EU personal data (panellist info, even hashed), it's a data controller — needs a privacy policy, DPA template ready for AG, and possibly a DPO designated (for some thresholds)

---

**Bottom line:** This is owner action, not engineering. The path is clear and well-trodden (thousands of French SAS incorporated every month). The lift is mostly inertia + paying a legal-tech €1k. Recommend: engage this week, on the same parallel track as the AG demo prep.
