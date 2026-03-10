# Invoica × PayAI Integration Roadmap
*Source: invoica-arb-repurposing-plan-v2.docx*
*Integrated: 2026-03-10*
*Status: PRE-sprint pending human action*

---

## Overview

Repurpose the Solana arbitrage bot into three Invoica services, distributed **exclusively** through PayAI's x402 marketplace. PayAI is the distribution channel; Invoica builds the infrastructure. All three services are gated behind PayAI's x402 verification — only PayAI-verified agents get access.

**Total investment:** 43 agent hours · 4.5 human hours · 2 days registration
**Outcome:** Invoica becomes PayAI's flagship infrastructure partner with three live marketplace services.

---

## Where This Fits in the Existing Roadmap

```
CURRENT ROADMAP (post-integration)
────────────────────────────────────────────────────────
Priority 1  Gas Backstop              ← unchanged, no conflict
Priority 2  Arb Bot Stabilisation    ← new, separate repo, prerequisite
Priority 3  Payment Router (PayAI)   ← new, needs Sprint 050 + PRE
Priority 4  Solana Settlement        ← already planned, now gates Priority 5
Priority 5  Treasury Manager (PayAI) ← new, conditional on Solana + Sprint 051
Priority 6  SOL Incinerator          ← bumped, still ships before billing day
Priority 7  Reputation Oracle (PayAI)← replaces "Reputation Scoring API" Priority 3
Priority 8  PayAI Marketplace Demo   ← new, pitch asset for PayAI founder
Priority 9  Agent Marketplace        ← deferred, PayAI covers partial scope
────────────────────────────────────────────────────────
```

**Day 61 deadline (April 22, 2026):** Gas Backstop + Payment Router must ship before billing activates. Treasury Manager and Reputation Oracle are secondary but contribute to ARR.

---

## ⚠️ Human Action Required First — PRE Sprint

**This is NOT a code task. Tarek does this using his investor relationship with PayAI.**

| Step | Action | Output |
|------|--------|--------|
| 1 | Go to payai.network — use investor relationship for partner portal access (skip public queue) | Partner portal access |
| 2 | Register **Payment Router**: "Invoica Payment Router — Any Token, One Call" · 0.005 USDC/call for PayAI users | `PAYAI_SERVICE_ID_ROUTER` |
| 3 | Register **Treasury Manager**: "Invoica Treasury Manager — Autonomous Yield Engine" · 0.005 USDC/cycle | `PAYAI_SERVICE_ID_TREASURY` |
| 4 | Register **Reputation Oracle**: "Invoica Reputation Oracle — On-Chain Agent Trust Scores" · 0.002 USDC/query | `PAYAI_SERVICE_ID_ORACLE` |
| 5 | Get the `/verify` endpoint URL. Add all three IDs to `.env.example` | `.env.example` updated |
| 6 | Negotiate 50% fee reduction for PayAI users for first 3 months — get in writing | Written agreement |

**→ Do NOT start Sprint 051 until `PAYAI_SERVICE_ID_ROUTER` is confirmed. The gate middleware needs a real ServiceID.**

---

## Sprint 050 — Arb Bot Stabilisation
`PREREQUISITE · 6h agent · 1h human`

**⚠️ Arb bot repo not found locally.** The arb bot is a Solana arbitrage engine targeting Meteora DLMM pools. Locate it at: `github.com/skingem1/` (check for arb or meteora repos). Clone it before starting this sprint.

### Critical Bugs to Fix

| ID | Bug | Fix |
|----|-----|-----|
| F-01 | `wallet/keypair.json` — **private key committed to repo** | Add to `.gitignore`. ROTATE the key immediately. |
| F-02 | CPMM math (`x*y=k`) used for DLMM pools — wrong pricing model | Replace all `getAmountOut()` with `dlmm.swapQuote()` in `quotes.ts`, `cpmm.ts`, all pool adapters |
| F-03 | `meteoraSDK.ts:35` — `MeteoraPoolManager` passes WSOL as both mints A and B | Pass `TOKEN_A_MINT` and `TOKEN_B_MINT` from config. Two-line fix. |
| F-05 | `bsol.ts:170` — REST API returns base58 in reserve fields, `BigInt()` crashes | Type guard before every `BigInt()` conversion — validate numeric string, log and skip if base58 |

### Files Changed
- `src/quotes.ts` — replace CPMM with `swapQuote()`
- `src/cpmm.ts` — deprecate `getAmountOut()`
- `src/adapters/pools/bsol.ts` — type guard on reserve fields
- `src/lib/meteoraSDK.ts` — fix mint placeholders
- `.gitignore` — add `wallet/keypair.json`

### Validation Gate (Human — 1h)
- Run 50 simulated cycles on devnet. Confirm quotes are non-zero and directionally sane.
- Confirm circuit breaker triggers after 3 consecutive simulated losses.
- **Do NOT proceed to Sprint 051 until 50 clean devnet cycles complete. Non-negotiable.**

---

## Sprint 051 — Payment Router + PayAI Gate
`PRODUCT · 10h agent · 1h human`
**Gate: Sprint 050 done + `PAYAI_SERVICE_ID_ROUTER` confirmed**

### What It Does
When a client pays a Invoica invoice in SOL, PAYAI, or any SPL token, the router auto-converts to USDC. Entire service gated behind PayAI x402 verification.

### Tasks
1. `middleware/payai-gate.ts` — x402 verification middleware, applied to all three service route groups
2. `backend/src/services/payment-router.ts` — wraps arb bot `executeSwap()` into `route(invoiceId, tokenIn, amountIn)` → USDC settled
3. Update settlement route in `backend/src/routes/` — call `payment-router.ts` before booking
4. Enforce `simulate: true` flag by default — every payment dry-runs before execution

### PayAI Gate Pattern
```typescript
// middleware/payai-gate.ts
import { verifyPayAI } from '@payai/x402-sdk';

export async function requirePayAIUser(req, res, next) {
  const paymentHeader = req.headers['x-payment']; // x402 standard
  const isValid = await verifyPayAI({
    serviceId: process.env.PAYAI_SERVICE_ID_ROUTER,
    paymentHeader,
    amount: '0.005',  // PayAI user rate
    network: 'solana'
  });
  if (!isValid) return res.status(402).json({ error: 'PayAI x402 payment required' });
  next();
}

app.use('/payai/router/*',   requirePayAIUser);
app.use('/payai/treasury/*', requirePayAIUser);
app.use('/payai/oracle/*',   requirePayAIUser);
```

### Validation Gate (Human — 1h)
- Create a $1 devnet invoice. Pay in SOL **without** x402 header → confirm HTTP 402 returned.
- Pay **with** valid PayAI x402 header → confirm USDC lands in settlement wallet, invoice flips to paid.
- This is the PayAI proof point: autonomous invoice paid in non-native token, gated by PayAI, zero human intervention.

---

## Sprint 052 — Treasury Manager + PayAI Gate
`CONDITIONAL · 12h agent · 1h human`

**⛔ HARD GATES — DO NOT START UNTIL ALL FOUR ARE MET:**
1. CEO Solana sprint has landed — per-agent Solana wallets must exist
2. CTO has confirmed wallet interface compatibility with arb bot `executeSwap()`
3. Sprint 051 Payment Router is live and validated on devnet
4. `PAYAI_SERVICE_ID_TREASURY` confirmed from PRE sprint

### What It Does
Invoica's 18 agents sit idle between tasks. This sprint makes idle cycles generate yield — partially self-funding the swarm's operational costs. Access gated behind PayAI.

### Tasks
1. Register OpenClaw skill: `invoica-treasury-yield` via ClawRouter. Trigger: agent wallet above operational floor AND no active task for >10 minutes
2. `backend/src/skills/treasury-yield.ts` — calls arb bot fast-loop on Meteora BTC/SOL pool. Deposits profit to agent wallet.
3. `backend/src/services/treasury-attribution.ts` — maps yield earned to agent identity. Primary data source for Reputation Oracle.
4. Update `payai-gate.ts` to use `PAYAI_SERVICE_ID_TREASURY` for treasury routes
5. Hardcode safety rails (immutable): max 2% drawdown per cycle, circuit breaker after 3 consecutive losing cycles

### Validation Gate (Human — 1h)
- One agent completes an idle yield cycle on devnet behind PayAI gate
- Force 3 consecutive losses → circuit breaker triggers and skill pauses cleanly
- Non-PayAI request to `/payai/treasury/*` returns HTTP 402

---

## Sprint 053 — Reputation Oracle + PayAI Gate
`INFRASTRUCTURE · 10h agent · 1h human`
**Gate: Sprint 052 done**
**Replaces original roadmap item: "Reputation Scoring API — Priority 3"**

### What It Does
Indexes verifiable on-chain execution records, computes ACP trust scores from objective performance history, exposes a scoring API for task allocation. Distribution exclusively via PayAI.

**Note:** `agent-reputation-dashboard` repo already exists at `github.com/skingem1/agent-reputation-dashboard`. This sprint extends it — not greenfield.

### ACP Trust Score Composition
| Weight | Factor |
|--------|--------|
| 40% | Yield generated (from `treasury-attribution.ts`) — objective on-chain performance |
| 30% | Payment routing success rate — zero-failure settlements weighted highest |
| 20% | Invoice settlement time — faster autonomous settlement = higher score |
| 10% | Task completion rate — from Invoica's existing sprint approval metrics |

Score range: 0–1000. PayAI marketplace ranking threshold: 600+.

### Tasks
1. Extend `agent-reputation-dashboard` to ingest `treasury-attribution.ts` output
2. `backend/src/services/acp-scorer.ts` — weighted composite score calculator
3. `backend/src/routes/oracle.ts` — `GET /payai/oracle/score/:agentId`, `GET /payai/oracle/leaderboard`, `POST /payai/oracle/record`
4. Apply `payai-gate.ts` middleware using `PAYAI_SERVICE_ID_ORACLE`

### Validation Gate (Human — 1h)
- Score API returns non-zero scores from devnet execution history
- Leaderboard endpoint ranks agents correctly by composite score
- Non-PayAI request to `/payai/oracle/*` returns HTTP 402

---

## Sprint 054 — PayAI Marketplace Listing + Demo Surface
`PITCH ASSET · 5h agent · 0.5h human`
**Gate: Sprint 053 done**

### What It Does
Makes all three services visible in the PayAI marketplace and produces the live demo URL to send the PayAI founder. Real on-chain numbers, not a deck.

### Tasks
1. `backend/src/routes/treasury-public.ts` — public read-only endpoint: total trades, win rate, max drawdown, total USDC yield, per-agent P&L. No auth.
2. Frontend `/treasury` dashboard tab — yield generated, swarm total, per-agent P&L, circuit breaker status, emergency pause button
3. Submit all three services to PayAI marketplace. Cross-branding: "Powered by Invoica" + link on every listing.
4. Emergency pause — kills yield engine without touching payment routing. Both services remain fully independent.

### Human Tasks (0.5h)
- Submit marketplace listings via PayAI partner portal
- Activate the 50% fee reduction promotion for first 3 months (if negotiated in PRE sprint)

### After Sprint 054
Send the PayAI founder:
- Live public endpoint URL showing Invoica on-chain execution history
- Invitation to check all three services in their marketplace
- Real numbers, live product, exclusive to their ecosystem

---

## Architecture Summary

```
PayAI User  (x402 payment header)
↓  verifyPayAI() — serviceId check
Invoica Services  (all three gated)
├── 01  Payment Router       ← arb bot quote engine + executeSwap()
├── 02  Treasury Manager     ← arb bot yield loop + per-agent wallets
└── 03  Reputation Oracle    ← ACP ledger + Trust Architect agent

Every service returns HTTP 402 until valid PayAI x402 header is provided.
PayAI users get: priority routing, lower fees, marketplace visibility.
```

## Pricing Tiers

| User Type | Price | Perks |
|-----------|-------|-------|
| PayAI users | 0.005 USDC/call (router/treasury) · 0.002 USDC/query (oracle) | Priority routing, lower fees, marketplace visibility, 50% reduction first 3 months |
| Non-PayAI agents | 0.01 USDC/call (standard) | Standard routing, no marketplace listing |

---

## Dependency Graph

```
PRE (human) ─────────────────────────────────────────┐
                                                      │
Sprint 050 (Arb Bot bugs) ────────────────────────┐  │
                                                   ▼  ▼
                             Sprint 051 (Payment Router) ──────────┐
                                                                    │
CEO Solana sprint ──────────────────────────────────────────────────┤
                                                                    ▼
                                               Sprint 052 (Treasury Manager)
                                                                    │
                                                                    ▼
                                               Sprint 053 (Reputation Oracle)
                                                                    │
                                                                    ▼
                                               Sprint 054 (Marketplace + Demo)
```

---

## What Invoica Looks Like After Sprint 054

| | Before | After |
|---|---|---|
| Distribution | Direct signup only | PayAI marketplace + direct |
| Token support | Settlement token only | Any SPL token (auto-converted) |
| Agent idle time | Wasted | Generating yield |
| Reputation | Asserted | On-chain, verifiable, scored |
| PayAI relationship | None | Flagship infrastructure partner |
| Revenue streams | Subscription | Subscription + micro-fees on every PayAI transaction |

---

*Ref: invoica-arb-repurposing-plan-v2.docx · Integrated 2026-03-10*
