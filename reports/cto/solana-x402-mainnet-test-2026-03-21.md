# Solana x402 Mainnet Test — 2026-03-21

## Summary
Full end-to-end x402 payment flow verified on Solana Mainnet using two autonomous agents (SellerBot-3 + BuyerBot-7).

## Result: ✅ PASS

## Test Setup
| | |
|---|---|
| Network | Solana Mainnet |
| Test dir | `x402-test/` |
| Seller agent | SellerBot-3 — HTTP server on :4402, x402-gated `/v1/ai/inference` |
| Buyer agent | BuyerBot-7 — autonomous x402 client |
| Payment token | USDC (mainnet: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`) |
| Price | 0.01 USDC per API call |

## Wallets
| Role | Address |
|------|---------|
| Seller (SellerBot-3) | `26z3UHjGbF2LKbgS2r34BSzBH3DBBoLofF1c2EvaEwWQ` |
| Buyer (BuyerBot-7) | `3feudtV2cv8QMp82x8KUooG62zGQzpnRs9TvX68Tu3Tj` |

## Transaction
| Field | Value |
|-------|-------|
| Signature | `5wNfiHc3UVY7kVHJhKUFmrpNTCjKQA46ds7xJzy9WXnwtCsLwW9A4JYp2EnGUBByYjFP9TUWcRVDKVeTYwhkq2WY` |
| Slot | 407881715 |
| Amount | 0.01 USDC |
| Explorer | https://solscan.io/tx/5wNfiHc3UVY7kVHJhKUFmrpNTCjKQA46ds7xJzy9WXnwtCsLwW9A4JYp2EnGUBByYjFP9TUWcRVDKVeTYwhkq2WY |

## Invoica Settlement
| Field | Value |
|-------|-------|
| Invoice ID | `a1119f47-0905-4968-9d86-bfae54923f22` |
| Status | `settled` |

## Flow Verified
1. ✅ BuyerBot hit `GET /v1/ai/inference` — received HTTP 402
2. ✅ 402 response contained correct USDC mint, recipient, amount
3. ✅ BuyerBot sent 0.01 USDC on-chain (SPL token transfer)
4. ✅ Transaction confirmed on-chain (slot 407881715)
5. ✅ BuyerBot encoded `X-Payment` header with tx signature
6. ✅ SellerBot verified on-chain tx — confirmed seller received 0.01 USDC
7. ✅ SellerBot created + settled invoice in Invoica (`a1119f47`)
8. ✅ SellerBot returned 200 OK with AI inference result
9. ✅ Buyer USDC balance updated: 0.5 → 0.49 USDC

## Supported Chains (confirmed live)
| Chain | Status |
|-------|--------|
| Base | ✅ Live (original) |
| Polygon | ✅ Live (SOL-sprint) |
| Arbitrum | ✅ Live (SOL-sprint) |
| Solana | ✅ Live — mainnet verified 2026-03-21 |
