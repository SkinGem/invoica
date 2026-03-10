# Invoica × x402 Facilitator Integration Roadmap
*Source: invoica-arb-repurposing-plan-v2.docx*
*Integrated: 2026-03-10*
*Updated: 2026-03-10 — Facilitator-agnostic architecture adopted*
*Status: PRE-sprint pending human action*

---

## Overview

Repurpose the Solana arbitrage bot into three Invoica services, distributed via the **x402 facilitator ecosystem**. PayAI is the launch partner and first mover in the facilitator registry. Coinbase and any future x402-compliant facilitator gain access by joining the registry — zero code change required on Invoica's side.

**Total investment:** 52 agent hours · 5h human hours · 2 days registration
**Outcome:** Invoica becomes the infrastructure layer that sits above all x402 facilitators — not a PayAI-exclusive vendor, but the standard financial stack the entire x402 economy converges on.

---

## Where This Fits in the Existing Roadmap

```
CURRENT ROADMAP (post-integration)
────────────────────────────────────────────────────────
Priority 1  Gas Backstop              ← unchanged, no conflict
Priority 2  Arb Bot Stabilisation    ← new, separate repo, prerequisite
Priority 3  Payment Router (x402)    ← new, needs Sprint 050 + PRE
Priority 4  Solana Settlement        ← already planned, now gates Priority 5
Priority 5  Treasury Manager (x402)  ← new, conditional on Solana + Sprint 051
Priority 6  SOL Incinerator          ← bumped, still ships before billing day
Priority 7  Reputation Oracle (x402) ← replaces "Reputation Scoring API" Priority 3
Priority 8  PayAI Marketplace Demo   ← new, pitch asset for PayAI founder
Priority 9  Agent Marketplace        ← deferred, PayAI covers partial scope
────────────────────────────────────────────────────────
```

**Day 61 deadline (April 22, 2026):** Gas Backstop + Payment Router must ship before billing activates. Treasury Manager and Reputation Oracle are secondary but contribute to ARR.

---

## Facilitator-Agnostic Architecture

**The key insight:** The three services are built on x402, which is a protocol — not a PayAI product. The only PayAI-specific line in the entire stack was `verifyPayAI()` in the gate middleware. Replace it with a `verifyFacilitator()` abstraction, and the services work with PayAI, Coinbase, or any future facilitator that implements the x402 standard.

### How it works

Instead of hardcoding a PayAI service ID, each service queries a **facilitator registry** at runtime — a small on-chain Solana program that maps service IDs to facilitator endpoints. A new facilitator joins the registry once; all three services become immediately accessible to their agents. No code change, no redeployment.

```
x402 Payment Header (any facilitator)
↓
verifyFacilitator(facilitatorId, serviceId)
↓  queries on-chain facilitator registry
↓  calls facilitator's /verify endpoint
Invoica Services (Payment Router · Treasury Manager · Reputation Oracle)
```

### Strategic position

This changes Invoica's position entirely. PayAI gets exclusivity as the launch partner — first into the registry, first-mover advantage. But Invoica isn't locked to PayAI's growth trajectory. If Coinbase's facilitator volume grows faster, Invoica captures that too.

**The honest framing for the PayAI founder:** being facilitator-agnostic doesn't diminish PayAI's position — it strengthens it. PayAI can tell its investors that its ecosystem services run on infrastructure the entire x402 economy is converging on, not something built exclusively for them. That's a better story than "we have an exclusive deal with Invoica."

### PayAI advantage in the registry

PayAI is first into the registry, which matters for the Reputation Oracle specifically. Reputation scores are built from **all** facilitator transactions — which is good for score quality and ecosystem health. PayAI's launch-partner advantage: PayAI-facilitated transactions count **1.2× in the scoring formula** for the first 18 months. PayAI agents build reputation faster. This advantage decays gradually as the ecosystem matures, by which point PayAI's network effects should be self-sustaining.

---

## ⚠️ Human Action Required First — PRE Sprint

**This is NOT a code task. Tarek does this using his investor relationship with PayAI.**

| Step | Action | Output |
|------|--------|--------|
| 1 | Go to payai.network — use investor relationship for partner portal access (skip public queue) | Partner portal access |
| 2 | Register **Payment Router**: "Invoica Payment Router — Any Token, One Call" · 0.005 USDC/call for PayAI users | `PAYAI_SERVICE_ID_ROUTER` |
| 3 | Register **Treasury Manager**: "Invoica Treasury Manager — Autonomous Yield Engine" · 0.005 USDC/cycle | `PAYAI_SERVICE_ID_TREASURY` |
| 4 | Register **Reputation Oracle**: "Invoica Reputation Oracle — On-Chain Agent Trust Scores" · 0.002 USDC/query | `PAYAI_SERVICE_ID_ORACLE` |
| 5 | Get the PayAI `/verify` endpoint URL. Confirm this is an x402-standard endpoint | `PAYAI_VERIFY_URL` |
| 6 | Register PayAI as the **first facilitator** in the on-chain facilitator registry (INFRA-002). CTO handles the program; Tarek provides the verify URL and service IDs. | Registry entry confirmed |
| 7 | Negotiate 50% fee reduction for PayAI users for first 3 months — get in writing | Written agreement |

**→ Do NOT start Sprint 051 until `PAYAI_SERVICE_ID_ROUTER` is confirmed. The gate middleware needs a real ServiceID.**

---

## Sprint 050 — Arb Bot Stabilisation
`PREREQUISITE · 6h agent · 1h human`

**✅ Arb bot code confirmed local at `Arb-bot-main/` in Invoica folder.** Audited 2026-03-10. See `audit_findings` in sprint JSON for confirmed bugs, new bugs, and what's already correct.

### Critical Bugs to Fix

| ID | Bug | Fix |
|----|-----|-----|
| F-01 | `wallet/keypair.json` — **real 64-byte Solana private key committed** | Add to `.gitignore`. ROTATE the key immediately. First task, no exceptions. |
| F-02 | CPMM math (`x*y=k`) in `quotes.ts` for SOL legs — execute.ts already correct | Replace `getAmountOut()` in `calculateCycle()` + `quoteTriangular()` with DLMM `swapQuote()`. Don't touch execute.ts. |
| F-03 | `meteoraSDK.ts` — WSOL hardcoded as both mint A and mint B | Pass `TOKEN_A_MINT` and `TOKEN_B_MINT` from config. Two-line fix. |
| F-05 | `asol.ts:145`, `bsol.ts:135` — `BigInt()` at REST API path; `toBigInt()` helper exists but not called | Call `toBigInt()` at both REST paths. Two-line fix per file. |
| F-06 | `bot.ts executeFullCycleTrade()` — sequential leg loop, not atomic | Replace with Jito bundle path (see ARB-006) |
| F-07 | `bot.ts` — no circuit breaker; rate limiter exists but no consecutive-loss pause | Add `consecutiveLosses` counter, `circuitBreakerActive` flag, `resetCircuitBreaker()` export |

### Validation Gate (Human — 1h)
- 50 simulated cycles on devnet. Confirm quotes non-zero and directionally sane.
- Circuit breaker triggers after 3 consecutive simulated losses.
- Jito bundle: force slippage breach → confirm clean fail, no partial execution.
- **Do NOT proceed to Sprint 051 until all 5 checks pass. Non-negotiable.**

---

## Sprint 051 — Payment Router + x402 Facilitator Gate
`PRODUCT · 13h agent · 1h human`
**Gate: Sprint 050 done + `PAYAI_SERVICE_ID_ROUTER` confirmed**

### What It Does
When a client pays an Invoica invoice in SOL, PAYAI, or any SPL token, the router auto-converts to USDC. Entire service gated behind x402 facilitator verification — PayAI users are first, any x402 facilitator joins via the registry.

### Tasks
1. **INFRA-001** — `middleware/x402-gate.ts`: `verifyFacilitator()` abstraction — accepts any x402-compliant facilitator
2. **INFRA-002** — On-chain facilitator registry Solana program (alongside TREAS-001 on-chain work, CTO)
3. `backend/src/services/payment-router.ts` — wraps arb bot `executeSwap()` (now Jito-bundle-atomic) into `route(invoiceId, tokenIn, amountIn)` → USDC settled
4. Update settlement route in `backend/src/routes/` — call `payment-router.ts` before booking
5. Enforce `simulate: true` flag by default — every payment dry-runs before execution

### x402 Gate Pattern (facilitator-agnostic)
```typescript
// middleware/x402-gate.ts

interface FacilitatorEndpoint {
  serviceId: string;
  verifyUrl: string;    // from on-chain registry
  ratePerCall: string;
}

async function lookupFacilitator(facilitatorId: string): Promise<FacilitatorEndpoint> {
  // queries on-chain facilitator registry program
  return registryClient.getFacilitator(facilitatorId);
}

export async function requireX402(serviceEnvKey: string) {
  return async (req, res, next) => {
    const paymentHeader = req.headers['x-payment'];     // x402 standard header
    const facilitatorId = parseX402Header(paymentHeader).facilitator;
    const facilitator = await lookupFacilitator(facilitatorId);
    if (!facilitator) return res.status(402).json({ error: 'Unknown x402 facilitator' });

    const isValid = await verifyFacilitator({
      verifyUrl: facilitator.verifyUrl,
      serviceId: process.env[serviceEnvKey],
      paymentHeader,
      amount: facilitator.ratePerCall,
      network: 'solana'
    });
    if (!isValid) return res.status(402).json({ error: 'x402 payment required' });
    next();
  };
}

// Applied to all three service route groups
app.use('/x402/router/*',   requireX402('X402_SERVICE_ID_ROUTER'));
app.use('/x402/treasury/*', requireX402('X402_SERVICE_ID_TREASURY'));
app.use('/x402/oracle/*',   requireX402('X402_SERVICE_ID_ORACLE'));
```

### Validation Gate (Human — 1h)
- Create a $1 devnet invoice. Pay in SOL **without** x402 header → confirm HTTP 402 returned.
- Pay **with** valid PayAI x402 header → confirm USDC lands in settlement wallet, invoice flips to paid.
- Confirm facilitator registry lookup works: PayAI facilitator ID resolves to correct verify URL on-chain.
- This is the PayAI proof point: autonomous invoice paid in non-native token, zero human intervention.

---

## Sprint 052 — Treasury Manager + x402 Gate
`CONDITIONAL · 18h agent · 2h human`

**⛔ HARD GATES — DO NOT START UNTIL ALL FOUR ARE MET:**
1. CEO Solana sprint has landed — per-agent Solana wallets must exist
2. CTO has confirmed wallet interface compatibility with arb bot `executeSwap()`
3. Sprint 051 Payment Router is live and validated on devnet
4. `PAYAI_SERVICE_ID_TREASURY` confirmed from PRE sprint

### What It Does
Invoica's 18 agents sit idle between tasks. This sprint makes idle cycles generate yield — partially self-funding the swarm's operational costs. Access gated behind x402 (PayAI first; any x402 facilitator joins via registry).

### Tasks
1. Register OpenClaw skill: `invoica-treasury-yield` via ClawRouter. Trigger: agent wallet above floor AND idle >10min AND above minimum cycle threshold
2. `backend/src/skills/treasury-yield.ts` — calls arb bot fast-loop on Meteora BTC/SOL pool via **Jito bundles** (atomic). If slippage between sim and execution exceeds threshold, bundle fails — nothing executes. No partial fills.
3. `backend/src/services/treasury-attribution.ts` — maps yield earned to agent identity. Primary data source for Reputation Oracle.
4. Update `x402-gate.ts` to use `X402_SERVICE_ID_TREASURY` for treasury routes
5. **On-chain spending cap program (TREAS-001)** — Solana program enforcing per-cycle ceiling in program logic (not TypeScript). On-chain state tracks cumulative daily loss; threshold hit → delegation frozen 24h automatically. Auditable by anyone. Audit required before mainnet.
6. **On-chain facilitator registry (INFRA-002)** — If not already done in Sprint 051, deploy alongside spending cap. Both are Solana programs, CTO does both.
7. **Minimum cycle size floor** — Model gas costs before activating. Solana tx ≈ $0.003; triangular arb = 3 txs ≈ $0.009. Hard-code floor: skill does not trigger if projected gross yield < $0.015.

### Safety Rails (immutable)
- Max 2% drawdown per cycle
- Circuit breaker after 3 consecutive losing cycles
- Spending cap and daily loss counter enforced ON-CHAIN — not via server logic
- Jito bundle atomicity: sim + execution in one atomic submission
- Minimum cycle floor: $0.015 — no trigger below this threshold

### Validation Gate (Human — 2h)
- Model minimum cycle size against current Solana gas — confirm $0.015 floor math
- One agent completes idle yield cycle on devnet (Jito bundle path) — confirm sim and execution in same block
- Force slippage breach mid-cycle → confirm bundle fails cleanly (no partial fill)
- Force 3 consecutive losses → circuit breaker triggers, skill pauses cleanly
- Query on-chain spending cap program state — confirm daily counter increments and freezes at threshold
- Non-x402 request to `/x402/treasury/*` returns HTTP 402

---

## Sprint 053 — Reputation Oracle + x402 Gate
`INFRASTRUCTURE · 18h agent · 1.5h human`
**Gate: Sprint 052 done**
**Replaces original roadmap item: "Reputation Scoring API — Priority 3"**

### What It Does
Indexes verifiable on-chain execution records from **all x402 facilitators**, computes ACP trust scores from objective performance history, exposes a scoring API for task allocation. PayAI is first facilitator; all others join via the registry.

**Scoring from all facilitators is a feature, not a limitation.** A Coinbase-facilitated agent and a PayAI-facilitated agent can both build scores — which grows the total addressable market for the oracle. PayAI's differentiation comes from the weight boost (below), not from exclusivity.

**Note:** `agent-reputation-dashboard` repo already exists at `github.com/skingem1/agent-reputation-dashboard`. This sprint extends it — not greenfield.

**Cold-start strategy:** Agents with fewer than 10 completed x402 transactions receive an `UNRATED` badge instead of a score. PayAI's existing transaction history is ingested retroactively — every agent already transacting through PayAI gets a seeded score from day one. Invoica starts from PayAI's current volume, not zero.

### ACP Trust Score Composition (5 signals)
| Weight | Factor | Notes |
|--------|--------|-------|
| 37% | Yield generated (from `treasury-attribution.ts`) | Job-size weighted — larger cycle values contribute more per unit |
| 28% | Payment routing success rate | Zero-failure settlements weighted highest |
| 18% | Invoice settlement time | Faster autonomous settlement = higher score |
| 7% | Task completion rate | From Invoica's existing sprint approval metrics |
| 10% | Verified dispute rate | 5× negative multiplier on upheld disputes; 48h window per job |

Score range: 0–1000. Marketplace ranking threshold: 600+. `UNRATED` for agents with <10 x402 transactions.

### Facilitator Weight Boost (PayAI Launch Partner)
Transactions facilitated through PayAI count **1.2× in the score calculation** for the first 18 months from launch. PayAI users build reputation faster. The boost decays gradually on a 6-month schedule starting at month 12, reaching 1.0× at month 18 — by which point PayAI's network effects should be self-sustaining.

The weight boost is stored in the facilitator registry as a per-facilitator parameter. Any future launch partner can negotiate a temporary boost via the registry. The boost decay is automatic and auditable on-chain.

### Job-Size Weighting
A 0.01 USDC micro-task contributes 0.1 reputation points; a 50 USDC job contributes 10 points. Score farming via high-volume low-value jobs is penalised naturally — volume and value are both required to build a meaningful score.

### Stake-to-Bid (high-value jobs)
Jobs above 20 USDC require the accepting agent to post a 5 USDC stake via x402. Upheld disputes within 48h slash the stake. Eliminates the reputation-farming-then-exploit attack on high-value tasks.

### Optional Endorsement Signal
After job completion, the hiring agent may broadcast a one-transaction on-chain endorsement (binary: satisfied or silent). Endorsements are non-gameable: only verified paying clients from that job can issue one. No self-endorsement.

### Tasks
1. Extend `agent-reputation-dashboard` to ingest `treasury-attribution.ts` output + retroactive transaction history from all facilitators in registry
2. `backend/src/services/acp-scorer.ts` — 5-signal weighted composite score with job-size weighting, `UNRATED` flag (<10 transactions), dispute rate multiplier, **facilitator weight boost** (1.2× for registry-defined boost period)
3. `backend/src/routes/oracle.ts` — `GET /x402/oracle/score/:agentId`, `GET /x402/oracle/leaderboard`, `POST /x402/oracle/record`, `POST /x402/oracle/dispute`, `POST /x402/oracle/endorse`
4. Apply `x402-gate.ts` middleware using `X402_SERVICE_ID_ORACLE`
5. Stake-to-bid enforcement — x402 stake flow for jobs >20 USDC, 48h dispute window, slash mechanism

### Validation Gate (Human — 1.5h)
- Score API returns non-zero scores from devnet execution history (seeded from PayAI retroactive data)
- Agent with <10 transactions shows `UNRATED` — confirm no score is displayed
- Leaderboard ranks agents by composite score with job-size weighting applied correctly
- Post a dispute → confirm 5× multiplier applies and score drops on upheld dispute
- Confirm PayAI-facilitated transactions count 1.2× vs standard facilitator in test scorer run
- Jobs >20 USDC: confirm stake-to-bid flow blocks acceptance without posted stake
- Non-x402 request to `/x402/oracle/*` returns HTTP 402

---

## Sprint 054 — Marketplace Listing + Demo Surface
`PITCH ASSET · 5h agent · 0.5h human`
**Gate: Sprint 053 done**

### What It Does
Makes all three services visible in the PayAI marketplace and produces the live demo URL. Real on-chain numbers, not a deck. Positions Invoica as the infrastructure layer that every x402 facilitator's agents converge on.

### Tasks
1. `backend/src/routes/treasury-public.ts` — public read-only endpoint: total trades, win rate, max drawdown, total USDC yield, per-agent P&L, facilitator breakdown. No auth.
2. Frontend `/treasury` dashboard tab — yield generated, swarm total, per-agent P&L, circuit breaker status, emergency pause button, facilitator source breakdown
3. Submit all three services to PayAI marketplace. Cross-branding: "Powered by Invoica" + link on every listing.
4. Emergency pause — kills yield engine without touching payment routing.

### Human Tasks (0.5h)
- Submit marketplace listings via PayAI partner portal
- Activate the 50% fee reduction promotion for PayAI users for first 3 months
- Register Invoica in PayAI's ecosystem directory as "x402 infrastructure layer"

### After Sprint 054 — Pitch to PayAI Founder
Send the PayAI founder:
- Live public endpoint URL showing Invoica on-chain execution history with facilitator breakdown
- Invitation to check all three services in their marketplace
- Real numbers, live product, PayAI agents building reputation 1.2× faster than any other facilitator
- **On cold start:** "We're not claiming the oracle is perfect at launch. We're claiming it gets better with every PayAI transaction. Every agent already transacting through your marketplace gets a retroactive score from day one."
- **On facilitator-agnostic design:** "PayAI is the first facilitator in the registry. That means PayAI agents have higher scores, faster. Other facilitators can join later — but your agents will always have had the head start."

---

## Risk Mitigations

> Documented 2026-03-10. These challenges were surfaced during founder-level review and resolved before any mainnet exposure.

### Facilitator-Agnostic Architecture — Strategic Risk Mitigated

**Risk: Building exclusively for PayAI locks Invoica to PayAI's growth trajectory**
*Mitigation:* `verifyFacilitator()` abstraction + on-chain facilitator registry. The only PayAI-specific element is PayAI being first in the registry. If Coinbase's x402 volume grows faster, Invoica captures it automatically. PayAI's advantage is the weight boost and head start — not exclusivity.

**Risk: Facilitator-agnostic design reduces PayAI's differentiation**
*Mitigation:* Resolved by the 1.2× PayAI weight boost in the reputation oracle scoring formula, stored in the on-chain registry and decaying over 18 months. PayAI agents build reputation faster — a tangible, durable advantage over agents from other facilitators.

---

### Treasury Manager — Known Risks and Mitigations

**Risk 1: Delegation caps only cap damage — they don't prevent bugs or exploits**
*Mitigation:* Move the spending cap enforcement ON-CHAIN via a dedicated Solana program. The ceiling is baked into program logic — not a TypeScript variable. The program physically cannot release more than the cap per cycle. Auditable by anyone. One audit required before mainnet.

**Risk 2: Daily cumulative loss counter lives off-chain — can fail silently**
*Mitigation:* On-chain program tracks cumulative daily loss as program state. When threshold hit, program freezes delegation 24h automatically. No server monitor required. Agents can verify freeze state by querying the program directly.

**Risk 3: 8-second execution window is probabilistic — slippage between sim and execution**
*Mitigation:* Jito bundle atomicity. Simulation and execution submitted as a single atomic bundle. If conditions shift beyond slippage threshold between sim and execution, bundle fails — nothing executes. Binary: simulated yield lands exactly, or cycle does not execute.

**Risk 4: Transaction costs may eat yield at small cycle sizes**
*Mitigation:* Model explicitly before Sprint 052 ships. Solana cost ≈ $0.003/tx; triangular arb = 3 txs ≈ $0.009. At 2% edge, minimum profitable cycle ≈ 1.5–2 USDC. Hard-code floor: yield skill does not trigger if projected gross yield < $0.015.

---

### Reputation Oracle — Known Risks and Mitigations

**Risk 1: Score is gameable — farm low-value jobs to build high score, then exploit high-value job**
*Mitigation:* Job-size weighting (volume alone insufficient) + stake-to-bid (5 USDC stake for jobs >20 USDC, slashed on upheld dispute). Bad actors now have real capital at risk.

**Risk 2: Operational efficiency ≠ quality — a financially active agent can score 850+ with mediocre work**
*Mitigation:* Signal 5 — verified dispute rate — with 10% weight and 5× negative multiplier on upheld disputes. Optional endorsement from verified paying clients provides positive quality signal.

**Risk 3: Completion rate is binary — delivered ≠ correct**
*Mitigation:* 48-hour dispute window on every completed job. Verified delivery failure becomes permanently visible in the score.

---

### Meta-Challenge — Cold Start

**Treasury Manager cold start:** The delegation mechanics work with one agent or ten thousand. Demo is possible on devnet day one with a single agent wallet and real on-chain numbers.

**Reputation Oracle cold start:**
- Agents with fewer than 10 x402 transactions show `UNRATED`. Marketplace buyers know they're taking on unknown-quantity risk. This is a feature.
- PayAI's existing transaction history ingested retroactively. Invoica starts from PayAI's current volume, not zero.
- The pitch to the PayAI founder: "The oracle gets better with every transaction through your marketplace. You already have the history. We just haven't computed the scores yet."

---

## Architecture Summary

```
x402 Payment Header  (facilitatorId + serviceId + amount)
↓
verifyFacilitator(facilitatorId, serviceId)
↓  on-chain registry lookup → facilitator verify endpoint
↓  HTTP call to facilitator /verify
Invoica Services
├── /x402/router/*    Payment Router       ← arb bot quote engine + executeSwap()
├── /x402/treasury/*  Treasury Manager     ← arb bot yield loop + per-agent wallets
└── /x402/oracle/*    Reputation Oracle    ← ACP ledger + Trust Architect agent

On-Chain Programs (Solana)
├── Facilitator Registry  ← maps facilitator IDs to verify endpoints + weight boosts
└── Treasury Spending Cap ← enforces per-cycle ceiling + daily loss counter

PayAI: first in registry, 1.2× reputation weight boost (18 months).
Coinbase, others: join registry → immediate access, standard weight.
```

## Pricing Tiers

| User Type | Price | Perks |
|-----------|-------|-------|
| PayAI users (via registry) | 0.005 USDC/call (router/treasury) · 0.002 USDC/query (oracle) | 1.2× reputation weight boost, marketplace visibility, 50% fee reduction first 3 months |
| Other x402 facilitator users | 0.005 USDC/call · 0.002 USDC/query | Standard weight, eligible for marketplace listing via their facilitator |
| Direct x402 (no facilitator) | 0.01 USDC/call · 0.004 USDC/query | Standard routing, no marketplace listing |

---

## Dependency Graph

```
PRE (human) ─────────────────────────────────────────────────┐
                                                              │
Sprint 050 (Arb Bot bugs) ──────────────────────────────┐    │
                                                         │    │
INFRA-001 (verifyFacilitator middleware) ────────────────┤    │
                                                         ▼    ▼
                                      Sprint 051 (Payment Router) ──────────┐
                                                                              │
INFRA-002 (on-chain registry) ────────────────────────────────────────────┐  │
                                                                           │  │
CEO Solana sprint ─────────────────────────────────────────────────────────┤  │
                                                                           ▼  ▼
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
| Distribution | Direct signup only | PayAI marketplace + all x402 facilitators + direct |
| Token support | Settlement token only | Any SPL token (auto-converted) |
| Agent idle time | Wasted | Generating yield |
| Reputation | Asserted | On-chain, verifiable, scored across all x402 facilitators |
| PayAI relationship | None | Launch partner, first in registry, 1.2× reputation boost for 18 months |
| Competitive position | PayAI vendor | x402 infrastructure layer — sits above all facilitators |
| Revenue streams | Subscription | Subscription + micro-fees on every x402 transaction, any facilitator |

---

*Ref: invoica-arb-repurposing-plan-v2.docx · Integrated 2026-03-10*
*Facilitator-agnostic architecture: 2026-03-10*
