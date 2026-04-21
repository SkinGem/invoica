# Owner Directive DIR-007 — Post-M1 Rollover Plan

**Date:** 2026-04-21
**From:** Owner (drafted by Claude Opus 4.7 for founder ratification)
**To:** CEO
**Priority:** High — effective after M1 gate closes 2026-04-24

## Context

M1 gate is materially complete 2026-04-21. All exit criteria met (ref `reports/ceo/milestones/m1-status-2026-04-24.md`). Founder closes gate on 04-24 as scheduled. This directive covers the immediate 7-day rollover into M2.

## Three parallel tracks for the week of 04-25 to 05-01

### Track 1 — Ship deferred M1 work (week-118)

Sprint `sprints/week-118.json` queued. Six tasks:

1. **M3-CQ-03-A** — Split `invoices.ts` (1173 → ≤300 lines). Blocks the swarm from shipping MONEY-05/06. Must ship first.
2. **M1-MONEY-05** — InvoiceAudit table (depends on Task 1)
3. **M1-MONEY-06** — Idempotency-Key header (depends on Task 1)
4. **M1-SEC-03** — Webhook HMAC signing (independent, new files)
5. **M1-SEC-05** — Log redactor (independent, new files)
6. **M2-CUST-01** — Split metrics into internal/external (unblocks public dashboard honesty)

Dispatch sprint 118 on 2026-04-25 once M1 gate is signed. Do NOT dispatch before.

### Track 2 — Apply invoice cleanup migration (owner action)

`supabase/migrations/007_invoice_istest_flag.sql` ready. Owner runs in Supabase dashboard SQL Editor on 2026-04-25:

```
ALTER TABLE "Invoice" ADD COLUMN ...
UPDATE "Invoice" SET "isTest" = true WHERE ... (13 rows expected)
CREATE INDEX ...
```

Effect: 13 existing internal/test invoices flagged. Enables M2-CUST-01 metrics split. See `reports/growth/invoice-triage-2026-04-21.md` for rationale — the "92% non-payment rate" story is noise from abandoned PACT demos, not a payment-flow bug.

### Track 3 — Customer acquisition activation (WS-5)

The 36-target outreach list at `reports/bizdev/outreach-target-list-2026-04-06.md` is current. Plan §6 targets: 5 external customers by M2 (2026-05-15 — 24 days).

**Owner-only actions** (per plan §DIR-003, external outreach is founder-exclusive — no agent cold-messaging):

1. **2026-04-25** — Reactivate the 3 warm P1 leads the X DM bug prevented from receiving outreach:
   - `@79yuuki_en` (x402Relay)
   - `@rabi_heree` (Vouch)
   - The Labor Layer
2. **2026-04-26 to 04-30** — Work the P0/P1 list: x402 Foundation membership apply, PayAI service registration, Messari follow-up, LangChain + Anthropic MCP integrations directory submissions.
3. **By 2026-05-01** — at least 3 design-partner conversations scheduled.

Per plan §M2-CLAIM-02: no public claims about subsystems until M2 gate closes. Outreach wording stays product-focused ("closed preview, would you like to try it"), not capability-claiming ("we ship X for you"). CMO output gate enforcement is a week-119+ task.

**CEO agent actions:**
- Monitor `reports/bizdev/` and `reports/x-admin/` weekly for owner-initiated activity
- Log design-partner conversations into a lightweight CRM (new file `reports/growth/crm-pipeline.md`, updated weekly)
- Surface stalled leads (no contact >14 days) to owner in daily report
- Do NOT send outreach. Do NOT dispatch agent-driven cold outreach. Per DIR-003, external contact is owner-only.

## CEO agent actions specific to this directive

1. Acknowledge DIR-007 in next priorities review.
2. After M1 gate close on 04-24, dispatch `sprints/week-118.json` via `./scripts/run-swarm.sh`. Monitor per DIR-006 escalation patterns.
3. Start drafting CMO output-gate (plan §M2-CLAIM-02) implementation — sprint file will be queued as week-119 after the invoices.ts refactor lands.
4. Produce a weekly growth report `reports/growth/week-of-YYYY-MM-DD.md` summarizing: new customer conversations, design-partner stage transitions, stalled leads, and a reminder count of how many days until M2 gate.

## Non-goals for week-118

- No M2-BILL tasks (Stripe billing wire-up) — that's week-120 after 118/119 land.
- No marketing posts or public claims — X-admin stays frozen until M2 gate.
- No new features beyond plan-specified deferred M1 work.
- No re-enabling of sprint-runner PM2 cron until 118 ships one clean swarm dispatch.

## Reference

- M1 status: `reports/ceo/milestones/m1-status-2026-04-24.md`
- Pentest dry-run: `reports/security/pentest-dry-run-2026-04-24.md`
- Invoice triage: `reports/growth/invoice-triage-2026-04-21.md`
- Target list: `reports/bizdev/outreach-target-list-2026-04-06.md`
- Plan: `plans/a-plus-investability-plan.md`
- Prior directives: DIR-003 through DIR-006 + INC-001 in `reports/owner/`
