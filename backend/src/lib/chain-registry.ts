import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TokenInvalidMintError, TokenInvalidTransferCheckError } from '@solana/spl-token';

// Environment variables for RPC URLs
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const SOLANA_CONNECTION = new Connection(SOLANA_RPC_URL, 'confirmed');

/**
 * Custom error class for chain validation failures
 */
export class ChainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChainValidationError';
    Error.captureStackTrace(this, ChainValidationError);
  }
}

/**
 * Custom error class for invalid Solana address format
 */
export class InvalidSolanaAddressError extends ChainValidationError {
  constructor(address: string) {
    super(`Invalid Solana address format: ${address}`);
    this.name = 'InvalidSolanaAddressError';
  }
}

/**
 * Custom error class for invalid Solana transaction signature
 */
export class InvalidTransactionSignatureError extends ChainValidationError {
  constructor(signature: string) {
    super(`Invalid Solana transaction signature: ${signature}`);
    this.name = 'InvalidTransactionSignatureError';
  }
}

/**
 * Custom error class for invalid SPL token transfer
 */
export class InvalidSplTokenTransferError extends ChainValidationError {
  constructor(reason: string) {
    super(`Invalid SPL token transfer: ${reason}`);
    this.name = 'InvalidSplTokenTransferError';
  }
}

/**
 * Supported blockchain protocol types
 */
export type ChainType = 'evm' | 'solana';

/**
 * Configuration for a supported blockchain network
 */
export interface ChainConfig {
  /** Unique identifier (e.g., 'base', 'polygon', 'solana') */
  id: string;
  /** Human-readable display name */
  displayName: string;
  /** Blockchain protocol type */
  type: ChainType;
  /** Chain ID: number for EVM chains, 'solana' string for Solana */
  chainId: number | string;
  /** RPC endpoint URL for chain communication */
  rpcUrl: string;
  /** USDC token contract address on this chain */
  usdcAddress: string;
  /** Block explorer URL for transaction lookups */
  explorerUrl: string;
  /** Decimal places for USDC token (6 for both EVM and Solana) */
  usdcDecimals: number;
}

/** Record of all supported chain configurations */
export const CHAINS: Record<string, ChainConfig> = {
  base: {
    id: 'base',
    displayName: 'Base',
    type: 'evm',
    chainId: 8453,
    rpcUrl: process.env.BASE_RPC_URL || 'https://base.gateway.tenderly.co',
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    explorerUrl: 'https://basescan.org',
    usdcDecimals: 6,
  },
  polygon: {
    id: 'polygon',
    displayName: 'Polygon',
    type: 'evm',
    chainId: 137,
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-bor-rpc.publicnode.com',
    usdcAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    explorerUrl: 'https://polygonscan.com',
    usdcDecimals: 6,
  },
  solana: {
    id: 'solana',
    displayName: 'Solana',
    type: 'solana',
    chainId: 'solana',
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    usdcAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    explorerUrl: 'https://solscan.io',
    usdcDecimals: 6,
  },
};

/**
 * Validates a Solana address (wallet or program address)
 * @param address - The address to validate
 * @returns True if valid base58-encoded Solana address
 * @throws InvalidSolanaAddressError if the address format is invalid
 */
export function validateSolanaAddress(address: string): boolean {
  try {
    if (!address || typeof address !== 'string') {
      throw new InvalidSolanaAddressError(address || 'undefined');
    }

    // Check minimum length for base58 encoded addresses (32 bytes = 43-44 chars)
    if (address.length < 32 || address.length > 44) {
      throw new InvalidSolanaAddressError(address);
    }

    // Attempt to create a PublicKey - will throw if invalid
    new PublicKey(address);

    return true;
  } catch (error) {
    if (error instanceof InvalidSolanaAddressError) {
      throw error;
    }
    throw new InvalidSolanaAddressError(address);
  }
}

/**
 * Validates a Solana transaction signature
 * @param signature - The transaction signature to validate
 * @returns True if valid base58-encoded transaction signature
 * @throws InvalidTransactionSignatureError if the signature format is invalid
 */
export function validateTransactionSignature(signature: string): boolean {
  try {
    if (!signature || typeof signature !== 'string') {
      throw new InvalidTransactionSignatureError(signature || 'undefined');
    }

    // Transaction signatures on Solana are typically 64 bytes encoded as base58 (88 chars)
    // Accept range from 64 to 128 characters for flexibility
    if (signature.length < 64 || signature.length > 128) {
      throw new InvalidTransactionSignatureError(signature);
    }

    // Basic base58 charset validation (excluding 0, O, I, l)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    if (!base58Regex.test(signature)) {
      throw new InvalidTransactionSignatureError(signature);
    }

    return true;
  } catch (error) {
    if (error instanceof InvalidTransactionSignatureError) {
      throw error;
    }
    throw new InvalidTransactionSignatureError(signature);
  }
}

/**
 * Validates an SPL token mint address
 * @param mintAddress - The SPL token mint address to validate
 * @returns True if valid SPL token mint address
 * @throws InvalidSolanaAddressError if the mint address format is invalid
 */
export function validateSplTokenMint(mintAddress: string): boolean {
  return validateSolanaAddress(mintAddress);
}

/**
 * Validates an SPL token transfer details
 * @param params - Transfer parameters
 * @param params.mintAddress - The SPL token mint address
 * @param params.fromAddress - Source wallet address
 * @param params.toAddress - Destination wallet address
 * @param params.amount - Transfer amount in raw tokens (smallest unit)
 * @param params.decimals - Token decimals (should be 6 for USDC)
 * @returns True if valid transfer details
 * @throws InvalidSplTokenTransferError if validation fails
 */
export function validateSplTokenTransfer(params: {
  mintAddress: string;
  fromAddress: string;
  toAddress: string;
  amount: bigint;
  decimals: number;
}): boolean {
  try {
    const { mintAddress, fromAddress, toAddress, amount, decimals } = params;

    // Validate addresses
    validateSolanaAddress(mintAddress);
    validateSolanaAddress(fromAddress);
    validateSolanaAddress(toAddress);

    // Ensure addresses are different
    if (fromAddress === toAddress) {
      throw new InvalidSplTokenTransferError('Source and destination addresses must be different');
    }

    // Validate amount is positive
    if (amount <= BigInt(0)) {
      throw new InvalidSplTokenTransferError('Transfer amount must be greater than 0');
    }

    // Validate decimals
    if (decimals < 0 || decimals > 20) {
      throw new InvalidSplTokenTransferError(`Invalid decimal places: ${decimals}`);
    }

    // Calculate max safe transfer (u64 max)
    const maxUint64 = BigInt('18446744073709551615');
    if (amount > maxUint64) {
      throw new InvalidSplTokenTransferError('Transfer amount exceeds u64 maximum');
    }

    return true;
  } catch (error) {
    if (error instanceof InvalidSplTokenTransferError) {
      throw error;
    }
    throw new InvalidSplTokenTransferError(String(error));
  }
}

/**
 * Fetches a transaction from Solana blockchain
 * @param signature - The transaction signature to fetch
 * @returns The parsed transaction object or null if not found
 * @throws InvalidTransactionSignatureError if signature format is invalid
 */
export async function fetchSolanaTransaction(signature: string): Promise<Transaction | null> {
  validateTransactionSignature(signature);

  try {
    const tx = await SOLANA_CONNECTION.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    return tx;
  } catch (error) {
    if (String(error).includes('Transaction not found')) {
      return null;
    }
    throw error;
  }
}

/**
 * Verifies that a transaction has been confirmed on Solana
 * @param signature - The transaction signature to verify
 * @returns True if transaction is confirmed
 * @throws Error if transaction not found or failed
 */
export async function verifySolanaTransactionConfirmed(signature: string): Promise<boolean> {
  validateTransactionSignature(signature);

  try {
    const status = await SOLANDA_CONNECTION.getSignatureStatus(signature);
    
    if (!status || !status.value) {
      return false;
    }

    const { err, confirmations, status: txStatus } = status.value;

    // Check for errors
    if (err) {
      throw new ChainValidationError(`Transaction failed: ${JSON.stringify(err)}`);
    }

    // Check confirmations (null means finalized)
    if (confirmations !== null && confirmations < 1) {
      return false;
    }

    return txStatus === 'confirmed' || txStatus === 'finalized';
  } catch (error) {
    if (error instanceof ChainValidationError) {
      throw error;
    }
    throw new ChainValidationError(`Failed to verify transaction: ${String(error)}`);
  }
}

/**
 * Retrieves the chain configuration for a given chain ID
 * @param chainId - The chain identifier (e.g., 'base', 'polygon', 'solana')
 * @returns The chain configuration object
 * @throws Error if the chain is not supported
 */
export function getChain(chainId: string): ChainConfig {
  const chain = CHAINS[chainId];
  if (!chain) {
    throw new Error(
      `Unsupported chain: ${chainId}. Supported: ${Object.keys(CHAINS).join(', ')}`
    );
  }
  return chain;
}

/**
 * Returns a list of all supported chain IDs
 * @returns Array of supported chain identifiers
 */
export function getSupportedChains(): string[] {
  return Object.keys(CHAINS);
}

/**
 * Checks if a chain is an EVM-compatible chain
 * @param chainId - The chain identifier to check
 * @returns True if the chain is EVM-compatible
 */
export function isEvmChain(chainId: string): boolean {
  return getChain(chainId).type === 'evm';
}

/**
 * Checks if a chain is Solana
 * @param chainId - The chain identifier to check
 * @returns True if the chain is Solana
 */
export function isSolanaChain(chainId: string): boolean {
  return getChain(chainId).type === 'solana';
}

/**
 * Returns chain configurations that support USDC payments
 * Includes both EVM and Solana chains with USDC support configured
 * @returns Array of chain configurations supporting USDC
 */
export function getChainsWithUsdcSupport(): ChainConfig[] {
  return Object.values(CHAINS).filter((chain) => {
    // All configured chains support USDC
    return Boolean(chain.usdcAddress && chain.usdcDecimals === 6);
  });
}

/**
 * Checks if a chain supports USDC as a payment method
 * @param chainId - The chain identifier to check
 * @returns True if the chain supports USDC payments
 */
export function chainSupportsUsdc(chainId: string): boolean {
  const chain = CHAINS[chainId];
  return Boolean(chain?.usdcAddress && chain?.usdcDecimals === 6);
}