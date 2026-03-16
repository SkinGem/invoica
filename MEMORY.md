# Invoica Project State

## Current State (2026-03-16)
- **Git**: 092916b on main, pushed to origin
- **Tests**: 75/75 suites, 471/471 tests — ALL PASS
- **TypeScript**: 0 source errors (6 in node_modules/ox — skipLibCheck)
- **Backend**: Running on Hetzner (port 3001), health OK, DB connected
- **OpenClaw**: Crash-looping ("Gateway service disabled") — 2024+ restarts, known issue since v2026.2.26
- **Frontend**: Vercel (no local node_modules — deps installed by Vercel)
- **Sprint Runner**: Waiting (cron */30)
- **git-autodeploy**: Running (cron */5)

## Infrastructure
- **Server**: Hetzner VPS 65.108.90.178, disk 19%
- **Backend port**: 3001 (not 3000)
- **OpenClaw port**: 18789 (WebSocket, not HTTP)
- **DB**: Supabase (Session Pooler port 6543)
- **.env**: Exists on server, NOT in git (only .env.example)

## Completed Today (5 sprints)
1. HF-JEST — Jest + ts-jest configured
2. SOL-005 — Solana paymentDetails validation (programId + tokenMint)
3. HF-SOL-TESTS — Solana detector test rewrite
4. CTO-006 — Frontend api-keys page split (545→294 lines)
5. HF-TESTS — Fixed all 75 test suites to match implementations

## Known Issues
- OpenClaw gateway: "Gateway service disabled" crash loop — needs v2026.3.13 upgrade or config fix
- Redis: not_configured (backend health shows redis: not_configured)
- backend/tests/ directory: legacy vitest-based tests excluded from jest config
- .env not in repo (only .env.example) — local dev can't run full stack

## Remaining Daily Plan Items
- [ ] OpenClaw upgrade v2026.2.26 → v2026.3.13
- [ ] CTO-20260217-002: Agent health monitoring assessment
- [ ] CTO-20260219-003: Low-score pattern monitoring
- [ ] Response caching go/no-go decision

## V17 Migration Status
- All 4 V17 sprints COMPLETE
- SOL-004 Solana invoice creation COMPLETE
- SOL-005 Solana paymentDetails validation COMPLETE
- Chain tests COMPLETE (chain-registry, settlement-router, solana-detector)
