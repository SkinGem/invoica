# Owner Directive DIR-009 — M1 closed, resume swarm autonomy

**Date:** 2026-04-27
**From:** Owner
**To:** CEO
**Priority:** Critical — operational state change

## M1 gate is CLOSED ✅

M1 investability gate signed off by founder on 2026-04-24 (commit `ee164ea`). Signoff document at `reports/ceo/milestones/m1-signoff-2026-04-24.md` contains the SIGNED line.

Post-signoff late audit fixes shipped same day:
- `fddf353` — `/v1/billing/status` and `/v1/company/verify` now require auth (closed 2 unauth data-route holes the M1-SEC-01 work missed)

All M1 exit criteria are now truly met. CEO agent should stop blocking sprint dispatch on the gate-close condition.

## Authorization to resume swarm autonomy

This directive authorizes:

1. **Dispatch sprint week-118.json immediately.** 8 tasks: M3-CQ-03-A invoices.ts split, M1-MONEY-05 InvoiceAudit, M1-MONEY-06 Idempotency-Key, M1-SEC-03 Webhook HMAC, M1-SEC-05 Log redactor, M2-CUST-01 metrics split, TAX-VAT-EVIDENCE-PERSIST, CHAIN-SKALE-ONCHAIN-TEST. Use `./scripts/run-swarm.sh sprints/week-118.json`.

2. **Re-enable `sprint-runner` PM2 process.** It was deleted 2026-04-20 to stop a destructive-rewrite cascade that resulted from MiniMax outages compounding with an orchestrator bug. Both root causes are now fixed:
   - Defensive abort patch (`f123ee1`): orchestrator never writes broken stubs on API errors
   - Promise.allSettled patch (`1621c8b`): one task crash no longer kills the whole sprint
   - Fence-stripping patch (`1621c8b`): MiniMax `\`\`\`typescript` markers in SQL files now sanitized
   - Sprint-ordering patch (`dd5dc7a`): sprints run in plan order (115 → 116 → 117), not reverse-newest

3. **Re-enable `git-autodeploy` PM2 process.** Auto-pulls origin/main every 5 min. Acceptable now that sprint-runner is back — code flow is no longer manual.

4. **Keep these processes OFF:**
   - `x-admin-post` — frozen until M2 gate (plan §M2-CLAIM-02)
   - `x-dm-outreach` — DIR-003 founder-only outreach rule, never re-enable

5. **CEO agent monitoring duties (unchanged):** daily report, weekly growth report, escalate on known failure signatures (API error 2061, ABORTING task ≥3 times same task, git permissions errors).

## Pre-flight checks completed today (2026-04-27)

- Prod backend: HTTP 200 ✅
- Anthropic API credits: HTTP 200 on Sonnet 4.5 ping ✅
- MiniMax API plan: M2.5 model accessible (last verified 2026-04-21) — re-verify before first dispatch
- Migration 007 applied to prod Supabase ✅ (15 invoices flagged isTest=true; 0 real, 15 total)
- E2E test artifacts cleaned: 2 invoices (`buyer-de@test.agents`, `buyer-de2@test.agents`) tagged isTest=true

## Failure-mode escalation contract

The CEO agent must Telegram the owner immediately if any of these patterns appear during a swarm dispatch:

1. **MiniMax error 2061** ("token plan not support model") — the previous failure root cause. Halt dispatch, notify owner.
2. **ABORTING task ≥ 3 times same task ID** — defensive patch firing repeatedly indicates either a systematic prompt bug or a broken file. Halt that task chain.
3. **`insufficient permission for adding an object to repository database`** — git-objects perms regression. Halt commits, notify owner.
4. **Backend HTTP non-200 for >3 minutes after Phase 9 PM2 reload** — production health regression. Notify owner immediately.
5. **CEO override approving 0/100 score** — supervisor failed (Anthropic credits or quota). Halt dispatch, notify owner. The override path is a safety valve, not normal operation.

For (1), (3), (4), (5): swarm should auto-halt. The owner will manually re-enable after fixing root cause.

## What the CEO agent should do RIGHT NOW (2026-04-27)

1. Read this directive, acknowledge in next priorities review.
2. **Dispatch sprint 118 today.** Per Track 1 of DIR-007 — owner has signed, gate is closed, blocking condition lifted.
3. Resume normal cadence: weekly growth report Mondays, daily progress when sprints are running.

## Reference

- M1 signoff: `reports/ceo/milestones/m1-signoff-2026-04-24.md`
- Plan: `plans/a-plus-investability-plan.md`
- Sprint queue: `sprints/week-118.json`
- Prior directives: DIR-003 through DIR-008 in `reports/owner/`
- Latest INC: INC-001 (2026-04-17 leaked key, contained)
