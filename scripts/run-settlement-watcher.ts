// PM2 entrypoint for the on-chain settlement watcher.
// Long-running process — polls EVM chains for USDC Transfers to the
// configured seller wallet and auto-settles matching PENDING invoices.
//
// Start:
//   SETTLEMENT_WATCHER_ENABLED=true npx ts-node scripts/run-settlement-watcher.ts
//
// Or via PM2 (see ecosystem.config.js entry 'settlement-watcher').

import 'dotenv/config';
import { SettlementWatcher, loadWatcherConfig } from '../backend/src/services/settlement/watcher';

async function main() {
  const config = loadWatcherConfig();

  if (!config.enabled) {
    console.log('[settlement-watcher] SETTLEMENT_WATCHER_ENABLED is not "true" — exiting cleanly.');
    process.exit(0);
  }

  const watcher = new SettlementWatcher(config);

  process.on('SIGINT', () => {
    console.log('[settlement-watcher] SIGINT received — stopping');
    watcher.stop();
    setTimeout(() => process.exit(0), 1000);
  });
  process.on('SIGTERM', () => {
    console.log('[settlement-watcher] SIGTERM received — stopping');
    watcher.stop();
    setTimeout(() => process.exit(0), 1000);
  });

  await watcher.start();

  // Keep process alive — the watcher schedules its own loop.
  setInterval(() => {
    const s = watcher.status();
    if (s.running) {
      console.log(`[settlement-watcher] heartbeat · cycles=${s.cyclesCompleted} · matches=${s.matchesFound}`);
    }
  }, 5 * 60 * 1000);
}

main().catch(err => {
  console.error('[settlement-watcher] fatal:', err);
  process.exit(1);
});
