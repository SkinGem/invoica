#!/bin/bash
# Run one ClinPay sandbox demo cycle.
# Usage: ./scripts/clinpay-demo-cycle.sh <visitId> <amountEur>
#
# Defaults (override via env):
#   STUDY_ID=DemoBio-001
#   RECIPIENT_COUNTRY=FI
#   SPONSOR_JURISDICTION=US-CA  (so AgentTax fires)
#
# Example for the Mastercard demo cadence:
#   ./scripts/clinpay-demo-cycle.sh visit-001 50    # Wed
#   ./scripts/clinpay-demo-cycle.sh visit-002 50    # Fri
#   ./scripts/clinpay-demo-cycle.sh visit-003 50    # Mon
#
# After running, open the hosted_page_url in a browser and submit a sandbox
# IBAN (e.g. FI2112345600000785). AsterPay's session.submitted + session.settled
# callbacks will fire to /webhooks/asterpay/$STUDY_ID and our pipeline mints
# the DRS receipt + flips the Invoice to SETTLED.

set -e

VISIT_ID="${1:-visit-$(date +%s)}"
AMOUNT_EUR="${2:-50}"
STUDY_ID="${STUDY_ID:-DemoBio-001}"
COUNTRY="${RECIPIENT_COUNTRY:-FI}"
JUR="${SPONSOR_JURISDICTION:-US-CA}"
ENDPOINT="${INVOICA_ENDPOINT:-http://localhost:3001/api/redirect-to-payment}"

PAYLOAD=$(printf '{"visitId":"%s","studyId":"%s","amountEur":%s,"recipientCountry":"%s","sponsorJurisdiction":"%s"}' \
  "$VISIT_ID" "$STUDY_ID" "$AMOUNT_EUR" "$COUNTRY" "$JUR")

echo "→ studyId=$STUDY_ID visitId=$VISIT_ID amountEur=$AMOUNT_EUR jurisdiction=$JUR"

RESP=$(curl -s -X POST -H 'Content-Type: application/json' --data "$PAYLOAD" "$ENDPOINT")

if ! echo "$RESP" | grep -q '"success":true'; then
  echo "✗ Cycle failed:"
  echo "$RESP"
  exit 1
fi

SESSION_ID=$(echo "$RESP" | sed -n 's/.*"sessionId":"\([^"]*\)".*/\1/p')
URL=$(echo "$RESP" | sed -n 's/.*"hosted_page_url":"\([^"]*\)".*/\1/p')

mkdir -p logs/clinpay-demo
echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ') | $STUDY_ID | $VISIT_ID | ${AMOUNT_EUR} EUR | $SESSION_ID | $URL" \
  >> logs/clinpay-demo/cycles.log

cat <<EOF

✓ Cycle started.

  Open in browser:
    $URL

  AsterPay session:
    $SESSION_ID

  Tracked in:
    logs/clinpay-demo/cycles.log

Once you submit a sandbox IBAN (e.g. FI2112345600000785) AsterPay's
session.submitted + session.settled callbacks will fire and the DRS
receipt will land in the DrsReceipt table.

EOF
