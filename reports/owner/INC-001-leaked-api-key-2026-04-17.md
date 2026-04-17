# Incident Report INC-001 — Leaked Invoica API Key

**Date:** 2026-04-17
**From:** Owner
**To:** CEO
**Priority:** Critical — Active incident
**Reporter:** Asterpay dev (external)

## Summary

A live-format Invoica API key (`sk_302e3efa383ddf86c2247b7c03f859e6a6b0facab582f5c4be83abea71d17047`) was hard-coded in `github.com/Godman-s/pact/blob/main/demo-negotiation.ts:42`, a public repo. The repo owner is the founder (skingem1 / skininthegem@gmail.com), so this is an internal mistake, not a third-party customer leak. Incident disclosed by the Asterpay dev who also flagged a PACT verifier HMAC timing attack in the same review.

## Actions Taken

1. Owner approved revocation at 2026-04-17.
2. Hotfix sprint `week-115a.json` queued — runs in parallel with week-115. Three tasks:
   - **M1-SEC-HOTFIX-01** (security) — revoke key, forensic audit, issue replacement to owner via Telegram
   - **M1-SEC-HOTFIX-02** (security) — fix PACT verifier.ts timing-safe HMAC compare + env-ify the demo key in Godman-s/pact
   - **M1-SEC-HOTFIX-03** (security) — scan all founder-owned public repos for additional leaked credentials
3. No external customer notification required (key belongs to owner, not a customer).

## Required from CEO

1. Dispatch `week-115a.json` tasks immediately — security agent owns all three.
2. Monitor `reports/security/incident-2026-04-17-leaked-key-audit.md` — if the forensic audit finds non-owner activity on the key, escalate to owner within the hour.
3. Include this incident in the M1 status memo (M1-GATE-05): "zero live keys exposed publicly" becomes an M1 exit criterion add-on.
4. Do **not** publish anything about this incident externally (X-admin is frozen per DIR-004 until M2 anyway).

## Decisions already made — do not re-ask

- Revocation: **approved**
- Replacement key delivery channel: **Telegram to owner chat**, not git or email
- Public repo scrub: **do not rewrite history** on Godman-s/pact. Strip the key from HEAD only. Revocation is the real fix.

## Followups Tracked Elsewhere

- M1-SEC-07 (sprint 116) — migrates all `sk_`-format keys to `inv_live_`/`inv_test_` format. This incident is an argument to accelerate or tighten that task, not rewrite it.
- M1-SEC-06 (sprint 116) — X402 seller wallet rotation and repo-root secret hygiene. Same category of lesson. Leave on current schedule.
- M1-SEC-09 (sprint 116) + M1-GATE-04 (sprint 117) — CI secret-scanning (trufflehog/gitleaks). This incident is a concrete proof-point for why that gate matters. Include in the M1 status memo.

## Reference

- Reported by: Asterpay dev (message received 2026-04-17 via owner)
- Leaked key location: github.com/Godman-s/pact/blob/main/demo-negotiation.ts:42
- Companion finding (timing attack): github.com/Godman-s/pact/blob/main/src/verifier.ts:56-60
- Hotfix sprint: sprints/week-115a.json
