---
name: invoica
title: "Invoica"
description: "x402-native invoice + tax compliance for AI agents. Issue jurisdiction-correct invoices, record on-chain settlement, classify tax obligations across 27 EU countries, UK, and 5 US states (CA/TX/NY/FL/WA). Pay-per-call USDC/USDT on Solana mainnet."
use_case: "AI agents needing a tax-compliant invoice for an x402-paid service. $0.01/invoice, $0.005/settle check, $0.02/tax line. Durable receipt with invoiceNumber + settlement_tx_hash + jurisdiction-correct tax line for audit trails."
category: finance
service_url: https://api.invoica.ai
sandbox_service_url: https://api.invoica.ai
version: "1.0"
endpoints:
  - id: payment:invoice
    method: POST
    path: /api/sap/execute
    description: "Create an x402 invoice for a completed agent service. Body includes amount, currency, customer (anonymous-OK), payment chain. Returns invoice id + invoice number + on-chain settlement address. Tax line auto-populated by jurisdiction if buyer location supplied."
    pricing:
      price_usd: 0.01
      asset: USDC
      networks: [solana-mainnet]
  - id: payment:settle
    method: POST
    path: /api/sap/execute
    description: "Check on-chain settlement status for an invoice. Returns SETTLED/PENDING/FAILED + tx_hash + settled_at if matched. Idempotent."
    pricing:
      price_usd: 0.005
      asset: USDC
      networks: [solana-mainnet]
  - id: compliance:tax
    method: POST
    path: /api/sap/execute
    description: "Tax classification and compliance line for a transaction. Returns rate, jurisdiction, statute citation (where available), confidence score, requires_review flag. Backed by AgentTax (US) and native VAT engine (EU/UK). 27 EU countries + UK + 5 US states (CA, TX, NY, FL, WA) currently."
    pricing:
      price_usd: 0.02
      asset: USDC
      networks: [solana-mainnet]
---

# Invoica

x402-native invoice + tax compliance middleware for AI agents.

## When to use

- Your agent earned USDC for a service and needs a compliant invoice the customer can use for accounting/tax — `payment:invoice`.
- Your agent settled on-chain and needs to confirm Invoica detected + recorded the settlement — `payment:settle`.
- Your agent (or your enterprise customer) needs a real tax line on a cross-border transaction — `compliance:tax`.

## What you get back

An Invoica invoice is durable: stored in Postgres with a unique `invoiceNumber`, queryable for 7 years (EU compliance retention), and includes:
- `id`, `invoiceNumber` (sequential), `amount`, `currency`
- `status` (PENDING → SETTLED → COMPLETED, with state-machine guards)
- `settlement_tx_hash` once detected on-chain
- `tax_line` with rate, jurisdiction, statute, source ("agenttax" or local fallback)
- `paymentDetails` with mandate hash if PACT-backed
- DRS-format receipt for downstream agent reconciliation

## Spend-aware patterns

- **One invoice per service unit, not per call.** If your agent serves 100 micro-API calls under one contract, issue one invoice covering all of them. Saves 99 × $0.01.
- **Skip `compliance:tax` for B2B reverse-charge or zero-tax jurisdictions.** Invoica's invoice creation already includes basic VAT for known jurisdictions; the dedicated `compliance:tax` capability is for AMD-22-grade statute citation needed in audit.
- **Skip `payment:settle` polling** — Invoica's on-chain detector marks the invoice SETTLED automatically within 1-2 blocks. Only call settle when your agent explicitly needs to confirm before proceeding.

## Networks

Currently x402-enabled on Solana mainnet for pay.sh listing. The same Invoica endpoints accept payments on Base, Polygon, Arbitrum One, and SKALE Base mainnet via direct API key auth — see `https://api.invoica.ai/.well-known/x402` for the full manifest.

## Built on

- x402 protocol (HTTP 402 Payment Required pattern, Coinbase-incubated, Linux Foundation stewardship)
- PACT (Protocol for Agent Constitutional Trust) — mandate verification before invoice issuance for sponsored payouts
- AgentTax — US sales tax classification
- AsterPay — fiat collect rail (EUR via SEPA, EU MiCA-aligned, partnered Apr 2026)

## Status

Closed preview. Live partner integrations: AsterPay (LOI'd Apr 14, 2026), AgentTax (named launch partner), PayAI (x402 facilitator in our stack). Stripe-style sandbox keys available on request — contact via the GitHub issues on this PR.

## Provider

[invoica.ai](https://invoica.ai) · operated by Kognai Labs SAS (France) · author Tarek Mnif (Godman). Issues: open one on this repo and tag `@SkinGem`.
