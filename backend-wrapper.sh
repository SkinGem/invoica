#!/bin/bash
# Invoica backend startup wrapper
# Loads .env and starts the backend via ts-node (no build step required).
# Referenced by ecosystem.config.js as the PM2 entry point.
#
# If the backend needs a compiled build instead, replace the exec line with:
#   exec node /home/invoica/apps/Invoica/dist/backend/src/server.js

set -a
# shellcheck source=/dev/null
source /home/invoica/apps/Invoica/.env 2>/dev/null
set +a

cd /home/invoica/apps/Invoica

# Kill any stale process holding port 3001 before starting.
# Prevents EADDRINUSE crash loop when PM2 restarts faster than the old
# ts-node process releases the port.
fuser -k 3001/tcp 2>/dev/null || true
sleep 1

exec /home/invoica/apps/Invoica/node_modules/.bin/ts-node \
  --project tsconfig.json \
  --transpile-only \
  backend/src/server.ts
