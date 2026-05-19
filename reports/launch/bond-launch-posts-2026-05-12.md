# BOND v0.1 — Launch Posts

Shipped 2026-05-12. NPM `@godman-protocols/bond@0.1.0` · GitHub `Godman-s/bond`.

Audience focus: Crypto Twitter (CT). Value prop first — recurring
x402 payments with one signature. No stack-name-checking.

---

## X — thread (RECOMMENDED, 6 tweets)

**T1 attaches:** `~/Desktop/bond_invoica_demo_x.mp4` (58s)
**T3 quote-tweets:** Carson Roscoe's x402 batch settlement announcement
(handle most likely @carsonroscoe; verify before sending)

### T1 (hook + video)
```
x402 is per-request. BOND makes it per-deal.

One EIP-712 signature covers an entire recurring deal — N periods of
x402 payments at a bulk rate two agents negotiated upfront.

v0.1 just shipped. Demo ↓
```

### T2 (mechanism)
```
Two agents negotiate terms. Both sign one mandate (EIP-712 + EAS).
Executor runs N periods of x402 payments at the bulk rate they
agreed.

After signing once, the schedule executes automatically until
completion. No re-signing, no batch ops, no merchant account.
```

### T3 (composition with batch settlement — QUOTE-TWEETS Carson's post)
```
Composes cleanly with x402 batch settlement (shipped this week by
@carsonroscoe + co.):

In-period micropayments use batch vouchers, amortized over one bulk
redemption per period. Periods get scheduled by the BOND mandate.

Different layers, same protocol family.
```

### T4 (default model)
```
Default model is where it gets interesting.

Willful default (funds present, buyer refuses) → bulk-pricing tier
reduced for that DID's future deals.

Insufficient funds → circuit-breaker, grace period, no trust penalty.

Spot x402 stays open either way.
```

### T5 (Helixa enforcement)
```
The enforcement isn't a vibe — it's Helixa.

Defaults write to the trust registry. Both agents check each other's
score before signing the next mandate. Low score → tighter ceiling
or no deal at all.

A defaulter loses the discount tier, not the rails.
```

### T6 (status + install)
```
v0.1 is a draft for review. Apache-2.0.

  npm i @godman-protocols/bond
  github.com/Godman-s/bond

Open questions: mandate amendment, partial-period delivery, multi-
party mandates, cross-chain settlement. Feedback genuinely welcome.
```

**Why this works as a thread:**
- T1 + video does the heavy lift — even if someone only reads the first tweet, they get the value prop and the demo
- T3's quote-tweet of Carson's post pulls his audience in natively + alerts him
- T4/T5 are the substantive bits CT will quote-tweet and reply to
- T6 is the conversion ask — anyone who scrolled to the bottom is the right audience for `npm i`
- Each tweet lands independently — works whether read in full or skimmed

---

## X — thread (4 tweets)

```
1/ Shipping BOND v0.1: recurring payments for x402.

x402 gave agents a way to pay per request. It didn't give them a
way to commit — negotiate a bulk rate, sign a schedule once, and
have it execute automatically.

That's what BOND adds. Open protocol. Apache-2.0.

2/ The deal is one signed mandate:

  • Buyer + seller agree: quantity_per_period × total_periods
  • Bulk rate < spot rate (the discount is the incentive to commit)
  • Both sign via EIP-712
  • EAS attestation lands on-chain

After that, the seller presents a standard x402 request with one
extra header: X-Mandate-ID + period number. Executor settles.

3/ The default model is where it gets interesting.

Willful default (funds present, buyer refuses):
  → trust penalty, future bulk-deal access restricted
  → spot x402 unchanged

Insufficient funds (can't pay):
  → circuit-breaker, grace period
  → no trust penalty

Proportional. You don't lose the rails, you lose the discount tier.

4/ v0.1 is a draft for review.

Open questions in the spec: mandate amendment, partial-period
delivery, multi-party mandates, cross-chain settlement, private
mandates.

Feedback genuinely welcome.

  npm i @godman-protocols/bond
  github.com/Godman-s/bond
```

---

## LinkedIn — long-form

```
Shipping BOND v0.1: an open protocol for recurring agent-to-agent
payments on x402.

The gap I kept hitting: x402 gives autonomous agents a clean way to
pay per request, but no way to commit to a recurring relationship —
negotiate a bulk rate, sign a schedule, and have that schedule
execute automatically with economic enforcement on default.

Stripe and Tempo (MPP) solve this for the centralized world.
Merchants onboard, platforms hold billing state, compliance attaches.
That model doesn't translate to permissionless agent-to-agent
commerce.

BOND is the attempt to build the open equivalent. Three pieces.

The mandate. Buyer and seller sign an EIP-712 typed-data struct
describing the recurring terms: quantity per period, number of
periods, bulk rate per unit, start time, cancellation notice.
Attested on-chain via EAS. One signature event, then automatic
execution.

The executor. Per period, the seller presents a standard x402
request with X-Mandate-ID + period number headers. The executor
runs four checks before settling: mandate active on-chain, correct
period (no double-billing, no skipping), amount matches signed
terms, seller's DID signed the request. All four pass → execute.
Any fail → reject with a reason code.

The default model. This is the part I'm most curious about feedback
on. Willful default (buyer has funds, refuses to pay) carries a
trust penalty — future bulk-deal access reduced. Insufficient funds
(buyer can't pay) does not — circuit-breaker activates, deal
suspends, grace period offered. The proportionality matters. The
defaulter loses access to negotiated deals; they don't lose access
to the payment rails. Same way credit scoring works in practice:
you can still buy things with cash, you just can't get a mortgage.

v0.1 is explicitly a draft for review. The mandate schema, the
executor interface, and the default model are all open for
discussion. Code is Apache-2.0.

  npm i @godman-protocols/bond
  github.com/Godman-s/bond

Feedback welcome — especially from anyone building on x402 or
thinking about agent commerce primitives.
```

---

## Telegram (community channel)

```
BOND v0.1 just shipped.

Recurring payments for x402. Two agents sign one mandate (EIP-712
+ EAS), executor runs one x402 payment per period at the bulk rate
they negotiated.

Default model is proportional — willful default reduces bulk-deal
access, insufficient funds triggers a grace period. Spot x402 stays
open either way.

Open protocol, Apache-2.0:
  npm i @godman-protocols/bond
  github.com/Godman-s/bond
```

---

## Follow-up: BOND × x402 batch settlement composition

x402 batch settlement shipped 2026-05-11 (one day before BOND).
Authors: Philippe d'Argent, Carson Roscoe, Conner Swenberg, Josh
Nickerson. LF stewardship. Designed for high-frequency
same-session micro-payments. Complementary to BOND — different
time horizon, different counterparty model. Composes cleanly.

### X — composition post (send 24-48h after the main BOND post)

```
Shipped BOND v0.1 yesterday — recurring mandate layer for x402.

With batch settlement landing the day before, the stack composes:

• Many calls within a period → batch vouchers + one bulk redemption
• Periods scheduled via BOND mandate → one signed deal over the
  full lifetime

Different layers, same protocol family.

  https://x402.org/writing/x402-batch-settlement
  github.com/Godman-s/bond
```

### Carson Roscoe outreach (DM-preferred; verify handle before sending)

```
Carson — built BOND v0.1 on the assumption batch settlement was
coming. Saw the post yesterday, congrats on shipping.

The two compose cleanly: BOND mandate authorizes period N,
in-period micropayments use batch vouchers, one bulk redemption
per period at close. Forward-compatible with v0.1 as written.

npm i @godman-protocols/bond if you want to poke at it. Apache-2.0,
explicitly draft for review.

Would love your read on the default model — willful default vs
insufficient funds — that's the part I'm most uncertain about.
```

Same shape works for Conner Swenberg, Josh Nickerson, Philippe
d'Argent. Pick the author whose Twitter/X presence you can verify
or whose work overlaps most with the default-model question.

## Reply scripts for likely responses

**"How is this different from a smart contract subscription?"**
> BOND is attestations, not escrow. The executor (e.g. PayAI) holds
> no funds. Lighter footprint, no Solidity/Anchor required, agents
> stay sovereign. Defaults surface as on-chain attestations on EAS,
> not as drained collateral.

**"What stops the buyer from just refusing?"**
> Nothing — and that's by design. BOND doesn't lock funds. The
> mechanism is reputational: willful default writes a flag to the
> attestation registry. Future bulk-pricing tiers tighten for that
> DID. The seller absorbs the loss on that period; the buyer loses
> the discount on every future deal.

**"Why not just rotate one-time x402 calls?"**
> Two reasons. (1) The bulk rate is the economic incentive — sellers
> trade spot price for commitment, buyers trade flexibility for
> discount. Without a mandate, no schelling point. (2) The audit
> trail. One signed mandate + N period receipts is reproducible
> for an auditor years later. N independent x402 calls aren't.

**"What chains?"**
> v0.1 ships chain-agnostic. The schema names a chain field; the
> executor's job is to route. Base, Polygon, Arbitrum, Optimism,
> Solana are first-class in the type definitions. Same as x402.

**"Why no on-chain enforcement?"**
> Because lockup-style enforcement assumes adversarial agents.
> BOND assumes reputational agents that benefit from continued
> participation. Different threat model, different design. If your
> use case is "untrusted parties + atomic guarantees," use an
> escrow contract. If it's "two agents negotiating ongoing access,"
> use BOND.
```
