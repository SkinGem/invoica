#!/bin/bash
# git-autodeploy.sh — polls GitHub every 5 min, self-deploys new commits
# Runs as a PM2 cron process (fire-and-forget, autorestart: false)
#
# What it does:
#   1. git fetch to check for new commits
#   2. If nothing new → exit 0 (silent)
#   3. If new commit → git pull, detect which services changed, restart them
#   4. Logs every deployment with commit hash + changed files

set -euo pipefail

APP_DIR="/home/invoica/apps/Invoica"
cd "$APP_DIR"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# ── 1. Fetch remote silently ──────────────────────────────────────────
git fetch origin main --quiet 2>/dev/null

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "[$TIMESTAMP] [AutoDeploy] No changes (HEAD=$LOCAL)"
  exit 0
fi

# ── 2. New commit detected ────────────────────────────────────────────
echo "[$TIMESTAMP] [AutoDeploy] New commit: $LOCAL → $REMOTE"

# Get changed files BEFORE pulling (so we know what changed)
CHANGED=$(git diff --name-only HEAD origin/main)
echo "[$TIMESTAMP] [AutoDeploy] Changed files:"
echo "$CHANGED" | sed 's/^/  /'

# ── 3. Pull ───────────────────────────────────────────────────────────
git pull origin main --quiet
echo "[$TIMESTAMP] [AutoDeploy] Pull complete"

# ── 4. Restart affected services ─────────────────────────────────────

# Backend: any change under backend/
if echo "$CHANGED" | grep -q "^backend/"; then
  echo "[$TIMESTAMP] [AutoDeploy] backend/ changed → restarting backend"
  pm2 restart backend
  echo "[$TIMESTAMP] [AutoDeploy] backend restarted"
fi

# Telegram bot script
if echo "$CHANGED" | grep -q "^scripts/telegram-bot\.ts$"; then
  echo "[$TIMESTAMP] [AutoDeploy] telegram-bot.ts changed → restarting telegram-bot"
  pm2 restart telegram-bot
  echo "[$TIMESTAMP] [AutoDeploy] telegram-bot restarted"
fi

# Heartbeat daemon (cron-based — will pick up changes on next cron fire, no restart needed)
if echo "$CHANGED" | grep -q "^scripts/heartbeat-daemon\.ts$"; then
  echo "[$TIMESTAMP] [AutoDeploy] heartbeat-daemon.ts changed — will apply on next hourly cron"
fi

# ecosystem.config.js: requires manual intervention (env vars, new processes)
if echo "$CHANGED" | grep -q "^ecosystem\.config\.js$"; then
  echo "[$TIMESTAMP] [AutoDeploy] WARNING: ecosystem.config.js changed — requires manual: env \$(cat .env | grep -v '#' | xargs) pm2 reload ecosystem.config.js --update-env"
fi

echo "[$TIMESTAMP] [AutoDeploy] ✅ Done — deployed $REMOTE"
