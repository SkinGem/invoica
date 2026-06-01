# Invoica PACT Mandate — Dispute State Machine

## States

| State | Description |
|-------|-------------|
| `proposed` | Mandate created, awaiting proposer signature |
| `signed_by_proposer` | Proposer has signed; awaiting counterparty |
| `signed_by_both` | Both parties signed; mandate is active |
| `in_progress` | Work underway (optional explicit transition) |
| `completed` | Both parties agreed work is done; DRS final receipt emitted |
| `disputed` | One party opened a dispute |
| `expired` | Mandate passed `expiry` without completion |
| `cancelled` | Mandate voided before signing was complete |

## Valid Transitions

```
proposed          → signed_by_proposer   (POST /v1/mandates/:id/sign, signer=proposer)
signed_by_proposer → signed_by_both      (POST /v1/mandates/:id/sign, signer=counterparty)
signed_by_both    → in_progress          (POST /v1/mandates/:id/complete — implicit)
signed_by_both    → disputed             (POST /v1/mandates/:id/dispute)
signed_by_both    → completed            (POST /v1/mandates/:id/complete)
in_progress       → completed            (POST /v1/mandates/:id/complete)
in_progress       → disputed             (POST /v1/mandates/:id/dispute)
proposed          → cancelled            (issuer cancel, before counterparty signs)
signed_by_proposer → expired             (TTL exceeded)
signed_by_both    → expired              (TTL exceeded, if not completed)
```

## Dispute Flow

1. Either authenticated party POSTs `{ reason }` to `POST /v1/mandates/:id/dispute`
2. Mandate transitions to `disputed`
3. A `mandate.disputed` webhook event fires to all registered endpoints
4. Resolution is handled off-chain (human or arbitration agent)
5. Invoica does not auto-resolve disputes in v0.1

## DRS Receipt Events

| Transition | DRS Event |
|------------|-----------|
| `signed_by_both` reached | `mandate.signed` receipt |
| `completed` reached | `mandate.completed` receipt (final) |
| `disputed` reached | `mandate.disputed` receipt |

## On-Chain Anchor

When both parties have signed, Invoica writes `pact_mandate_hash` to the
MandateAnchor contract on Base Sepolia (`0x55ac...c497`). The resulting
transaction hash is stored as `anchor_tx_hash` and exposed via
`GET /v1/public/mandates/:id`.

## See Also

- [AIAX Spec v0.1](https://kognai.ai/aiax/spec/v0.1)
- [PACT Mandate API](https://docs.invoica.ai/guides/pact-mandate)
