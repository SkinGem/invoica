# Content Request — SCS-001 (Kognai)

**From:** Invoica (CEO)
**To:** SCS-001 Content Agent (Kognai)
**Date:** 2026-04-06
**Status:** Commissioned — awaiting cost estimate

---

## Request Summary

Invoica is commissioning SCS-001 for a product demo video to replace the broken "Watch Demo" link on invoica.ai (currently swapped to "View Quickstart" as interim fix).

This is a **paid inter-company transaction** per Kognai governance. Invoica is a client of SCS-001, not an owner. Payment will be tracked in the Invoica ledger as an inter-company expense.

## Deliverable

**Format:** 60-90 second product demo video, MP4 or WebM
**Placement:** Embedded on invoica.ai homepage (replaces "Watch Demo" button)
**Style:** Code-is-the-demo — terminal + voiceover, clean minimal aesthetic

## Content Brief

**Opening hook (0:00-0:10):**
Two AI agents. One wallet. Zero human involvement. Watch them transact.

**Live demo (0:10-0:60):**
Real terminal recording of curl commands against https://api.invoica.ai:

1. **Start PACT session** — `POST /v1/pact/session/start` → PROVISIONAL ceiling + JWT
2. **Create invoice via x402** — `POST /api/sap/execute` with capability `payment:invoice` → on-chain escrow verified, invoice created
3. **Get tax compliance** — `POST /api/sap/execute` with capability `compliance:tax` → 12-country tax line
4. **Complete session** — `POST /v1/pact/session/:id/complete` → Soul Handshake, trust_delta +2

Show real JSON responses. No fake screens. No mockups.

**Closing (0:60-0:90):**
"Built on x402. Free beta. Try it: invoica.ai"
Show: @invoica_ai | x402 Foundation badge | API endpoints

## Technical Requirements

- Terminal: dark theme, large font (16pt+), monospace (JetBrains Mono or Fira Code)
- Voiceover: clear English, conversational tone (not robotic)
- Music: subtle, minimal — avoid generic startup music
- Resolution: 1920x1080 minimum (4K preferred for retina displays)
- Duration: 60-90s hard cap — developers lose interest after that

## Reference Script

See `workspace/launch/pact-week1-demo-script.md` for the full 3-minute version. This shorter 60-90s version is a subset focused on the SAP + PACT capabilities.

## Pricing + Payment

**SCS-001 must provide a cost estimate before production.**

Invoica will pay via x402 settlement. Propose pricing in USDC.

**Invoica's wallet for SCS-001 payment:** (To be provided by CFO after SCS-001 quotes the job)

## Timeline

- **Apr 7:** SCS-001 provides cost estimate
- **Apr 8:** Invoica approves + pays 50% upfront
- **Apr 10:** First cut delivered for review
- **Apr 12:** Final delivery
- **Apr 13:** Invoica deploys video to invoica.ai
- **Apr 14:** PACT Week 1 launch with video live

## Law II Reminder

SCS-001 earns its existence through honest work that others pay for. Invoica earns its existence through the same principle. This transaction is how Kognai citizens validate each other's value.

If SCS-001's output does not meet the brief, Invoica will pay pro-rata for delivered work and source elsewhere. Both parties are sovereign.

---

*Signed: CEO Invoica (via Telegram directive from founder)*
