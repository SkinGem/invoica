# Owner Directive DIR-004 — M1 Investability Plan Activation

**Date:** 2026-04-17
**From:** Owner
**To:** CEO
**Priority:** Critical — Blocking

## Directive

A new 12-week investability plan is now active: `plans/a-plus-investability-plan.md`. The plan rescopes the swarm's work toward VC-grade investability (target: A+ engineering, A+ business, A+ investability by 2026-07-10).

Read the plan in full before dispatching any further sprints. The operating rules in §0 are non-negotiable.

## M1 Gate (2026-04-24) — Blocking

M1 has two workstreams, both P0, 16 tasks total. Three sprints have already been queued by the owner:

| Sprint | File | Workstream | Window | Tasks |
|---|---|---|---|---|
| 115 | `sprints/week-115.json` | WS-1 Money-Safety Hardening | Apr 17 → Apr 20 | M1-MONEY-01..07 |
| 116 | `sprints/week-116.json` | WS-2 Security Remediation | Apr 20 → Apr 23 | M1-SEC-01..09 |
| 117 | `sprints/week-117.json` | M1 Gate Verification | Apr 23 → Apr 24 | M1-GATE-01..05 |

Dispatch 115 immediately. Do not start 116 until 115 closes. Do not start 117 until 116 closes.

## Pause Directive — Sprint 114

Sprint 114 (PACT demo prep) is **paused** as of 2026-04-17 per plan §0.1 ("no new features until M1 is green"). Any open tasks from 114 move to a parking-lot file `sprints/_parked/week-114.json` — do not delete. The PACT demo work resumes only after M1 closes.

## Founder Decisions Encoded in Sprint Files

Two plan-level choices already made by the owner and recorded in the sprint contexts:

1. **M1-MONEY-04 (Arbitrum):** ship Option A (extend EVM detector). Option B (remove the claim) rejected.
2. **M1-SEC-04 (rate limiter):** ship in-memory for M1. Redis cross-instance store pulled forward from M3-INF-02 is **deferred**. The two-instance test requirement is dropped for M1; documented as a known limitation with a TODO pointing at M3-INF-02.

No further owner approval needed for those two items.

## Operating Rules the Swarm Must Enforce (plan §0)

1. No new features until M1 is green. If any agent proposes anything off the M1 checklist, CEO rejects.
2. Every PR must cite a task ID from `a-plus-investability-plan.md`. PRs without task IDs do not merge.
3. No marketing posts or public claims until M2. **X-admin is frozen until M2 closes.**
4. Every money-path change ships with a regression test that would have caught the bug.
5. Founder-only approvals for: legal entity filings, any spend > $50/cycle, MSB/counsel engagement, force-push, prod DB migration, webhook/rate-limit relaxations, Helixa fail-open flip.

CMO output-gate change (plan §M2-CLAIM-02) is P1 for M2 — not required to enforce before M2 kickoff, but start drafting the gate.

## Actions Required from CEO

1. **Acknowledge** this directive in the next daily report (`reports/ceo/daily/*.md`).
2. **Dispatch sprint 115** via the existing orchestrator pipeline.
3. **Pause sprint 114** — move to `sprints/_parked/week-114.json`, notify backend-core and test-runner agents that PACT demo work is on hold.
4. **Freeze X-admin posting** — tell CMO and invoica-x-admin: no public claims about any subsystem until M2 closes (plan §M2-CLAIM-02). Status posts and reply-only are allowed; new-feature posts are not.
5. **Update SOUL.md and CLAUDE.md** to reference the new plan as the active roadmap. Do not modify grade claims yet — M2-CLAIM-01 (correct the numbers) is the sprint task that does that.
6. **Produce the M1 kickoff memo** in `reports/ceo/milestones/m1-kickoff-2026-04-17.md`: named agent owners per task, daily standup schedule, escalation path.
7. **Coordinate with CTO** on sprint verification gates. Every WS-1 and WS-2 task needs Supervisor 1 + Supervisor 2 sign-off before the M1-GATE sprint starts.
8. **Report daily** during the M1 window. Owner expects a short status line in the daily report: per-task progress, blockers, ETA.

## Post-M1 Preview (for CEO planning only — do not dispatch yet)

After M1 closes and the owner signs the M1 status memo (M1-GATE-05), the next sprints will cover:

- **Week 118:** WS-3 Billing Wire-Up (Stripe, metering, quota) — M2-BILL-01..04
- **Week 119:** WS-4 Legal & Corporate + WS-9 Claims Hygiene kickoff — M2-LEG-01..06 + M2-CLAIM-01..04
- **Week 120:** WS-5 Real Customer Acquisition — M2-CUST-01..03

Owner will queue those sprint JSONs after M1 closes. CEO may begin drafting the week-118 context but must not dispatch until M1 is green.

## Reference

- Plan: `plans/a-plus-investability-plan.md`
- Gate definitions: plan §1
- DAG: plan §13
- Success metrics: plan §14
- Definition of done: plan §16
