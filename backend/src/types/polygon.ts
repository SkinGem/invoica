/**
 * Polygon Chain Types for Invoicing System
 * @fileoverview Type definitions for Polygon blockchain integration
 */

import { z } from 'zod';

/**
 * Polygon chain configuration
 * Represents the Polygon PoS mainnet or testnet configuration
 */
export interface PolygonChain {
  /** Unique chain identifier (e.g., 137 for mainnet, 80001 for testnet) */
  chainId: number;
  /** Human-readable chain name */
  chainName: string;
  /** RPC endpoint URL for chain communication */
  rpcUrl: string;
  /** Block explorer URL for transaction/address lookup */
  blockExplorerUrl: string;
}

/**
 * Supported currencies on Polygon network for invoice payments
 */
export enum PolygonCurrency {
  MATIC = 'MATIC',
  USDC = 'USDC',
  USDT = 'USDT',
}

/**
 * Branded type for Polygon EVM addresses
 * Enforces 0x prefix followed by exactly 40 hexadecimal characters
 * Provides compile-time safety for address validation
 */
type PolygonAddressBrand = { readonly __brand: 'PolygonAddress' };

/**
 * Polygon address type - validated EVM address format
 * @example 0x742d35Cc6634C0532925a3b844Bc9e7595f1234
 */
export type PolygonAddress = string & PolygonAddressBrand;

/**
 * Schema for runtime validation of Polygon addresses
 */
export const PolygonAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Polygon address format');

/**
 * Type guard to check if a string is a valid Polygon address
 * @param value - Value to check
 * @returns True if valid Polygon address
 */
export function isPolygonAddress(value: unknown): value is PolygonAddress {
  if (typeof value !== 'string') return false;
  return PolygonAddressSchema.safeParse(value).success;
}

/**
 * Factory function to create a validated PolygonAddress
 * @param address - String address to validate and cast
 * @returns Validated PolygonAddress
 * @throws ZodError if address format is invalid
 */
export function createPolygonAddress(address: string): PolygonAddress {
  const validated = PolygonAddressSchema.parse(address);
  return validated as PolygonAddress;
}

/**
 * Supported chains in the invoicing system including Polygon
 * Extends the base chain type to include Polygon chain
 */
export type SupportedChainWithPolygon =
  | 'ETHEREUM'
  | 'POLYGON'
  | 'ARBITRUM'
  | 'OPTIMISM';

/**
 * Polygon chain configurations for different networks
 */
export const PolygonChains: Record<'mainnet' | 'testnet', PolygonChain> = {
  mainnet: {
    chainId: 137,
    chainName: 'Polygon PoS',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorerUrl: 'https://polygonscan.com',
  },
  testnet: {
    chainId: 80001,
    chainName: 'Polygon Mumbai Testnet',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    blockExplorerUrl: 'https://mumbai.polygonscan.com',
  },
} as const;

/**
 * Default Polygon chain configuration (mainnet)
 */
export const DEFAULT_POLYGON_CHAIN: PolygonChain = PolygonChains.mainnet;