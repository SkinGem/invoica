# Invoica Project State

## Current State (2026-03-16)
- **Git**: 445408c on main, pushed to origin (clean)
- **Tests**: 76/76 suites, 481/481 tests — ALL PASS
- **TypeScript**: 0 source errors (6 in node_modules/ox — skipLibCheck)
- **Backend**: Running on Hetzner (port 3001), health OK, DB connected — RECOVERED (HF-002)
- **OpenClaw**: Stable (v2026.3.13, port 18789 WebSocket)
- **Frontend**: Vercel (no local node_modules — deps installed by Vercel)
- **Sprint Runner**: Waiting (cron */30)
- **git-autodeploy**: Stopped (not critical)

## Infrastructure
- **Server**: Hetzner VPS 65.108.90.178, disk ~19%
- **Backend port**: 3001 (not 3000). Health: /v1/health
- **OpenClaw port**: 18789 (WebSocket, not HTTP) — v2026.3.13
- **DB**: Supabase (Session Pooler port 6543)
- **.env**: Exists on server, NOT in git (only .env.example)
- **Health URL**: http://localhost:3001/v1/health (not /health)

## Completed Sprints (This Session)
1. HF-JEST — Jest + ts-jest configured (7d71034)
2. SOL-005 — Solana paymentDetails validation (897177d)
3. HF-SOL-TESTS — Solana detector test rewrite (0574478)
4. CTO-006 — Frontend api-keys page split 545→294 lines (4069ad2)
5. HF-TESTS — Fixed all 75 test suites (092916b)
6. Sprint 006 — Solana x402 adapter + OpenClaw fix (b995fd9)
7. Sprint 007 — Low-score pattern monitoring (730e532)
8. Sprint 008 — Agent health monitoring assessment (6a2bcf0)
9. Sprint 009 — Backend PM2 stability fix (dd1529a)
10. Sprint 010 — Legacy test cleanup 38 files (3de6abd)
11. Sprint 011 — Wire Solana invoice route (8ffeeea)
12. HF-001 — PM2 listen_timeout 10s→60s fix (445408c)
13. HF-002 — Kill stale root node process holding port 3001 (server-only, no code change)

## Known Issues
- Redis: not_configured (backend health shows redis: not_configured — non-blocking)
- .env not in repo (only .env.example) — local dev can't run full stack
- openclaw-gateway: PM2 shows "waiting" state (24 restarts) but gateway IS functional
- CMO-001: Reactivate Manus CMO blocked — needs MANUS_API_KEY (human action)

## Week-76 Status — ALL DONE
- [x] FIX-001, FIX-002, FIX-003, FIX-004, FIX-005 — all done
- [x] SOL-004, SOL-005, SOL-006 — Solana features complete
- [x] FRONTEND-001 — api-keys page split
- [x] INFRA-001 — OpenClaw stable
- [x] MONITOR-001 — low-score monitoring script
- [x] ASSESS-001 — caching NO-GO
- [ ] CMO-001 — blocked on human action (MANUS_API_KEY)

## Next Sprint: Sprint 012 — Tax Compliance Engine Wiring
Tax service is built (services/tax/) but not wired to any routes. Sprint 012 will:
- Add tax fields to Prisma Invoice schema (nullable, backward compat)
- Create routes/tax.ts with 3 endpoints
- Wire calculateTax() into POST /v1/invoices
- Add test coverage

## V17 + Solana Migration — COMPLETE
- All 4 V17 sprints COMPLETE
- SOL-004, SOL-005, SOL-006 — ALL COMPLETE
- Chain tests COMPLETE
