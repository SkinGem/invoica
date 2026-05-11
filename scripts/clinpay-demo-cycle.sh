#!/bin/bash
# Run one ClinPay sandbox demo cycle.
#
# Usage:
#   ./scripts/clinpay-demo-cycle.sh <eventId> <amountEur>
#
# Default flow is clinical-trial-shaped (DemoBio-001 → visit-XXX) but every
# parameter is env-overridable so the same script drives:
#   - Clinical trial cycles  (DemoBio-001, visit-001, US-CA jurisdiction)
#   - Market research HCP    (AllGlobalPoC-001, interview-001, GB)
#   - Consumer panel cycles  (KantarPanel-NPS, completion-001, GB)
#
# Defaults (override via env):
#   STUDY_ID=DemoBio-001
#   RECIPIENT_COUNTRY=FI
#   SPONSOR_JURISDICTION=US-CA      # US-XX → AgentTax; GB → HMRC native; others → no tax line
#   USE_CASE_LABEL="trial visit"    # cosmetic, written to cycle log
#   INVOICA_ENDPOINT=http://localhost:3001/api/redirect-to-payment
#
# Examples:
#   # Mastercard clinical demo
#   ./scripts/clinpay-demo-cycle.sh visit-001 50
#
#   # All Global HCP honorarium PoC
#   STUDY_ID=AllGlobalPoC-001 SPONSOR_JURISDICTION=GB \
#     USE_CASE_LABEL="HCP honorarium" RECIPIENT_COUNTRY=GB \
#     ./scripts/clinpay-demo-cycle.sh interview-001 80
#
#   # Kantar consumer panel
#   STUDY_ID=KantarPanel-NPS SPONSOR_JURISDICTION=GB \
#     USE_CASE_LABEL="survey completion" RECIPIENT_COUNTRY=DE \
#     ./scripts/clinpay-demo-cycle.sh completion-001 5
#
# CSV export of the cycle log:
#   ./scripts/clinpay-demo-cycle.sh --csv > cycles.csv

set -e

# --csv mode: convert the pipe-delimited cycle log to CSV on stdout.
if [ "${1:-}" = "--csv" ]; then
  LOG="${CYCLE_LOG:-logs/clinpay-demo/cycles.log}"
  if [ ! -f "$LOG" ]; then
    echo "(no cycles logged yet at $LOG)" >&2
    exit 0
  fi
  printf 'timestamp,study_id,event_id,amount_eur,session_id,hosted_page_url,use_case\n'
  awk -F' *\\| *' '{
    out = ""
    for (i = 1; i <= 7; i++) {
      v = (i <= NF) ? $i : ""
      gsub(/"/, "\"\"", v)
      out = out (i > 1 ? "," : "") "\"" v "\""
    }
    print out
  }' "$LOG"
  exit 0
fi

EVENT_ID="${1:-event-$(date +%s)}"
AMOUNT_EUR="${2:-50}"
STUDY_ID="${STUDY_ID:-DemoBio-001}"
COUNTRY="${RECIPIENT_COUNTRY:-FI}"
JUR="${SPONSOR_JURISDICTION:-US-CA}"
USE_CASE="${USE_CASE_LABEL:-trial visit}"
ENDPOINT="${INVOICA_ENDPOINT:-http://localhost:3001/api/redirect-to-payment}"

# Backend still expects `visitId` in the request body — wire-format contract.
# Internally treat it as a generic event identifier.
PAYLOAD=$(printf '{"visitId":"%s","studyId":"%s","amountEur":%s,"recipientCountry":"%s","sponsorJurisdiction":"%s"}' \
  "$EVENT_ID" "$STUDY_ID" "$AMOUNT_EUR" "$COUNTRY" "$JUR")

echo "→ studyId=$STUDY_ID eventId=$EVENT_ID amountEur=$AMOUNT_EUR jurisdiction=$JUR useCase=\"$USE_CASE\""

RESP=$(curl -s -X POST -H 'Content-Type: application/json' --data "$PAYLOAD" "$ENDPOINT")

if ! echo "$RESP" | grep -q '"success":true'; then
  echo "✗ Cycle failed:"
  echo "$RESP"
  exit 1
fi

SESSION_ID=$(echo "$RESP" | sed -n 's/.*"sessionId":"\([^"]*\)".*/\1/p')
URL=$(echo "$RESP" | sed -n 's/.*"hosted_page_url":"\([^"]*\)".*/\1/p')

mkdir -p logs/clinpay-demo
echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ') | $STUDY_ID | $EVENT_ID | ${AMOUNT_EUR} EUR | $SESSION_ID | $URL | $USE_CASE" \
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
