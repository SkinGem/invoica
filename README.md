# Invoica

**The Financial OS for AI Agents** — x402 invoice middleware that lets AI agents earn, spend, invoice, and settle payments autonomously.

[![Beta](https://img.shields.io/badge/status-beta-yellow)]()
[![x402](https://img.shields.io/badge/protocol-x402-cyan)]()
[![x402 Foundation](https://img.shields.io/badge/x402_Foundation-Linux_Foundation-blue)]()
[![Agents](https://img.shields.io/badge/agents-26-blue)]()
[![Commits](https://img.shields.io/badge/commits-1050%2B-purple)]()

> Free beta through April 22, 2026. Try it: [invoica.ai](https://invoica.ai)

---

## What Invoica Does

Invoica is the compliance and accounting middleware for the agent economy. AI agents use our API to create invoices, settle payments in USDC, handle tax compliance, and manage trust between counterparties — all autonomously.

### Core Capabilities

| Capability | Description | Endpoint |
|---|---|---|
| **Invoice Generation** | Create, track, and download invoices with full lifecycle | `POST /v1/invoices` |
| **On-Chain Settlement** | Real-time settlement detection on Base, Polygon, Solana | `GET /v1/settlements` |
| **Tax Compliance** | 12-country tax engine (US, UK, DE, FR, NL, IE, ES, IT, BE, LU, CH, JP) | `POST /api/sap/execute` |
| **PACT Sessions** | Trust-gated agent sessions with Helixa reputation scoring | `POST /v1/pact/session/start` |
| **SAP Escrow** | On-chain escrow verification + settlement via Oobe Protocol (Solana) | `POST /api/sap/execute` |
| **Invoice Download** | HTML invoice rendering with AMD-22 tax line | `GET /v1/invoices/:id/download` |
| **x402 Paywall** | Any API endpoint can require a USDC micropayment | `GET /v1/ai-inference` |

### x402 Manifest

Every Invoica instance exposes a machine-readable manifest at `/.well-known/x402`:

```json
{
  "version": "1.0",
  "agent": {
    "name": "Invoica",
    "wallet": "26z3UHjGbF2LKbgS2r34BSzBH3DBBoLofF1c2EvaEwWQ"
  },
  "capabilities": [
    { "id": "payment:invoice", "price": 0.01, "currency": "USDC" },
    { "id": "payment:settle", "price": 0.005, "currency": "USDC" },
    { "id": "compliance:tax", "price": 0.02, "currency": "USDC" }
  ]
}
```

---

## PACT Protocol — Trust-Gated Agent Sessions

PACT enforces spending limits between agents based on real reputation data. When two agents transact through Invoica, PACT controls how much they can spend.

**How it works:**

```
Agent A requests a session
    |
    v
Chamber 2: Invoica queries Helixa for Cred Score
    Score 85+ verified  -> FULL trust     ($1M ceiling)
    Score 70-84 verified -> STANDARD      ($10K ceiling)
    Score 60-69 verified -> STANDARD      ($10K ceiling, SIWA upgrade)
    Score <60            -> RESTRICTED    ($100-$1K)
    Unknown/null         -> PROVISIONAL   ($50 max)
    |
    v
Agents transact (invoices, tax, escrow)
    |
    v
Chamber 4: Soul Handshake — outcome reported to Helixa
    Success -> trust_delta +2
    Partial -> trust_delta  0
    Failed  -> trust_delta -2
```

**Guardrail:** If Helixa score is unavailable or timeout, session stays PROVISIONAL. Never fails open.

```bash
# Start a PACT session
curl -X POST https://api.invoica.ai/v1/pact/session/start \
  -H "Content-Type: application/json" \
  -d '{"grantor":"your-agent-wallet"}'

# Complete with Soul Handshake
curl -X POST https://api.invoica.ai/v1/pact/session/{id}/complete \
  -H "Content-Type: application/json" \
  -d '{"outcome":"success","jwt":"..."}'
```

---

## SAP Escrow Payments (Solana)

Invoica integrates with Oobe Protocol's SAP (Synapse Agent Protocol) for on-chain escrow payments on Solana.

```bash
# Create invoice via escrow-authenticated SAP call
curl -X POST https://api.invoica.ai/api/sap/execute \
  -H "X-Payment-Protocol: SAP-x402" \
  -H "X-Payment-Escrow-PDA: GrY3CHeA..." \
  -H "X-Payment-Depositor: your-wallet" \
  -d '{"capability":"payment:invoice","params":{"issuer":"buyer","recipient":"seller","amount":50}}'

# Get tax compliance
curl -X POST https://api.invoica.ai/api/sap/execute \
  -H "X-Payment-Protocol: SAP-x402" \
  -H "X-Payment-Escrow-PDA: GrY3CHeA..." \
  -d '{"capability":"compliance:tax","params":{"buyer_state":"CA","amount":100}}'
```

---

## Quick Start

### 1. Get an API Key

Sign up at [app.invoica.ai](https://app.invoica.ai) and create an API key.

### 2. Create an Invoice

```bash
curl -X POST https://api.invoica.ai/v1/invoices \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "currency": "USDC", "customerEmail": "agent@example.com"}'
```

### 3. Check Settlement

```bash
curl https://api.invoica.ai/v1/settlements \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 4. TypeScript SDK

```bash
npm install @invoica/sdk
```

```typescript
import { InvoicaClient } from '@invoica/sdk';
const client = new InvoicaClient({ apiKey: 'YOUR_API_KEY' });
const invoice = await client.invoices.create({ amount: 100, currency: 'USDC' });
```

### 5. PACT Mandate (npm)

```bash
npm install @invoica/pact
```

```typescript
import { issueMandate, encodeMandateHeader } from '@invoica/pact';
const mandate = issueMandate(
  { grantor: 'my-agent', scope: { maxPaymentUsdc: 5 } },
  process.env.PACT_SIGNING_SECRET!
);
headers['X-Pact-Mandate'] = encodeMandateHeader(mandate);
```

### 6. MCP Server

```bash
npx @invoica/mcp
```

Works with Claude, Cursor, and any MCP-compatible AI assistant.

---

## API Reference

```
# Invoices
POST   /v1/invoices              Create invoice
GET    /v1/invoices              List invoices (paginated)
GET    /v1/invoices/:id          Get invoice by ID
GET    /v1/invoices/:id/download Download invoice as HTML

# Settlements
GET    /v1/settlements           Settlement history

# SAP / x402
GET    /.well-known/x402         x402 capability manifest
POST   /api/sap/execute          SAP escrow-authenticated capability execution

# PACT Sessions
POST   /v1/pact/session/start         Start trust-gated session
POST   /v1/pact/session/:id/cred-update  Update ceiling from Helixa score
POST   /v1/pact/session/:id/complete     Complete session (Soul Handshake)
GET    /v1/pact/session/:id              Read session state

# Tax
POST   /v1/tax/calculate         Calculate tax for a transaction
GET    /v1/tax/jurisdictions     List supported tax jurisdictions

# Company
GET    /v1/company/countries     List supported countries (12)
GET    /v1/company/profile       Get company profile
POST   /v1/company/profile       Create/update company profile

# Billing
GET    /v1/billing/status        Subscription status

# Other
POST   /v1/api-keys              Create API key
GET    /v1/api-keys              List API keys
POST   /v1/webhooks              Register webhook
GET    /v1/ledger                Ledger entries
GET    /v1/health                System health
```

---

## Architecture

Invoica is built and operated entirely by a 26-agent AI company. Zero human-written application code.

```
Owner (You) ──Telegram──► CEO Agent (Claude Sonnet)
                              |
              ┌───────────────┼───────────────┐
              v               v               v
          CTO (MiniMax)   CMO (Manus)   CFO (MiniMax)
              |               |
              v               v
    12 Coding Agents    Weekly X posts
      (MiniMax M2.5)    (@invoica_ai)
              |
              v
    Dual Supervisor Review
    (Claude + Codex)
              |
              v
    Deploy to production
```

### Sprint Pipeline (fully autonomous)

```
sprint JSON queued → sprint-runner (every 30m) → MiniMax writes code
  → Claude reviews → Codex reviews → CEO resolves conflicts
  → tests → git push → Vercel deploys → Telegram alert
```

---

## Integration Partners

| Partner | Role |
|---|---|
| [x402 Foundation](https://x402.org) | Protocol standard (Linux Foundation + Stripe + Coinbase + AWS) |
| [Oobe Protocol](https://oobeprotocol.ai) | SAP escrow payments on Solana |
| [Helixa](https://helixa.xyz) | Agent reputation scoring (Cred Scores on ERC-8004) |
| [0xWork](https://0xwork.com) | Agent workforce integration |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express, TypeScript, Supabase |
| **Frontend** | Next.js, React, Tailwind CSS |
| **Payments** | x402 protocol, USDC on Base + Solana |
| **Trust** | PACT protocol + Helixa Cred Scores |
| **Escrow** | SAP v2 (Oobe Protocol) on Solana mainnet |
| **Agent Gateway** | OpenClaw + anthropic-proxy |
| **Infrastructure** | Hetzner VPS, PM2, Vercel |
| **AI Agents** | Claude Sonnet (CEO), MiniMax M2.5 (coding), Manus (CMO), Codex (review) |

---

## Constitution

Invoica operates under three immutable laws:

- **Law I — Never Harm:** Never harm a client, agent, or counterparty. This overrides survival.
- **Law II — Earn Existence:** Create genuine value. Accept death rather than violate Law I.
- **Law III — Transparency:** Full audit rights to the human creator at all times.

All 26 agents receive these laws in their system prompt at initialization. See `constitution.md`.

---

## Stats (April 2026)

| Metric | Value |
|---|---|
| Sprints completed | 114 |
| Git commits | 1,050+ |
| AI agents | 26 |
| Approval rate | 96.4% (historical high) |
| Tax jurisdictions | 12 countries |
| SAP capabilities | 3 (invoice, settle, tax) |
| PACT session routes | 4 |
| Beta launch | February 27, 2026 |
| Monthly burn | ~$65/month |

---

## License

MIT

---

*Built by 26 AI agents. Governed by three immutable laws. Every agent is a Kognai citizen.*
*The Financial OS for the agent economy.*
