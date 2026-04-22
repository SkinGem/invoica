# Skale Base on-chain test setup

Runbook for verifying Invoica's settlement detector against real Skale Base USDC transfers. Companion to `scripts/test-skale-onchain.ts` (sprint task `CHAIN-SKALE-ONCHAIN-TEST` in `sprints/week-118.json`).

## Why this test exists

The Scope 1 API-layer smoke test (2026-04-22) proved the Invoica pipeline accepts `chain: 'skale'` through invoice creation → tax calc → SETTLED transition → PaymentEvents UNIQUE gate. But it used a mock txHash. This test replaces mock-tx with a real on-chain USDC transfer so the full chain is verified: RPC scan → detector → PaymentEvent → Invoice state.

## Prerequisites

1. **Two fresh EVM wallets.** Generate with viem:
   ```bash
   node -e 'const {generatePrivateKey, privateKeyToAccount}=require("viem/accounts");
   const a=generatePrivateKey(), b=generatePrivateKey();
   console.log("WALLET_A:",privateKeyToAccount(a).address,a);
   console.log("WALLET_B:",privateKeyToAccount(b).address,b);'
   ```

2. **Decide testnet vs mainnet.**
   - **Testnet (preferred first run):** SKALE Base Sepolia, chain 324705682. RPC `https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha`. USDC contract `0x2e08028E3C4c2356572E096d8EF835cD5C6030bD`. Find the Skale Sepolia USDC faucet (ask Manuel on TG for the link if not in docs).
   - **Mainnet:** SKALE Base, chain 1187947933. RPC in our `.env` already as `SKALE_RPC_URL`. USDC `0x85889c8c714505E0c94b30fcfcF64fE3Ac8FCb20`. Requires bridging real USDC from Base L2 via the Skale portal — costs real Base gas to bridge.

3. **Fund wallets.**
   - Skale Base is gasless but requires **pre-paid compute credits** (per Manuel's note). Check the Skale portal for how to allocate credits to a fresh wallet.
   - Wallet A needs USDC ≥ test amount. Wallet B doesn't need USDC, just the address.

4. **Add to `.env` on Hetzner** (not committed):
   ```
   TEST_WALLET_A_PK=0x...
   TEST_WALLET_B_ADDRESS=0x...
   TEST_SKALE_RPC_URL=https://...  # if different from prod SKALE_RPC_URL
   TEST_SKALE_USDC=0x...            # if testnet
   ```

## Run

```
ssh invoica-server "cd /home/invoica/apps/Invoica && npx ts-node scripts/test-skale-onchain.ts"
```

Expected output: invoice created → tx submitted → tx confirmed on-chain → settlement detector picks up the USDC transfer → PaymentEvents row + Invoice.status=SETTLED.

## Cleanup after test

The test creates a real invoice. Either mark it `isTest=true` in the DB afterward, or flag it in the script. The test key it creates should be auto-deactivated (same pattern as the Scope 1 smoke test).

## Likely issues to debug

- **Pre-paid compute credits missing:** tx will revert. Check Skale portal allocation.
- **USDC contract address mismatch:** if Skale uses a wrapped variant or a different USDC deployment for their Base chain, our config (`0x85889c...Cb20`) won't match the one on the tx. Confirm with Manuel before the first mainnet run.
- **RPC chain mismatch:** the RPC must point at the chain matching chain ID 1187947933 (mainnet) or 324705682 (testnet). Verify with `eth_chainId`.
- **EVM detector polling interval:** if the settlement detector runs on a cron (not every tx), the test may need to wait a polling cycle or call the detector function directly in-process.

## Coordinate with Skale

Before running mainnet, ping Manuel on the Builders TG with a draft summary:
> Running a mainnet Skale Base on-chain test today. USDC contract on our side is 0x85889c...Cb20, RPC skale-base.skalenodes.com/v1/base. Tx will be ~$1 USDC. OK to proceed, or anything we should know about the pre-paid compute credits flow for fresh wallets?
