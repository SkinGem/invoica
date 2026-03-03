This document lists the RPC providers tested from our Hetzner VPS IP (tested 2026-03-03) with their availability and performance status.

## Test Results

| Provider | Chain | Status | Notes |
|----------|-------|--------|-------|
| https://polygon-bor-rpc.publicnode.com | Polygon | ✅ PASS | Returned valid blockNumber |
| https://polygon.gateway.tenderly.co | Polygon | ✅ PASS | Returned valid blockNumber |
| https://polygon.meowrpc.com | Polygon | ❌ FAIL | JSON-RPC parse error: "Failed to parse request" |
| https://1rpc.io/matic | Polygon | ❌ FAIL | curl -sf returned no output / connection failed |
| https://api.mainnet-beta.solana.com | Solana | ✅ PASS | Returned slot 403909499 |
| https://solana-mainnet.rpc.extrnode.com | Solana | ❌ FAIL | curl -sf returned no output / connection failed |

## Recommendations

### Polygon
- **Primary:** https://polygon-bor-rpc.publicnode.com
- **Fallback:** https://polygon.gateway.tenderly.co

### Solana
- **Primary:** https://api.mainnet-beta.solana.com
- **Fallback:** None available (all alternatives failed)