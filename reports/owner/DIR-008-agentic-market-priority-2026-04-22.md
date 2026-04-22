# Owner Directive DIR-008 — Agentic.Market is the M2 customer acquisition lever

**Date:** 2026-04-22
**From:** Owner (drafted for ratification)
**To:** CEO
**Priority:** Critical — timing-sensitive (launch window)

## Context

Coinbase Developer Platform launched **Agentic.Market** on 2026-04-20 — a public marketplace where AI agents discover and buy x402-enabled services with stablecoins. Launch partners include OpenAI, Venice, Bloomberg, CoinGecko, LinkedIn, X, AWS Lambda, Alchemy across 7 categories (Inference, Data, Media, Search, Social, Infrastructure, Trading). x402 protocol already has 480K+ transacting agents and 165M+ transactions.

This is the distribution channel Invoica has been designed for. Invoica's entire positioning ("Financial OS for the Agent Economy") maps exactly to what Agentic.Market needs: a compliance layer under the transaction flow.

Competitive context: the prior CEO priorities memo flagged Stripe MPP and Alchemy AgentPay as threats. Agentic.Market changes the landscape — it's now the default discovery hub for x402-native services. Being listed there is no longer optional for M2 customer acquisition; it's the fastest path.

## What changes for M2 plan (2026-05-15)

Previous plan §M2-CUST-02/03:
- 5 external customers by gate
- Owner works the 36-target design-partner list
- Concierge onboarding playbook

**New primary path:** get Invoica listed on Agentic.Market before the launch attention window closes (~30 days from 2026-04-20). Agents will discover us through the Coinbase directory, not through cold outreach.

Secondary: warm-outreach 3-4 launch partners (Bloomberg, CoinGecko, AWS Lambda, OpenAI/Venice) about embedded invoicing. Each of these serves customers who need compliant receipts. Invoica is the only x402-native option for that.

## Actions required

### Owner (P0, by 2026-04-24)

1. **Submit Invoica to Agentic.Market.** Listing draft at `docs/bizdev/agentic-market-listing.md` — review, adjust, submit via the CDP Discover form (or email Coinbase developer-relations if invite-only).
2. **Pick 3 launch-partner targets** to email: likely Bloomberg, CoinGecko, AWS Lambda (let me know when chosen — I'll draft outreach with product-focused, closed-preview framing per §M2-CLAIM-02).

### Owner (P1, by 2026-04-30)

3. **Apply to x402 Foundation membership** if not already done (was P0 on April 6 target list — unchanged).
4. **Reactivate the 3 warm P1 leads** (@79yuuki_en, @rabi_heree, The Labor Layer) — still queued as P1, weekly trigger already scheduled for Monday 2026-04-27 briefing.

### CEO agent

5. Acknowledge DIR-008 in next priorities review.
6. Update `reports/bizdev/outreach-target-list-2026-04-06.md` — add Agentic.Market as new P0 at top of the matrix. (Claude Opus will do this in the same commit as this DIR.)
7. Include Agentic.Market submission status + each launch-partner conversation in the weekly growth report.
8. If our listing is accepted, Invoica's own `.well-known/x402` manifest should eventually reference Agentic.Market's directory entry for discoverability. Queue that as a small tech task for week-119.

## Non-goals

- No X-admin posts about Agentic.Market until M2 gate closes (plan §M2-CLAIM-02 freeze). Founder-only outreach is fine — it's 1:1, not public claim.
- No CMO content-plan pivot yet. Wait until M2 gate to rework brand messaging around agentic-commerce positioning.
- No technical changes to Invoica's x402 manifest or endpoints yet. The listing reflects what's shipped today. If Agentic.Market asks for a specific manifest format, we adapt then — not speculatively.

## Why this matters

- Launch window is ~30 days. Early listings get disproportionate attention.
- We have shipped capability (M1 gate clearing 2026-04-24) that differentiates — most competitors don't have a DB-level duplicate-settlement gate or 27-EU + 5-US tax coverage.
- Plan §M2-CUST target is 5 external customers by 2026-05-15. Agentic.Market discovery could deliver that without owner 1:1 outreach.
- If we miss the window and another compliance/invoicing service lists first, we become the second option.

## Reference

- Listing draft: `docs/bizdev/agentic-market-listing.md`
- Target list (to update in same commit): `reports/bizdev/outreach-target-list-2026-04-06.md`
- Plan §6 (WS-5 Customer Acquisition): `plans/a-plus-investability-plan.md`
- Prior directive DIR-007 (post-M1 rollover): `reports/owner/DIR-007-post-m1-rollover-2026-04-21.md`
