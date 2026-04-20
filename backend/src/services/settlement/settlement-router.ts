/**
 * Settlement router — dispatches USDC detection to the correct chain detector.
 * Thin routing layer: no business logic, just chain-type dispatch.
 * @module settlement-router
 */
import { ChainRegistry } from './chain-registry';
import { EvmSettlementDetector, SettlementMatch } from './evm-detector';
import { SUPPORTED_CHAINS } from '../../config/chains';

// Initialize the chain registry
const chainRegistry = new ChainRegistry();

/**
 * Get chain configuration by ID
 * @param chainId - Chain identifier
 * @returns Chain configuration
 * @throws Error if chain is not supported
 */
export function getChain(chainId: string) {
  return chainRegistry.getChainConfig(chainId);
}

/**
 * Check if a chain is EVM-based
 * @param chainId - Chain identifier
 * @returns True if chain is EVM-based
 */
export function isEvmChain(chainId: string): boolean {
  const config = SUPPORTED_CHAINS.find(chain => chain.id === chainId);
  return config?.type === 'evm';
}

/**
 * Check for USDC payments to a recipient on any supported chain.
 * Routes to EvmSettlementDetector (Base, Polygon, Arbitrum) or SolanaSettlementDetector.
 *
 * @param chainId        - Chain ID from registry ('base' | 'polygon' | 'arbitrum' | 'solana')
 * @param recipientAddress - Address/pubkey to scan for incoming payments
 * @param options        - fromBlock (EVM), limit (Solana), expectedAmountUsdc
 */
export async function checkSettlement(
  chainId: string,
  recipientAddress: string,
  options?: {
    expectedAmountUsdc?: number;
    fromBlock?: number;
    limit?: number;
  }
): Promise<SettlementMatch[]> {
  if (!chainRegistry.isChainSupported(chainId)) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }

  if (isEvmChain(chainId)) {
    const detector = chainRegistry.getDetector(chainId);
    const fromBlock = options?.fromBlock ?? 'latest';
    return detector.scanTransfersToAddress(recipientAddress, fromBlock, 'latest');
  }

  // For Solana and other non-EVM chains, we would implement similar detector pattern
  // For now, throw error for non-EVM chains
  throw new Error(`Non-EVM chain detection not yet implemented: ${chainId}`);
}

/**
 * Verify a specific transaction is a valid USDC payment.
 *
 * @param chainId            - Chain identifier
 * @param txId               - Transaction hash (EVM) or signature (Solana)
 * @param recipientAddress   - Expected recipient address/pubkey
 * @param expectedAmountUsdc - Minimum USDC amount required
 */
export async function verifyPayment(
  chainId: string,
  txId: string,
  recipientAddress: string,
  expectedAmountUsdc: number
): Promise<boolean> {
  if (!chainRegistry.isChainSupported(chainId)) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }

  if (isEvmChain(chainId)) {
    const detector = chainRegistry.getDetector(chainId);
    return detector.verifyTransfer(txId, recipientAddress, expectedAmountUsdc);
  }

  // For Solana and other non-EVM chains, we would implement similar detector pattern
  // For now, throw error for non-EVM chains
  throw new Error(`Non-EVM chain verification not yet implemented: ${chainId}`);
}

/**
 * Placeholder for SAP escrow settlement detection
 * @param txSignature - Transaction signature
 * @param rpcUrl - RPC URL for the chain
 * @returns Settlement detection result
 */
export async function detectSapSettlement(txSignature: string, rpcUrl: string): Promise<boolean> {
  // Placeholder implementation - would integrate with SAP escrow bridge
  throw new Error('SAP escrow settlement detection not yet implemented');
}