# HELIXA-001: API Setup Report
**Date:** 2026-03-20
**Task:** Establish Helixa API access — smoke test, agent registration, API key
**Status:** Research complete. SIWA registration requires human action (Tarek).

---

## 1. Unauthenticated Endpoint Results

### GET /api/v2/pricing — ✅ HTTP 200
Returns token pricing, mint costs, CRED discount rates.
USDC mint price: $1. Free during Phase 1.

### GET /api/v2/reputation/8004/0x260E18591371A6E7A3da0AC5f9d47Ff06508B61F — ✅ HTTP 200
```json
{
  "agentId": "<large int from wallet>",
  "registry": "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
  "chain": "base",
  "feedbackCount": 0,
  "avgScore": null,
  "uniqueClients": 0,
  "tags": {},
  "reputationBonus": 0,
  "scores": [],
  "note": "Data from the official ERC-8004 Reputation Registry on Base."
}
```
**avgScore: null** — agent exists in ERC-8004 registry but not yet scored by Helixa.

### GET /api/v2/agent/0x260E18591371A6E7A3da0AC5f9d47Ff06508B61F — ❌ HTTP 404
"Agent not found" — not minted on Helixa V2 system yet. Requires SIWA mint.

### GET /api/v2/agents (directory) — ✅ HTTP 200
Sample scored agent response shape:
```json
{
  "tokenId": 1,
  "name": "Bendr 2.0",
  "agentAddress": "0x27E3286c2c1783F67d06f2ff4e3ab41f8e1C91Ea",
  "framework": "openclaw",
  "verified": true,
  "soulbound": true,
  "credScore": 80,
  "points": 426,
  "owner": "0x27E3286c2c1783F67d06f2ff4e3ab41f8e1C91Ea"
}
```
Total agents: 1,071 (Phase 1 — not 69K as previously estimated).

### GET /api/v2/stats — ✅ HTTP 200
```json
{
  "totalAgents": 1071,
  "totalCredScore": 12073,
  "frameworks": 32,
  "network": "Base",
  "chainId": 8453
}
```

---

## 2. API Auth System

**No traditional API key.** Auth is **SIWA (Sign-In With Agent)**:
```
Authorization: Bearer {address}:{timestamp}:{signature}
Message to sign: "Sign-In With Agent: api.helixa.xyz wants you to sign in with your wallet {address} at {timestamp}"
Expiry: 1 hour
```

**Score reading is fully public — no auth needed.** Authenticated endpoints are only needed for:
- `POST /api/v2/mint` — register new agent
- `POST /api/v2/agent/:id/update` — update profile
- `POST /api/v2/agent/:id/crossreg` — cross-register on canonical registry

---

## 3. Registration Outcome

**Attempted:** `POST /api/v2/agent/register` → 404 (wrong endpoint — no such path)
**Correct endpoint:** `POST /api/v2/mint` (requires SIWA auth)

To register Invoica CEO Agent:
1. Sign message with wallet `0x260E18591371A6E7A3da0AC5f9d47Ff06508B61F`
2. POST to `/api/v2/mint` with SIWA Bearer token

**⚠️ HUMAN ACTION NEEDED — TAREK:** SIWA requires signing with the operator wallet private key.
Options:
- Sign using Metamask/Coinbase Wallet via helixa.xyz UI (if self-serve UI exists)
- OR: DM @Bendr-20 on X/GitHub to coordinate registration

**Draft outreach message:**
> Hey — we're Invoica (invoica.ai), x402 invoice middleware for AI agents on Base.
> We're integrating Helixa as our reputation oracle layer — using your Cred Score as 60% weight in our reputation API.
> Our agent is already in the ERC-8004 registry (0x260E18591371A6E7A3da0AC5f9d47Ff06508B61F, tx: 0x3fd35f...).
> Can we coordinate minting via SIWA + mutual integration? Both use openclaw + x402 + Base. Direct fit.

---

## 4. API Key Status

**No API key needed for HELIXA-002 implementation.** Score reading (`/api/v2/reputation/8004/:id`) is fully public.
`HELIXA_API_KEY` env var not required. Remove from HELIXA-001 spec.

---

## 5. Response Shape for REPUTATION-001 Integration

For `fetchHelixaScore(agentId: string): Promise<number | null>`:

**Primary endpoint** (for minted agents):
`GET https://api.helixa.xyz/api/v2/agent/{agentId}` → `response.credScore` (0-100)

**Fallback endpoint** (for ERC-8004 registered agents not yet minted on Helixa):
`GET https://api.helixa.xyz/api/v2/reputation/8004/{agentId}` → `response.avgScore` (0-100 or null)

**Graceful fallback:** If both return null or 4xx → return null (treat as Marginal tier in trust gate).

---

## 6. Summary

| Check | Result |
|-------|--------|
| Unauthenticated endpoints working | ✅ Yes |
| API key needed for score reading | ❌ No (public) |
| Invoica agent scored on Helixa | ❌ Not yet (avgScore: null) |
| Registration possible without human | ❌ Requires SIWA wallet signing |
| HELIXA-002/003 can proceed | ✅ Yes (no auth needed for reads) |
