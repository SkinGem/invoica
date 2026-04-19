# M1 Resumption Runbook

**Context:** Swarm was halted 2026-04-17 after MiniMax plan outage + destructive-rewrite bug. State on 2026-04-19: zero M1 tasks shipped, 21 tasks pending across sprints 115/115a/116/117, 5 days to M1 gate.

**Preconditions:**
- You're at the Mac (SSH working via `invoica-server` alias)
- New MiniMax key in `.env` on Hetzner (verified HTTP 200 on 2026-04-17)
- `dd5dc7a` patches live (sprint-ordering + pre-flight)
- Defensive patch (this commit) prevents stub-writes on API failure

## Step 1 — sync Hetzner + verify state

```
ssh invoica-server "cd /home/invoica/apps/Invoica && git pull origin main && echo '=== HEAD ===' && git log --oneline -3 && echo '=== running procs ===' && ps -ef | grep -E 'orchestrate-agents-v2|run-swarm|sprint-runner' | grep -v grep && echo '=== pm2 ===' && pm2 list 2>&1 | grep -E 'online|stopped' && echo '=== uncommitted count ===' && git status --short | wc -l"
```

Expected: `HEAD` includes the "defensive abort" commit. No orchestrator processes running. sprint-runner `stopped` or absent from list. Uncommitted count shows whatever accumulated during gap (likely 70+ — tracked separately).

## Step 2 — fix git-objects permissions (required for swarm commits)

```
ssh invoica-server "sudo chown -R invoica:invoica /home/invoica/apps/Invoica/.git && ls -la /home/invoica/apps/Invoica/.git/objects | head -3"
```

If sudo prompts for password, enter it. Without this, Phase-N post-task commits will silently fail and the swarm's work won't reach origin.

## Step 3 — dispatch week-115 manually

```
ssh invoica-server "cd /home/invoica/apps/Invoica && ./scripts/run-swarm.sh sprints/week-115.json 2>&1 | tail -150"
```

Expected timeline: 30–90 min for 7 tasks. Watch for:
- ✅ `✓ Written: ... (5000+ chars)` = real code generation
- ✅ Supervisor review with actual content, not 0/100 rejections
- ❌ `ABORTING task ... — file(s) failed generation` = new defensive patch firing (GOOD — means it stopped a destructive write). Retry count will increment; after 5 attempts task is rejected.
- ❌ `API error: ... MiniMax-M2.5 (2061)` = MiniMax plan broke again — investigate before retry

## Step 4 — verify tasks shipped

```
ssh invoica-server "python3 -c 'import json; d=json.load(open(\"/home/invoica/apps/Invoica/sprints/week-115.json\")); [print(t[\"id\"], \"→\", t[\"status\"]) for t in d[\"tasks\"]]'"
```

Goal: most tasks at `done` or `approved`. Any `rejected` or `suspended` → check the log for the reason.

## Step 5 — push swarm's work + dispatch next sprint

```
ssh invoica-server "cd /home/invoica/apps/Invoica && git log --oneline origin/main..HEAD && git push origin main"
```

Then week-116:

```
ssh invoica-server "cd /home/invoica/apps/Invoica && ./scripts/run-swarm.sh sprints/week-116.json 2>&1 | tail -150"
```

Then week-117 for gate verification.

## Step 6 — re-enable sprint-runner (only after one clean manual run)

```
ssh invoica-server "cd /home/invoica/apps/Invoica && pm2 start ecosystem.config.js --only sprint-runner && pm2 save"
```

Don't do this until you've seen at least one sprint finish cleanly. It re-arms the 30-min auto-dispatch cron.

## Deferred (not blocking M1 but track)

- Rotate Supabase DB password — leaked in terminal 2026-04-17
- Rotate new MiniMax key — also briefly visible in terminal 2026-04-17
- Move `Hetzener API.rtf` out of repo directory to `~/.invoica-secrets/` (M1-SEC-09)
- Commit 70+ accumulated agent-output files on Hetzner working tree
- Update smoke test (invoices/settlements now 401 by design, not a regression)
