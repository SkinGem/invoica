/**
 * Multi-chain configuration registry
 * Manages supported blockchain networks and their configurations
 * @packageDocumentation
 */

import { ChainConfig } from '../types/index.js';

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
 * Maps chain identifier to its configuration
 */
export const SUPPORTED_CHAINS: Map<string, ChainConfig> = new Map<string, ChainConfig>([
  [
    'base',
    {
      id: 8453,
      name: 'Base',
      rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
      usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      explorerUrl: 'https://basescan.org',
      isTestnet: false,
    },
  ],
  [
    'polygon',
    {
      id: 137,
      name: 'Polygon',
      rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
      usdcAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      explorerUrl: 'https://polygonscan.com',
      isTestnet: false,
    },
  ],
  [
    'arbitrum',
    {
      id: 42161,
      name: 'Arbitrum One',
      rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      explorerUrl: 'https://arbiscan.io',
      isTestnet: false,
    },
  ],
]);

/**
 * Retrieves the configuration for a given chain
 * @param chainId - The chain identifier (e.g., 'base', 'polygon', 'arbitrum')
 * @returns The chain configuration
 * @throws {UnsupportedChainError} If the chain is not supported
 * @example
 *
