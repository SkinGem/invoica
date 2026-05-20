// Long-running on-chain settlement watcher.
//
// Polls each registered EVM chain every N seconds for USDC Transfer events
// to the configured seller wallet. Matches each observed transfer against
// PENDING Invoice rows via auto-settle.ts and flips status to SETTLED.
//
// State (last-scanned block per chain) is kept in memory — on restart the
// watcher rescans the last N blocks (default 200) to catch anything
// missed during downtime. Idempotency is enforced by PaymentEvents'
// UNIQUE(chain, txHash) constraint, so duplicate scans are safe.
//
// Configuration via env:
//   SETTLEMENT_WATCHER_ENABLED=true        — opt-in, default off
//   SETTLEMENT_WATCHER_POLL_INTERVAL_MS    — default 20000 (20s)
//   SETTLEMENT_WATCHER_CHAINS              — csv list, default 'base,polygon,arbitrum,skale'
//   SETTLEMENT_WATCHER_INITIAL_BLOCKS_BACK — default 200
//   X402_SELLER_WALLET                     — required (the recipient address to watch)

import { ChainRegistry } from './chain-registry';
import { autoSettleFromTransfer } from './auto-settle';

const DEFAULT_POLL_MS = 20_000;
const DEFAULT_INITIAL_BLOCKS_BACK = 200;
const DEFAULT_CHAINS = 'base,polygon,arbitrum,skale';

export interface WatcherConfig {
  enabled: boolean;
  pollIntervalMs: number;
  chains: string[];
  sellerWallet: string;
  initialBlocksBack: number;
}

export function loadWatcherConfig(): WatcherConfig {
  const sellerWallet = process.env.X402_SELLER_WALLET || process.env.SELLER_WALLET || '';
  return {
    enabled: process.env.SETTLEMENT_WATCHER_ENABLED === 'true',
    pollIntervalMs: Number(process.env.SETTLEMENT_WATCHER_POLL_INTERVAL_MS) || DEFAULT_POLL_MS,
    chains: (process.env.SETTLEMENT_WATCHER_CHAINS || DEFAULT_CHAINS).split(',').map(c => c.trim()).filter(Boolean),
    sellerWallet,
    initialBlocksBack: Number(process.env.SETTLEMENT_WATCHER_INITIAL_BLOCKS_BACK) || DEFAULT_INITIAL_BLOCKS_BACK,
  };
}

export class SettlementWatcher {
  private registry: ChainRegistry;
  private lastBlock = new Map<string, number>();
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private cyclesCompleted = 0;
  private matchesFound = 0;

  constructor(private config: WatcherConfig) {
    this.registry = new ChainRegistry();
  }

  async start(): Promise<void> {
    if (this.running) return;
    if (!this.config.enabled) {
      console.log('[watcher] disabled (SETTLEMENT_WATCHER_ENABLED!=true) — exiting');
      return;
    }
    if (!this.config.sellerWallet) {
      throw new Error('[watcher] X402_SELLER_WALLET not configured — cannot start');
    }

    this.running = true;
    console.log(`[watcher] starting · chains=${this.config.chains.join(',')} · interval=${this.config.pollIntervalMs}ms · wallet=${this.config.sellerWallet}`);

    // Cold-start: seed lastBlock with (latest - initialBlocksBack) per chain
    for (const chainId of this.config.chains) {
      try {
        const detector = this.registry.getDetector(chainId);
        const latest = await detector.getLatestBlock();
        const startFrom = Math.max(0, latest - this.config.initialBlocksBack);
        this.lastBlock.set(chainId, startFrom);
        console.log(`[watcher] ${chainId} cold-start at block ${startFrom} (latest=${latest})`);
      } catch (err) {
        console.error(`[watcher] ${chainId} cold-start failed:`, err);
      }
    }

    this.scheduleNextCycle();
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log(`[watcher] stopped · cycles=${this.cyclesCompleted} · matches=${this.matchesFound}`);
  }

  private scheduleNextCycle(): void {
    if (!this.running) return;
    this.timer = setTimeout(() => {
      this.runCycle().catch(err => console.error('[watcher] cycle error:', err)).finally(() => this.scheduleNextCycle());
    }, this.config.pollIntervalMs);
  }

  private async runCycle(): Promise<void> {
    for (const chainId of this.config.chains) {
      try {
        await this.scanChain(chainId);
      } catch (err) {
        console.error(`[watcher] ${chainId} scan error:`, err);
      }
    }
    this.cyclesCompleted += 1;
  }

  private async scanChain(chainId: string): Promise<void> {
    const detector = this.registry.getDetector(chainId);
    const latest = await detector.getLatestBlock();
    const fromBlock = (this.lastBlock.get(chainId) ?? latest) + 1;
    if (fromBlock > latest) return; // nothing new

    const transfers = await detector.scanTransfersToAddress(this.config.sellerWallet, fromBlock, latest);
    if (transfers.length > 0) {
      console.log(`[watcher] ${chainId} ${fromBlock}..${latest} · ${transfers.length} transfer(s) to ${this.config.sellerWallet}`);
    }

    for (const transfer of transfers) {
      try {
        const result = await autoSettleFromTransfer(transfer);
        if (result.matched) {
          this.matchesFound += 1;
          console.log(`[watcher] ✓ matched ${transfer.chain}:${transfer.txHash.slice(0, 12)}… → invoice #${result.invoiceNumber} (${result.invoiceId})`);
        } else if (result.duplicate) {
          // already seen, fine
        } else {
          console.log(`[watcher] · unmatched ${transfer.chain}:${transfer.txHash.slice(0, 12)}… (${result.reason})`);
        }
      } catch (err) {
        console.error(`[watcher] auto-settle failed for ${transfer.chain}:${transfer.txHash}:`, err);
      }
    }

    this.lastBlock.set(chainId, latest);
  }

  // Test hook
  status() {
    return {
      running: this.running,
      cyclesCompleted: this.cyclesCompleted,
      matchesFound: this.matchesFound,
      lastBlock: Object.fromEntries(this.lastBlock),
    };
  }
}
