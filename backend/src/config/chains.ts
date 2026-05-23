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
  {
    id: 'solana-devnet',
    name: 'Solana Devnet',
    rpcUrl: process.env.SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com',
    usdcAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    explorerUrl: 'https://solscan.io/?cluster=devnet',
    isTestnet: true,
    type: 'solana',
    usdcDecimals: 6,
  },
];

/**
 * Map of chain IDs to their configurations for O(1) lookup
 */
export const CHAIN_CONFIG_MAP: Map<string, ChainConfig> = new Map(
  SUPPORTED_CHAINS.map((chain) => [String(chain.id), chain])
);

/**
 * Retrieves the configuration for a specific chain
 * @param chainId - The chain identifier to look up
 * @returns The chain configuration if found
 * @throws UnsupportedChainError if the chain is not supported
 */
export function getChainConfig(chainId: string | number): ChainConfig {
  const config = CHAIN_CONFIG_MAP.get(String(chainId));
  if (!config) {
    throw new UnsupportedChainError(String(chainId));
  }
  return config;
}

/**
 * Checks if a chain is supported by the system
 * @param chainId - The chain identifier to check
 * @returns True if the chain is supported, false otherwise
 */
export function isChainSupported(chainId: string | number): boolean {
  return CHAIN_CONFIG_MAP.has(String(chainId));
}

/**
 * Returns all supported chain IDs
 * @returns Array of supported chain identifiers
 */
export function getSupportedChainIds(): (string | number)[] {
  return SUPPORTED_CHAINS.map((chain) => chain.id);
}

/**
 * Returns chains filtered by type (evm or solana)
 * @param type - The chain type to filter by
 * @returns Array of chain configurations matching the type
 */
export function getChainsByType(type: 'evm' | 'solana'): ChainConfig[] {
  return SUPPORTED_CHAINS.filter((chain) => chain.type === type);
}