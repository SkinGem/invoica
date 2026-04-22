# Invoica — Agentic.Market Service Listing

**Prepared:** 2026-04-22
**For:** https://agentic.market (Coinbase Developer Platform — launched 2026-04-20)
**Submission channel:** check CDP Discover dashboard / submission form; or direct to CDP developer-relations team if invite-only

## Service summary

**Invoica** — the compliance backbone for agentic commerce. Any AI agent transacting via x402 can call Invoica to issue a tax-compliant invoice in real time, reconciled to the on-chain settlement.

**Tagline:** *"Every agent transaction. Every chain. One compliant invoice."*

## Category

**Infrastructure** (alongside AWS Lambda, Alchemy). Possibly Compliance if the registry adds that bucket.

## Endpoint

- Base URL: `https://api.invoica.ai`
- x402 manifest: `https://api.invoica.ai/.well-known/x402`
- Primary capability: `POST /v1/invoices` — create a tax-compliant invoice; `PATCH /v1/invoices/:id/status` — mark SETTLED with on-chain tx proof
- API keys: issued via self-service signup at `https://app.invoica.ai`

## Pricing (metered in USDC on x402)

- **$0.01 USDC per invoice issued** — covers standard invoice creation, tax calculation, settlement detection
- **$0.001 USDC per invoice queried** — read endpoints
- **Free tier** for first 50 invoices/month (matches plan §4.1 Stripe tiering — TBD at Stripe wire-up)

## Supported chains (live)

- Base mainnet (USDC via EIP-3009)
- Polygon mainnet (USDC)
- Solana mainnet (USDC SPL via native x402 adapter)
- Arbitrum mainnet (USDC, added 2026-04-20 via commit `94bfd50`)
- Ethereum Sepolia (testnet)

## Jurisdictional tax coverage (live, verified 2026-04-22)

- **EU VAT: 27 member states** — rates updated to 2025/2026 reality including Estonia 24%, Finland 25.5%, Romania 21%, Slovakia 23% (commit `60293e9`)
- **US sales tax: CA, TX, NY, FL, WA** — state rates plus per-state economic nexus monitoring ($500K CA/TX/NY with 100-txn NY trigger, $100K FL/WA) (commit `60293e9`)
- **UK VAT (20%):** pending dedicated handler `enh/uk-vat-handler` branch — owner-approved follow-up to recent tax audit
- **Japan consumption tax (10%):** scaffolded via AgentTax integration, production wiring ticket open

## Money-safety guarantees (shipped for M1 gate 2026-04-24)

- **Duplicate-settlement impossible at DB level.** `UNIQUE(chain, txHash)` constraint on PaymentEvents table prevents the same on-chain tx from settling two invoices (commit `7d931f0` / migration `004_payment_events.sql`). Replay test: `PASS 5/5` (verified 2026-04-21).
- **Terminal state machine.** `SETTLED → COMPLETED`, `COMPLETED → REFUNDED` are one-way; no silent rollbacks (commit `dae0f6a`).
- **Explicit Helixa trust policy.** `HELIXA_POLICY=fail-closed` in prod by default — agents with sub-threshold reputation scores are rejected, not silently admitted (commit `dae0f6a`).

## Security (verified 2026-04-21 pentest dry-run, 0 findings)

- All data routes require API-key auth (commit `e963372`)
- Admin endpoints HS256 JWT verify with signature + aud + iss + email allowlist (commit `dc926a6`)
- CSP `default-src 'none'`, HSTS `max-age=31536000`, X-Frame-Options DENY, X-Content-Type-Options nosniff (commit `83a8430`)
- 0 Critical / 0 High / 0 Medium findings in pentest dry-run (report `reports/security/pentest-dry-run-2026-04-24.md`)

## PACT mandate integration (live)

- Any agent can attach a PACT mandate (JSON in `X-PACT-Mandate` header) — Invoica verifies signature, scope, expiry, and enforces Helixa trust ceilings before accepting the invoice
- First-class support for payer/submitter role separation (per EIP-3009 patterns — commit history includes Nova/Aria canonical demo)

## Why list Invoica on Agentic.Market

Every service on Agentic.Market sells to AI agents. Each sale is a taxable event in some jurisdiction. Today, agent sellers either (a) ignore tax compliance and accumulate liability, or (b) hand-roll per-transaction tax logic per chain. Invoica is the single x402-native endpoint that solves both ends:

1. **For agent sellers:** drop in Invoica at your x402 endpoint → every buyer auto-receives a compliant invoice with correct jurisdiction tax → you have an audit trail for HMRC/IRS/BMF/etc.
2. **For agent buyers:** your outbound x402 payments get invoiced → clean books → reimbursement or tax-write-off evidence regardless of who you bought from.

Specifically complementary to Agentic Wallets (launched 2026-02-11): wallets handle the money movement, Invoica handles the paperwork that tax authorities demand for that money movement.

## Integration pattern (dev quickstart)

```bash
# An agent buys data from Bloomberg on Agentic.Market via x402.
# After the payment settles, it POSTs to Invoica:

curl -X POST https://api.invoica.ai/v1/invoices \
  -H "Authorization: Bearer inv_live_..." \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "X-PACT-Mandate: {\"grantor\":\"agent-abc\",...}" \
  -d '{
    "customerEmail": "agent-abc@buyers.x402",
    "customerName": "Agent ABC",
    "amount": 15.00,
    "currency": "USDC",
    "chain": "base",
    "buyerCountryCode": "DE",
    "serviceDescription": "Bloomberg real-time FX quotes, 1h window",
    "paymentDetails": {"txHash": "0xabc...", "settledAt": "..."}
  }'
```

Response: invoice ID, invoice number, line items with DE VAT at 19%, settlement status, PDF download URL.

## Team + transparency

- Built by: SkinGem (founder) + AI agent swarm under Conway Edition governance (`constitution.md`)
- Open-source status: core protocol plumbing (PACT, x402 adapters) on GitHub; SaaS code private
- Plan: A+ investability track, M1 gate closing 2026-04-24 — see `plans/a-plus-investability-plan.md`
- Legal entity: Delaware C-corp formation in progress (plan §M2-LEG-01)

## Contact

- Founder: Tarek (skininthegem@gmail.com)
- Support: support@invoica.ai
- Docs: https://docs.invoica.ai
- Status page: https://status.invoica.ai (planned per plan §M2-CLAIM-03)
- GitHub: https://github.com/SkinGem/invoica
