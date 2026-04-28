# Owner Directive DIR-010 — ClinPay Sprint 1 shipped, Sprint 2 KYB phase begins

**Date:** 2026-04-28
**From:** Owner
**To:** CEO / future sessions
**Priority:** Informational — operational record

## SPRINT-001 closed ✅

ClinPay MVP Sprint 1 (TICKET-048) shipped end-to-end and verified live in production sandbox. Days 1-7 of the sprint task list are done; the full happy path is working against AsterPay's sandbox endpoints.

### What shipped today

| Day | Deliverable | Commit |
|-----|------|--------|
| 1   | env-var placeholders + .gitignore hardening | `ea0e3af` |
| 2-3 | redirect handler + AsterPay webhook handler (HMAC + idempotency) | `ea0e3af` |
| —   | route ordering fix (clinpay before authenticate) | `2c3b24a` |
| 4-5 | ClinPaySession migration 009 + synth mandate + invoice issue + settle | `18ceb54` |
| —   | JSONB→TEXT migration 010 (PACT mandate signature byte-preservation) | `5e3268e` |
| —   | invoiceNumber manual increment | `a74a163` |
| —   | persist before settle; treat 402 as deferred | `5e2201f` |
| 6-7 | DrsReceipt migration 011 + mint + Invoice→SETTLED + AgentTax | `ba5f6dd` |

Plus parallel TICKET-044 PACT hardening (commit `66d47fa`): fail-closed on missing secret, schema-required `maxPaymentUsdc`/`expiresAt`, `crypto.timingSafeEqual` for HMAC.

### Verified live

End-to-end test session `d6c07090-3b73-47ea-8bcc-a9404da11c90` (2026-04-28 08:04 UTC):

- AsterPay session created via `POST /v1/collect/sessions` (200)
- Patient submitted IBAN on hosted page
- AsterPay `session.submitted` callback → HMAC verified → mandate verified → Invoica invoice #1775224099 issued (75 EUR/USDC, zero PII placeholders)
- Invoica called AsterPay `/v1/collect/settle` with sandbox bypass → 200
- AsterPay `session.settled` callback → DRS receipt `drs-cdd4f470-a8d4-4ab2-bb2f-ba1fa34c9034` minted, invoice flipped PENDING → SETTLED, AgentTax tax line recorded ($5.4375, US-CA, 7.25%)

All idempotent. Both callbacks should be in AsterPay's `callbacks_ledger` for that session.

## AsterPay partnership state

Petteri (AsterPay BD/dev) shipped two fixes 2026-04-27:
1. `/by-token` lookup bug (token consumed on read) — split into read-only `validateToken()` + atomic `consumeToken()` for `/submit`
2. BYTEA roundtrip bug on PII storage — encrypted bytes now hex-encoded for PostgREST

Plus the Stripe-style sandbox bypass: keys with prefix `invoica_sk_sb_` skip the x402 paywall on `/v1/collect/settle` automatically. Production keys (`invoica_sk_live_`, Sprint 2) will still require real x402 settlement.

## Sprint 2 authorizations

This directive authorizes the following Sprint 2 work (target start: 2026-04-29):

1. **KYB documentation to AsterPay** — Kbis + UBO + volume estimates queued for delivery 2026-04-29/30 per CEO Command Center timeline.
2. **Live API keys** — once AsterPay KYB approves (target mid-May), they issue `invoica_sk_live_` keys; we wire `@x402/fetch` for real settle calls.
3. **Real EUR rails** — SEPA settlements move real funds in Sprint 2; Travel Rule cap (€999) enforcement remains.
4. **DRS receipt on-chain mint** — Sprint 2 adds Base on-chain mint step; `settlement_tx_hash` becomes the real on-chain hash instead of sandbox `provider_ref`.
5. **AgentTax production wiring** — set `AGENTTAX_API_KEY` on Hetzner before first US-jurisdiction sponsor goes live (today's flow used local fallback at 7.25% CA default with `requires_review: true`).
6. **CRO authentication** — `/api/redirect-to-payment` is currently public for sandbox; add authentication before any real CRO traffic.
7. **DB-backed nonce idempotency** — replace in-memory `SEEN_NONCES` Map (lost on restart) with Supabase-backed table.
8. **Sequence-based `invoiceNumber`** — current `max+1` pattern is race-prone.

## Outstanding ops issues observed today

- **Sprint-runner runaway (URGENT):** sprint-runner shows status `…90m` (errored/throttled) yet has pushed 5+ duplicate `feat(security): M1-SEC-HOTFIX-01 - fix` commits in the last 24h. Git history is being polluted. **Halt and investigate before next swarm work.**
- **GitHub PAT rotation completed** (closed today): leaked `ghp_aFf...QL` revoked, both Mac + Hetzner now on SSH key auth.
- **PM2 cron processes:** 12+ stopped at any moment — believed normal cron pattern (run-then-exit) but worth a one-time sanity check via `pm2 describe heartbeat | grep -E "cron|exec_mode|autorestart"`.

## Reference

- Sprint task list: `sprints/week-118.json` (week-118 still pending dispatch separately)
- Migrations applied today: `supabase/migrations/{009_clinpay_sessions,010_clinpay_mandate_text,011_drs_receipts}.sql`
- New code: `backend/src/services/asterpay/{verify,client,mandate,clinpay-session}.ts`, `backend/src/services/clinpay/drs-receipt.ts`, `backend/src/routes/clinpay.ts`
- Sandbox credentials: `sandbox-credentials.md` (gitignored, rotates 2026-05-30)
- Prior directive: DIR-009 (M1 closed, swarm autonomy resumed)
- AsterPay contact: Petteri Leinonen, petteri@asterpay.io
