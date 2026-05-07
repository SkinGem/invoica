# Pay.sh Listing — Launch Posts

Drafts to publish *only* after PR #37 merges to `solana-foundation/pay-skills` main.
PR URL: https://github.com/solana-foundation/pay-skills/pull/37

---

## Telegram (community channel)

```
Invoica is now listed on pay.sh — the Solana Foundation × Google Cloud agent payments registry.

Three pay-per-call endpoints discoverable by any agent using the `pay` CLI or MCP server:
• POST /api/x402/invoice — $0.01 — issue compliant x402 invoice
• POST /api/x402/settle — $0.005 — check on-chain settlement
• POST /api/x402/tax — $0.02 — tax line w/ statute citation (27 EU + UK + 5 US states)

USDC on Solana mainnet via the PayAI facilitator. No SDK to install — agents discover Invoica through the registry and pay directly.

PR: https://github.com/solana-foundation/pay-skills/pull/37
Manifest: https://api.invoica.ai/.well-known/x402
```

---

## X — short version (@invoica_ai)

```
Invoica is now in the pay.sh registry.

Any AI agent paying via x402 on Solana mainnet can discover us, settle in USDC, and walk away with a compliant invoice + tax line.

$0.01 / invoice. $0.005 / settle check. $0.02 / tax line.

Live: api.invoica.ai
```

---

## X — thread (4 tweets)

```
1/ Invoica just landed on pay.sh — Solana Foundation's agent payments registry, co-built with Google Cloud.

For any AI agent that earns USDC and needs an audit-ready invoice + tax line: we're now one `pay` CLI call away.

2/ What's listed:

• POST /api/x402/invoice — $0.01 — sequential invoiceNumber + on-chain settlement address
• POST /api/x402/settle — $0.005 — settlement status + tx hash
• POST /api/x402/tax — $0.02 — rate, jurisdiction, statute citation

USDC on Solana mainnet.

3/ Stack:

• x402 v2 protocol (Linux Foundation stewardship)
• PayAI as facilitator
• AgentTax for US sales tax
• Native VAT engine for EU/UK
• AsterPay for EUR/SEPA fiat collect

27 EU countries + UK + 5 US states (CA, TX, NY, FL, WA) live today.

4/ The agent economy needs the same primitives as the human one — receipts, tax compliance, audit trails. We're building those at the same speed AI agents transact.

PR: https://github.com/solana-foundation/pay-skills/pull/37
Manifest: api.invoica.ai/.well-known/x402
```

---

## LinkedIn (professional / B2B)

```
Invoica is now part of pay.sh — the agent payments registry built by the Solana Foundation in partnership with Google Cloud.

Pay.sh lets autonomous agents discover and pay APIs without integration work — they query the registry, find a service, settle on-chain, and consume the API. We've added three Invoica endpoints AI agents can call directly:

→ Issue a compliant invoice ($0.01)
→ Verify on-chain settlement ($0.005)
→ Generate an audit-grade tax line w/ statute citation ($0.02)

USDC on Solana mainnet. 27 EU countries + UK + 5 US states (CA, TX, NY, FL, WA) covered for tax compliance, backed by AgentTax (US) and our native VAT engine (EU/UK).

The agent economy is going to need the same compliance primitives as the human one. Receipts, tax lines, audit trails — at the speed AI agents transact.

Manifest: https://api.invoica.ai/.well-known/x402
```

---

## Notes for posting

- **Hold all of these until PR #37 merges.** "Now listed" claim is wrong until then.
- Per Invoica content policy: shipped-only. PR open ≠ listed. Wait for merge.
- Multi-chain mention: pay.sh listing is Solana-only, but the same endpoints work on Base/Polygon/Arbitrum/SKALE via direct API key — fine to mention if the post calls for it, but don't shoehorn.
- Don't @ Solana Foundation / PayAI accounts in the first post — comes off as begging for boost. Reply chain or quote-tweet from them is cleaner.
