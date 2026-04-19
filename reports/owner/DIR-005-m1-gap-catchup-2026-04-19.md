# Owner Directive DIR-005 — M1 Gap Catchup

**Date:** 2026-04-19
**From:** Owner
**To:** CEO
**Priority:** Critical — M1 recovery

## What happened in the gap

Between 2026-04-17 17:30 UTC and 2026-04-19, zero M1 tasks shipped. Three compounding issues caused the stall:

1. **MiniMax plan didn't cover M2.5 model** — every coding-agent call returned error 2061 (`your current token plan not support model`). New key + plan upgrade landed 2026-04-17 evening; verified HTTP 200 on `api.minimax.io` ping.
2. **Destructive-rewrite bug in orchestrator** — on API failure, a 200-char stub was written to disk and committed, overwriting production files (invoices.ts etc.). Integrity check detected the size drop but didn't block the write. Patched 2026-04-19 in `orchestrate-agents-v2.ts` — task now aborts before write if any generation or integrity check failed, preserving originals.
3. **Sprint-runner cron was deleted** to prevent the bug from destructively cycling. Has not been re-armed. Manual dispatch is required for the next sprint run.

## Current state of M1

| Sprint | Status | Tasks Pending |
|---|---|---|
| 115 (WS-1 money-safety) | pending dispatch | 7/7 |
| 115a (hotfix) | pending dispatch | 3/3 |
| 116 (WS-2 security) | not started | 9/9 |
| 117 (M1 gate) | not started | 5/5 |
| **Total** | — | **24/24** |

M1 gate: 2026-04-24 (5 days). Original plan allocated 7 days for WS-1 + WS-2 + gate verification. We've lost 2 days. **Timeline is tight but recoverable if the swarm functions correctly on this resumption.**

## Actions required from CEO on next review cycle

1. **Acknowledge this directive** in the next `reports/ceo/priorities-*.md` — include "M1 gap catchup" as P0.
2. **Do not dispatch via sprint-runner auto-cron** yet. Sprint-runner is disabled on purpose. Owner will run the first sprint manually via `./scripts/run-swarm.sh sprints/week-115.json`. CEO should monitor logs, not trigger.
3. **Daily status reports** must resume — one per day during the M1 recovery window, saved to `reports/ceo/daily/YYYY-MM-DD.md`. Per-task progress, named blockers, current M1 gate ETA.
4. **Escalate immediately** if any of these reappear in logs:
   - `API error: ... MiniMax-M2.5 (2061)` — plan broke again
   - `ABORTING task ... — file(s) failed generation` three or more times on the same task — systemic issue, not transient
   - `insufficient permission for adding an object to repository database` — git perms blocker on Hetzner `.git/objects`
5. **M1 gate date remains 2026-04-24.** If gap recovery pushes actual work to bleed into 04-25 or later, propose a new gate date with a dated recovery plan — don't silently slip.

## Unchanged from DIR-004

- No new features until M1 green (plan §0.1)
- Every PR cites task ID from `a-plus-investability-plan.md`
- X-admin frozen until M2 closes (plan §M2-CLAIM-02)
- Spend > $50/cycle, prod DB migration, webhook relaxations, Helixa fail-open = founder-only approvals

## Status of INC-001 (leaked API key)

- Revocation: **complete** (Supabase dashboard, 2026-04-17). Verified with 401 response on the dead key.
- Forensic audit (HOTFIX-01): **not started**. Swarm couldn't execute. Owner to run the bcrypt-compare + request-log scan manually, output to `reports/security/incident-2026-04-17-leaked-key-audit.md`.
- PACT repo fix (HOTFIX-02): **not started**. Owner-owned repo, owner can patch `src/verifier.ts` and env-ify demo key directly.
- Public repo scan (HOTFIX-03): **not started**. Owner to `gh search code` across skingem1 and Godman-s orgs.

Owner will treat 115a tasks as ops work done out of band and mark them `done` with manual completion notes, not re-run via swarm.

## Reference

- Resumption runbook: `plans/m1-resumption-runbook.md`
- Defensive patch commit: (this push)
- Previous directive: `reports/owner/DIR-004-m1-investability-plan.md`
- Prior incident: `reports/owner/INC-001-leaked-api-key-2026-04-17.md`
