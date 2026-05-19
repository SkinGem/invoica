# BOND v0.2 — Variable-Cost Escrow Research Note

**Status:** Monitor-only · 2026-05-18
**Source:** TICKET-018 (Kognai Notion Change Log)
**Trigger:** Variable-cost work (LLM inference, metered compute) can't be cleanly authorized by a fixed-amount BOND mandate. The Corbits "Flex" primitive is the closest known reference.

---

## 1. The gap in BOND v0.1

BOND v0.1's `RecurringDealSchema` requires a fixed `amount_per_period` at signing time. The four executor checks (attestation, period, amount, signature) all rely on this fixed amount.

For variable-cost work:
- **LLM inference billed per-token** — final cost depends on actual token count, unknown at deal time
- **Metered storage** — depends on actual GB stored × time
- **Compute by usage** — depends on actual CPU/GPU minutes
- **API calls with usage-based pricing** — depends on actual call count

None fit cleanly into "5 units × €0.40/unit × 7 weeks." A token-billed LLM mandate for a 30-day usage window has no clean fixed `amount_per_period` — it's "up to X, settle at the end."

## 2. Two design directions

### Direction A — Upper-bound escrow with usage-settle

Mandate authorizes **up to** `max_per_period` USDC. Actual settlement at period close uses the metered usage × rate. Excess returned to buyer's escrow.

```
mandate_schema (v0.2 draft, upper-bound model):
{
  ...
  amount_per_period:       null,           // not fixed
  max_per_period_usdc:     "100.00",       // ceiling
  rate_per_unit_usdc:      "0.0001",       // e.g. per token
  unit_type:               "lm_tokens",
  usage_oracle:            "did:agent:openrouter-meter-v1",
  ...
}
```

Pros:
- Buyer has bounded exposure (max_per_period is the worst case)
- Seller can deliver variable work with confidence (escrow exists)
- Period close becomes "meter says X tokens × rate = settle amount; refund excess to escrow"

Cons:
- Requires a trusted usage oracle (the meter) — buyer and seller must agree on how usage is reported
- Settlement is lazy (period-close, not per-event) — less x402-native feel
- Escrow capital is locked even if usage is low (capital efficiency loss for buyer)

### Direction B — Stream-as-you-go (Sablier/Corbits Flex pattern)

Continuous payment stream from buyer escrow to seller. Each "second" of work releases proportional USDC. No periods, no settle event.

```
mandate_schema (v0.2 draft, stream model):
{
  ...
  type:                    "stream",
  stream_rate_per_sec_usdc: "0.0001",
  buyer_escrow:            "0xabcd...",
  pause_conditions:        ["seller_delivery_below_threshold", ...],
  ...
}
```

Pros:
- Capital-efficient (buyer doesn't lock max-period escrow, only fund the stream as it flows)
- True real-time settle (matches x402's per-event feel at the limit)
- Cancellable anytime (pause stream → no more outflow)

Cons:
- Requires either: (a) chain-level streaming primitive (Sablier-style smart contract), or (b) frequent settlement transactions (gas overhead)
- "Stream" mental model doesn't fit "5 calls per week" use cases — only fits continuous compute
- Harder to reason about for non-technical buyers ("how much did I just spend?")

## 3. What Corbits Flex actually does

**Note:** The Notion ticket references Corbits' Flex as a research target but doesn't include the spec. Worth a fresh research pass when v0.2 work begins. Hypothesis based on similar primitives:

- Likely a hybrid (upper-bound + streaming components)
- Probably Solidity-side smart contract holding escrow
- Probably emits events for off-chain meter readers to consume
- May be Ethereum-mainnet or a specific L2 — affects portability

**Action when BOND v0.2 starts:** read Corbits' docs in detail, see if their primitive composes with our PACT/EIP-712 mandate model or if they have a competing mandate format.

## 4. Decision: defer v0.2 design until concrete use case lands

We don't have a customer asking for variable-cost mandates yet:
- AG / Kantar are panel-payout shape (fixed per completion) — v0.1 fits
- ClinPay is per-visit (fixed per visit) — v0.1 fits
- Hypothetical: agent-to-agent LLM inference billing (BOND being used as the mandate layer for x402-paid AI inference) — would need v0.2

The right trigger for v0.2 work is when a real customer (or PayAI / Coinbase CDP integration partner) says *"we need variable-cost mandates for our use case."* Until then:

- Keep v0.1 stable
- Watch Corbits + Sablier + Lit Protocol for proven primitives
- Don't build variable-cost speculatively

## 5. Watch list

| Project | Watch for | Cadence |
|---|---|---|
| Corbits Flex | Spec details, mainnet deployment, mandate-compatible signing | Quarterly |
| Sablier / Superfluid | Stream-based escrow + agent integration patterns | Quarterly |
| OpenRouter / x402-tokens | If they add a metered-payment primitive, would be the customer pull | Monthly |
| Coinbase CDP roadmap | If their delegated-signing scope adds usage-metered execution | Monthly |
| OnPace / similar agent ecosystem primitives | Anything that explicitly handles variable-cost agent work | Quarterly |

## 6. What changes for BOND v0.1 in the meantime

Nothing. v0.1 is correct for fixed-per-period work. The README's "Open Questions" section already lists "Partial period delivery" and "Multi-party mandates" — variable-cost is a fourth open question worth adding.

PR to add to bond/README.md when convenient:

```diff
 ❌ **Deferred to v0.2:**
 - Live EAS attestation read/write helpers (BYO via the caller hook)
 - Mandate amendment flow (re-sign vs. amendment-attestation)
 - Partial-period delivery attestation format
 - Multi-party mandates (A → B → C sub-contracting)
 - Cross-chain mandates (negotiation on chain X, settlement on chain Y)
 - Private mandates (ZK-attested with on-chain commitment)
+- Variable-cost mandates (upper-bound or streaming; for LLM/compute billing)
```

Worth adding when we do the next round of BOND README polish; not urgent.

---

**End of note.** Research-only, no implementation, no owner action. Revisit when a concrete customer use case surfaces.
