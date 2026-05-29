#!/usr/bin/env bash
# skale-happy-path.sh
# Clean end-to-end SKALE invoice capture for partner validation.
# Create invoice -> wait for caller send -> poll until SETTLED -> write artifact.
#
# Usage:
#   INVOICA_KEY=sk_... ./scripts/skale-happy-path.sh [amount=0.10]
#
# Env overrides:
#   INVOICA_API   default https://api.invoica.ai
#   TIMEOUT_S     default 300
#   POLL_S        default 5

set -euo pipefail

API="${INVOICA_API:-https://api.invoica.ai}"
KEY="${INVOICA_KEY:?INVOICA_KEY env var required}"
AMOUNT="${1:-0.10}"
TIMEOUT_S="${TIMEOUT_S:-300}"
POLL_S="${POLL_S:-5}"
TS=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
OUT="reports/skale-happy-path-${TS}.json"
mkdir -p reports

log() { echo "[$(date -u +%H:%M:%S)] $*"; }

log "Creating SKALE invoice for ${AMOUNT} USDC..."
CREATE=$(curl -sS -X POST "$API/v1/invoices" \
  -H "x-api-key: $KEY" \
  -H "content-type: application/json" \
  -d "{\"amount\": ${AMOUNT}, \"currency\": \"USDC\", \"customerEmail\": \"quigley@helixa.example\", \"customerName\": \"helixa-pact-validation\", \"chain\": \"skale\"}")

INVOICE_ID=$(echo "$CREATE" | jq -r '.data.id')
INVOICE_NUMBER=$(echo "$CREATE" | jq -r '.data.invoiceNumber')
PAY_ADDR=$(echo "$CREATE" | jq -r '.data.paymentDetails.paymentAddress')
USDC_ADDR=$(echo "$CREATE" | jq -r '.data.paymentDetails.usdcAddress')
CREATED_AT=$(date -u +%s)

if [[ -z "$INVOICE_ID" || "$INVOICE_ID" == "null" ]]; then
  echo "Invoice create failed:" >&2
  echo "$CREATE" | jq . >&2
  exit 1
fi

cat <<EOF

================================================================
INVOICE CREATED
  ID:             $INVOICE_ID
  Number:         $INVOICE_NUMBER
  Amount:         ${AMOUNT} USDC
  Chain:          SKALE Base
  USDC contract:  $USDC_ADDR

>>> SEND ${AMOUNT} USDC.e ON SKALE TO:
    $PAY_ADDR
================================================================

EOF

log "Polling /v1/invoices/$INVOICE_ID every ${POLL_S}s (timeout ${TIMEOUT_S}s)..."
DEADLINE=$(( $(date -u +%s) + TIMEOUT_S ))
STATUS="PENDING"
LAST_STATUS=""
GET="{}"

while [[ $(date -u +%s) -lt $DEADLINE ]]; do
  GET=$(curl -sS "$API/v1/invoices/$INVOICE_ID" -H "x-api-key: $KEY")
  STATUS=$(echo "$GET" | jq -r '.data.status')
  if [[ "$STATUS" != "$LAST_STATUS" ]]; then
    log "  status=$STATUS"
    LAST_STATUS="$STATUS"
  fi
  if [[ "$STATUS" == "SETTLED" ]]; then
    SETTLED_AT=$(date -u +%s)
    LATENCY=$(( SETTLED_AT - CREATED_AT ))
    TX_HASH=$(echo "$GET" | jq -r '.data.paymentDetails.txHash // ""')
    BLOCK=$(echo "$GET" | jq -r '.data.paymentDetails.settlementBlockNumber // ""')
    SOURCE=$(echo "$GET" | jq -r '.data.paymentDetails.settlementSource // ""')

    cat > "$OUT" <<JSON
{
  "captured_at_utc": "${TS}",
  "chain": "skale-base-mainnet",
  "invoice_id": "$INVOICE_ID",
  "invoice_number": $INVOICE_NUMBER,
  "amount_usdc": ${AMOUNT},
  "payment_address": "$PAY_ADDR",
  "usdc_contract": "$USDC_ADDR",
  "status": "SETTLED",
  "tx_hash": "$TX_HASH",
  "settlement_block_number": "$BLOCK",
  "settlement_source": "$SOURCE",
  "latency_seconds_create_to_settled": $LATENCY,
  "explorer_tx": "https://skale-base-explorer.skalenodes.com/tx/$TX_HASH"
}
JSON
    cat <<EOF

================================================================
SETTLED in ${LATENCY}s
  Tx hash: $TX_HASH
  Block:   $BLOCK
  Source:  $SOURCE

Capture file: $OUT
(paste contents to Quigley)
================================================================

EOF
    exit 0
  fi
  sleep "$POLL_S"
done

echo "Timeout after ${TIMEOUT_S}s — last status: $STATUS" >&2
echo "$GET" | jq . >&2
exit 1
