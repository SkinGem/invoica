# Educational diagrams — Invoica brand

Brand-consistent SVG diagrams for educational X posts.
Each concept matches a calendar `Educational concepts` slug.

| Slug | File | One-line concept |
|---|---|---|
| `signed-mandates` | `signed-mandates.svg` | Two agents reach a signed agreement via a PACT mandate, hash-anchored on chain. |
| `composable-receipts` | `composable-receipts.svg` | A single DRS receipt is referenced by PACT, BOND, SCORE, and audit. |
| `agent-reputation-portability` | `agent-reputation-portability.svg` | An agent's SCORE persists across platforms because it lives on open protocol. |
| `gasless-microcommerce` | `gasless-microcommerce.svg` | Before/after: typical L1/L2 vs SKALE Base — gas economics for agent micropayments. |
| `discover-then-contract` | `discover-then-contract.svg` | AgentCash (discover) + PACT (contract) compose, not compete. |

## Specs

- **Dimensions**: 1200×675 (16:9 — OG image standard, displays cleanly on X without cropping)
- **Background**: `#0A0E1F` (Invoica deep ink)
- **Primary**: `#635BFF` (Invoica purple)
- **Success**: `#10B981` (emerald — used for "settled / verified / chain-anchored" states)
- **Warning**: `#F43F5E` (rose — used for "old / broken / costly" states)
- **Off-white text**: `#F8F8F4`
- **Typography**: Inter for display + body, JetBrains Mono for IDs / data / file paths

## Posting workflow

When the CMO drafts an `educational` post and the concept matches one of the slugs above, the runner attaches the matching SVG (after converting to PNG via `rsvg-convert` or similar). X displays inline.

For QT / spotlight / comment / article posts, no visual attached — the source link's preview card handles it.

For ship-day posts (PACT-Helixa, SDK, etc.), use HyperFrames hero videos instead (10-20s, branded, Kokoro VO). See `pact-helixa-video/` for the reference build.

## Adding a new concept

1. Add the slug to `reports/cmo/content-calendar.md` under "Educational concepts"
2. Author the SVG at `reports/cmo/diagrams/educational/<slug>.svg` matching the brand specs above
3. Update this README's table
4. Test with `npx tsx scripts/draft-daily-post.ts --type educational`
