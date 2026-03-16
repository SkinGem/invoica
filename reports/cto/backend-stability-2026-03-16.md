# Backend Stability Fix (Sprint 009)

**Date**: 2026-03-16
**Issue**: Backend PM2 process had `cron_restart: */30 * * * *` set via CLI, causing unnecessary restarts every 30 minutes. Over 5 days this accumulated 171 restarts.

**Root Cause**: Someone set the cron restart via `pm2 restart backend --cron "*/30 * * * *"` at some point (not in ecosystem.config.js). This survived PM2 saves.

**Fix**:
1. `pm2 stop backend` → `pm2 delete backend` (removes all runtime overrides)
2. `pm2 start ecosystem.config.js --only backend` (recreates from clean config)
3. `pm2 save` (persists clean state)

**Result**: Backend restart counter reset to 0. No cron restart. Process only restarts on crash or git-autodeploy.

**Verification**: `curl http://localhost:3001/v1/health` → `{"status":"ok","uptime":14s,"services":{"database":"ok"}}`
