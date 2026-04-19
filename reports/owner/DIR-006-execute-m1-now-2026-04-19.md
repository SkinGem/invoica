# Owner Directive DIR-006 — EXECUTE M1 NOW

**Date:** 2026-04-19
**From:** Owner
**To:** CEO (and CEO Telegram bot)
**Priority:** Critical — Immediate execution
**Cooldown bypass:** YES — this is an explicit execute-now order, not a review trigger.

## Order

Dispatch sprint **week-115** (WS-1 Money-Safety, 7 tasks) via the MiniMax swarm orchestrator **immediately** upon receipt of this directive.

**Exact command to execute** (from `/home/invoica/apps/Invoica`):

```bash
./scripts/run-swarm.sh sprints/week-115.json
```

## What you MUST NOT do

1. **Do not use the `/sprint <N>` default workflow.** That flow creates GitHub issues and branches via Claude-with-tools — it is NOT the MiniMax swarm orchestrator. We need the real swarm execution pipeline (CEO assessment → MiniMax code → dual supervisor review → auto-commit).
2. **Do not re-enable sprint-runner PM2 cron.** Sprint-runner is deleted on purpose. Owner runs the first sprint manually; cron auto-dispatch stays off until at least one sprint ships clean.
3. **Do not dispatch week-116 or week-117 yet.** Wait for week-115 completion, verify task states, confirm no destructive-rewrite or API-error patterns, then escalate to owner before moving on.
4. **Do not dispatch week-115a.** Owner is handling those three hotfix tasks manually — they are ops work, not coding work.

## What you SHOULD do

1. **Execute the command above.** Return the last 150 lines of the script's output to the owner's Telegram.
2. **Monitor actively** while the script runs (30–90 min expected). Escalate immediately via Telegram to the owner if ANY of these patterns appear:
   - `API error: ... MiniMax-M2.5 (2061)` — MiniMax plan broke again
   - `ABORTING task ... — file(s) failed generation` three or more times on the SAME task — systemic issue
   - `insufficient permission for adding an object to repository database` — git-objects perms still broken
   - `Task ... REJECTED on attempt 5/5` — task exhausted retries
3. **After the run finishes**, read `sprints/week-115.json` and report to the owner:
   - Count of tasks now `done` or `approved`
   - Count of tasks still `pending`, `rejected`, `suspended`
   - Final swarm run report path (`reports/swarm-runs/*.json`)
4. **If the run fails catastrophically** (all 7 tasks rejected, or orchestrator crashes), do NOT retry automatically. Report to owner and wait for instruction.

## Why this is P0

Per DIR-004 and the A+ investability plan, M1 gate = 2026-04-24 (5 days). Per DIR-005, we lost 2 days to MiniMax outage + orchestrator bug. Both issues are patched as of commit `f123ee1`. This is the first test of the fixed swarm — if it doesn't ship code today, the M1 timeline needs to be renegotiated.

## Context the CEO must know

- MiniMax key was rotated 2026-04-17 and HTTP 200 verified on M2.5 endpoint
- Defensive patch `f123ee1` prevents destructive stub-commits: task now aborts before write if any file failed generation or integrity check
- Sprint-ordering patch `dd5dc7a` ensures ascending order (115 before 116 before 117)
- Pre-flight-validator patch `dd5dc7a` allows new test files, new migrations, and __tests__/__integration__ paths through
- Leaked API key incident (INC-001) is contained — key revoked, 401 verified

## Reference

- Plan: `plans/a-plus-investability-plan.md`
- Runbook: `plans/m1-resumption-runbook.md`
- Previous directive: `reports/owner/DIR-005-m1-gap-catchup-2026-04-19.md`
- Incident: `reports/owner/INC-001-leaked-api-key-2026-04-17.md`
