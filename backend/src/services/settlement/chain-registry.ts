import { ChainConfig, SUPPORTED_CHAINS } from '../../config/chains';
import { EvmSettlementDetector } from './evm-detector';

/**
 * Registry for managing settlement detectors across different blockchain networks.
 * Provides a unified interface for creating and accessing chain-specific detectors.
 */
export class ChainRegistry {
  private detectors: Map<string, EvmSettlementDetector> = new Map();

  constructor() {
    this.initializeDetectors();
  }

  /**
   * Initialize detectors for all supported chains
   */
  private initializeDetectors(): void {
    for (const chain of SUPPORTED_CHAINS) {
      if (chain.type === 'evm') {
        const detector = new EvmSettlementDetector(chain);
        this.detectors.set(chain.id, detector);
      }
    }
  }

  /**
   * Get a settlement detector for a specific chain
   * @param chainId - The chain identifier
   * @returns The settlement detector for the chain
   * @throws Error if chain is not supported
   */
  getDetector(chainId: string): EvmSettlementDetector {
    const detector = this.detectors.get(chainId);
    if (!detector) {
      throw new Error(`No detector available for chain: ${chainId}`);
    }
    return detector;
  }

  /**
   * Get all available chain IDs
   * @returns Array of supported chain identifiers
   */
  getSupportedChains(): string[] {
    return Array.from(this.detectors.keys());
  }

  /**
   * Check if a chain is supported
   * @param chainId - The chain identifier to check
   * @returns True if the chain is supported
   */
  isChainSupported(chainId: string): boolean {
    return this.detectors.has(chainId);
  }

  /**
   * Get chain configuration by ID
   * @param chainId - The chain identifier
   * @returns The chain configuration
   * @throws Error if chain is not found
   */
  getChainConfig(chainId: string): ChainConfig {
    const config = SUPPORTED_CHAINS.find(chain => chain.id === chainId);
    if (!config) {
      throw new Error(`Chain configuration not found: ${chainId}`);
    }
    return config;
  }

  /**
   * Get all EVM chain configurations
   * @returns Array of EVM chain configurations
   */
  getEvmChains(): ChainConfig[] {
    return SUPPORTED_CHAINS.filter(chain => chain.type === 'evm');
  }
}

// Singleton instance for global use
export const chainRegistry = new ChainRegistry();