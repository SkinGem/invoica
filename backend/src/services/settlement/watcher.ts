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
import { EvmSettlementDetector } from './evm-detector';
import { SolanaSettlementDetector } from './solana-detector';
import { autoSettleFromTransfer } from './auto-settle';
import { SUPPORTED_CHAINS_MAP } from '../../config/chains';

const DEFAULT_POLL_MS = 20_000;
const DEFAULT_INITIAL_BLOCKS_BACK = 200;
const DEFAULT_SOLANA_SIG_LIMIT = 20;
const DEFAULT_CHAINS = 'base,arbitrum,skale,solana';

export interface WatcherConfig {
  enabled: boolean;
  pollIntervalMs: number;
  chains: string[];
  evmSellerWallet: string;
  solanaSellerWallet: string;
  initialBlocksBack: number;
  solanaSigLimit: number;
}

export function loadWatcherConfig(): WatcherConfig {
  return {
    enabled: process.env.SETTLEMENT_WATCHER_ENABLED === 'true',
    pollIntervalMs: Number(process.env.SETTLEMENT_WATCHER_POLL_INTERVAL_MS) || DEFAULT_POLL_MS,
    chains: (process.env.SETTLEMENT_WATCHER_CHAINS || DEFAULT_CHAINS).split(',').map(c => c.trim()).filter(Boolean),
    evmSellerWallet: process.env.X402_SELLER_WALLET || process.env.SELLER_WALLET || '',
    solanaSellerWallet: process.env.X402_SOLANA_SELLER_WALLET || '',
    initialBlocksBack: Number(process.env.SETTLEMENT_WATCHER_INITIAL_BLOCKS_BACK) || DEFAULT_INITIAL_BLOCKS_BACK,
    solanaSigLimit: Number(process.env.SETTLEMENT_WATCHER_SOLANA_SIG_LIMIT) || DEFAULT_SOLANA_SIG_LIMIT,
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

    // Validate that at least one seller wallet is configured for the chains being watched.
    const needsEvm = this.config.chains.some(c => SUPPORTED_CHAINS_MAP.get(c)?.type === 'evm');
    const needsSolana = this.config.chains.some(c => SUPPORTED_CHAINS_MAP.get(c)?.type === 'solana');
    if (needsEvm && !this.config.evmSellerWallet) throw new Error('[watcher] X402_SELLER_WALLET not configured');
    if (needsSolana && !this.config.solanaSellerWallet) throw new Error('[watcher] X402_SOLANA_SELLER_WALLET not configured');

    this.running = true;
    console.log(`[watcher] starting · chains=${this.config.chains.join(',')} · interval=${this.config.pollIntervalMs}ms · evm=${this.config.evmSellerWallet || '-'} · solana=${this.config.solanaSellerWallet || '-'}`);

    // Cold-start: EVM chains seed lastBlock; Solana chains seed nothing (signature-based, no block range needed).
    for (const chainId of this.config.chains) {
      try {
        const chainCfg = SUPPORTED_CHAINS_MAP.get(chainId);
        if (!chainCfg) {
          console.error(`[watcher] unknown chain: ${chainId} — skipped`);
          continue;
        }
        if (chainCfg.type === 'evm') {
          const detector = this.registry.getDetector(chainId) as EvmSettlementDetector;
          const latest = await detector.getLatestBlock();
          const startFrom = Math.max(0, latest - this.config.initialBlocksBack);
          this.lastBlock.set(chainId, startFrom);
          console.log(`[watcher] ${chainId} (evm) cold-start at block ${startFrom} (latest=${latest})`);
        } else if (chainCfg.type === 'solana') {
          console.log(`[watcher] ${chainId} (solana) cold-start — will poll last ${this.config.solanaSigLimit} signatures per cycle (dedup via PaymentEvents UNIQUE)`);
        }
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
    const chainCfg = SUPPORTED_CHAINS_MAP.get(chainId);
    if (!chainCfg) return;

    let transfers: Awaited<ReturnType<EvmSettlementDetector['scanTransfersToAddress']>> = [];

    if (chainCfg.type === 'evm') {
      const detector = this.registry.getDetector(chainId) as EvmSettlementDetector;
      const latest = await detector.getLatestBlock();
      const fromBlock = (this.lastBlock.get(chainId) ?? latest) + 1;
      if (fromBlock > latest) return; // nothing new
      transfers = await detector.scanTransfersToAddress(this.config.evmSellerWallet, fromBlock, latest);
      if (transfers.length > 0) {
        console.log(`[watcher] ${chainId} ${fromBlock}..${latest} · ${transfers.length} transfer(s) to ${this.config.evmSellerWallet}`);
      }
      this.lastBlock.set(chainId, latest);
    } else if (chainCfg.type === 'solana') {
      const detector = this.registry.getDetector(chainId) as SolanaSettlementDetector;
      // No block-range — Solana detector polls the wallet's recent signatures.
      // PaymentEvents UNIQUE(chain, txHash) dedups across cycles, so repolling is safe.
      transfers = await detector.getRecentUsdcTransfers(this.config.solanaSellerWallet, this.config.solanaSigLimit);
    }

    for (const transfer of transfers) {
      try {
        const result = await autoSettleFromTransfer(transfer);
        if (result.matched) {
          this.matchesFound += 1;
          console.log(`[watcher] ✓ matched ${transfer.chain}:${transfer.txHash.slice(0, 12)}… → invoice #${result.invoiceNumber} (${result.invoiceId})`);
        } else if (result.duplicate) {
          // already seen — Solana repolls the same recent window each cycle, so this is the steady state.
        } else {
          // Skip noise for Solana — there will be many unmatched transfers on the wallet from other flows
          if (chainCfg.type === 'evm') {
            console.log(`[watcher] · unmatched ${transfer.chain}:${transfer.txHash.slice(0, 12)}… (${result.reason})`);
          }
        }
      } catch (err) {
        console.error(`[watcher] auto-settle failed for ${transfer.chain}:${transfer.txHash}:`, err);
      }
    }
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
