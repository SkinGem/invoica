/**
 * Multi-chain configuration registry
 * Manages supported blockchain networks and their configurations
 * @packageDocumentation
 */

/**
 * Base interface for all blockchain network configurations
 */
export interface ChainConfig {
  /** Chain identifier (string for Solana, number for EVM chains) */
  id: string | number;
  /** Human-readable chain name */
  name: string;
  /** RPC endpoint URL */
  rpcUrl: string;
  /** USDC token contract address */
  usdcAddress: string;
  /** Block explorer base URL */
  explorerUrl: string;
  /** Whether this is a testnet */
  isTestnet: boolean;
  /** Chain type for routing */
  type: 'evm' | 'solana';
  /** USDC token decimals (6 for most chains) */
  usdcDecimals: number;
}

/**
 * Custom error thrown when an unsupported chain is requested
 */
export class UnsupportedChainError extends Error {
  readonly chainId: string;

  constructor(chainId: string) {
    super(`Chain '${chainId}' is not supported`);
    this.name = 'UnsupportedChainError';
    this.chainId = chainId;
    Error.captureStackTrace(this, UnsupportedChainError);
  }
}

/**
 * Default chain identifier used when no chain is specified
 */
export const DEFAULT_CHAIN = 'base';

/**
 * Supported blockchain networks configuration
 * Array of chain configurations for easier iteration
 */
export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: 'base',
    name: 'Base',
    rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    explorerUrl: 'https://basescan.org',
    isTestnet: false,
    type: 'evm',
    usdcDecimals: 6,
  },
  {
    id: 'polygon',
    name: 'Polygon',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    usdcAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    explorerUrl: 'https://polygonscan.com',
    isTestnet: false,
    type: 'evm',
    usdcDecimals: 6,
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum One',
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    explorerUrl: 'https://arbiscan.io',
    isTestnet: false,
    type: 'evm',
    usdcDecimals: 6,
  },
  {
    // SKALE Base mainnet — gasless x402 payments, Skale team's recommended
    // chain for agent payment integrations (per Manuel, Developer Success,
    // 2026-04-22). Zero gas, pre-paid compute credits, EVM-compatible,
    // Permit2 at canonical addresses.
    // Chain ID 1187947933 (0x46CEA59D).
    // Quickstart: https://docs.skale.space/get-started/quick-start/skale-on-base
    id: 'skale',
    name: 'SKALE Base',
    rpcUrl: process.env.SKALE_RPC_URL || 'https://skale-base.skalenodes.com/v1/base',
    usdcAddress: '0x85889c8c714505E0c94b30fcfcF64fE3Ac8FCb20',
    explorerUrl: 'https://skale-base-explorer.skalenodes.com',
    isTestnet: false,
    type: 'evm',
    usdcDecimals: 6,
  },
  {
    id: 'solana',
    name: 'Solana',
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    usdcAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    explorerUrl: 'https://solscan.io',
    isTestnet: false,
    type: 'solana',
    usdcDecimals: 6,
  },
];

/**
 * Map for O(1) chain lookups by ID
 */
export const SUPPORTED_CHAINS_MAP: Map<string, ChainConfig> = new Map(
  SUPPORTED_CHAINS.map(chain => [String(chain.id), chain])
);

/**
 * Retrieves the configuration for a given chain
 * @param chainId - The chain identifier (e.g., 'base', 'polygon', 'arbitrum')
 * @returns The chain configuration
 * @throws {UnsupportedChainError} If the chain is not supported
 * @example
 *
 * const config = getChainConfig("base");
 * console.log(config.name); // "Base"
 */
export function getChainConfig(chainId: string): ChainConfig {
  const config = SUPPORTED_CHAINS_MAP.get(chainId);
  if (!config) {
    throw new UnsupportedChainError(chainId);
  }
  return config;
}

/**
 * Returns all supported chain identifiers
 */
export function getSupportedChainIds(): string[] {
  return Array.from(SUPPORTED_CHAINS_MAP.keys());
}

/**
 * Checks whether a given chain ID is supported
 */
export function isChainSupported(chainId: string): boolean {
  return SUPPORTED_CHAINS_MAP.has(chainId);
}