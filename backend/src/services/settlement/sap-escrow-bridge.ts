/**
 * SAP Escrow Bridge - Detects SAP x402 escrow settlements on Solana
 * 
 * This module detects when another agent pays Invoica via SAP's native x402 escrow
 * flow (sap.x402.settleCall) and returns the settlement details for invoice creation.
 * 
 * @module services/settlement/sap-escrow-bridge
 */

import crypto from 'crypto';

// =============================================================================
// CONSTANTS
// =============================================================================

/** SAP Program ID on Solana */
export const SAP_PROGRAM_ID = 'SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ';

/** Invoica's SAP agent wallet - the destination for escrow settlements */
export const INVOICA_AGENT_WALLET = '26z3UHjGbF2LKbgS2r34BSzBH3DBBoLofF1c2EvaEwWQ';

/** USDC Mint on Solana mainnet */
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

/**
 * Precomputed discriminator for 'settle_call' instruction
 * Computed as: crypto.createHash('sha256').update('global:settle_call').digest().slice(0, 8)
 * 
 * This is the Anchor-style discriminator that SAP program uses to identify
 * the settleCall instruction in transactions.
 */
export const SAP_SETTLE_DISCRIMINATOR = Buffer.from([
  0x0e, 0x32, 0x7a, 0xe5, 0x5d, 0xc5, 0x6d, 0x78
]);

// =============================================================================
// TYPES
// =============================================================================

/**
 * Result of detecting a SAP escrow settlement
 */
export interface SapEscrowMatch {
  txSignature: string;
  escrowPda: string;
  depositor: string;
  agentPda: string;
  amount: string;
  timestamp: number;
}

// =============================================================================
// INPUT VALIDATION
// =============================================================================

/**
 * Validates the transaction signature format
 * Solana base58 signatures are typically 88-128 characters
 */
function isValidTxSignature(signature: string): boolean {
  if (!signature || typeof signature !== 'string') {
    return false;
  }
  // Basic length check for base58 encoded Solana signatures
  return signature.length >= 64 && signature.length <= 132;
}

/**
 * Validates the RPC URL format
 */
function isValidRpcUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// =============================================================================
// CORE DETECTION LOGIC
// =============================================================================

/**
 * Fetches a transaction from Solana via JSON-RPC
 */
async function fetchTransaction(txSignature: string, rpcUrl: string): Promise<unknown> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTransaction',
      params: [
        txSignature,
        {
          encoding: 'jsonParsed',
          maxSupportedTransactionVersion: 0,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC request failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json() as { error?: { message: string }; result: unknown };
  
  if (result.error) {
    throw new Error(`RPC error: ${result.error.message}`);
  }

  return result.result;
}

/**
 * Checks if instruction data starts with the settle_call discriminator
 */
function matchesSettleCallDiscriminator(data: string): boolean {
  if (!data || typeof data !== 'string') {
    return false;
  }
  
  // Convert hex string to buffer for comparison
  const instructionData = Buffer.from(data, 'base64');
  
  if (instructionData.length < 8) {
    return false;
  }
  
  return instructionData.slice(0, 8).equals(SAP_SETTLE_DISCRIMINATOR);
}

/**
 * Attempts to detect settlement using discriminator-based approach
 * This is the preferred method as it specifically identifies settleCall instructions
 */
function detectViaDiscriminator(
  txData: Record<string, unknown>,
  txSignature: string
): SapEscrowMatch | null {
  const meta = txData.meta as Record<string, unknown> | undefined;
  const transaction = txData.transaction as Record<string, unknown> | undefined;
  
  if (!meta || !transaction) {
    return null;
  }

  const message = transaction.message as Record<string, unknown> | undefined;
  if (!message) {
    return null;
  }

  const instructions = message.instructions as Array<Record<string, unknown>>;
  if (!Array.isArray(instructions)) {
    return null;
  }

  // Look for instruction targeting SAP program with settle_call discriminator
  for (const instruction of instructions) {
    const programId = instruction.programId as string;
    const data = instruction.data as string | undefined;
    
    if (programId === SAP_PROGRAM_ID && data && matchesSettleCallDiscriminator(data)) {
      // Found a settleCall instruction - extract accounts
      const accounts = instruction.accounts as string[] | undefined;
      
      if (!accounts || accounts.length < 3) {
        // settleCall typically has: [escrow, depositor, agent, ...]
        continue;
      }

      const [escrowPda, depositor, agentPda] = accounts;
      
      // Extract amount from token balance changes
      const preTokenBalances = (meta.preTokenBalances ?? []) as Array<{ mint: string; owner: string; uiTokenAmount: string }>;
      const postTokenBalances = (meta.postTokenBalances ?? []) as Array<{ mint: string; owner: string; uiTokenAmount: string }>;
      
      // Find USDC transfer to agent wallet
      let amount = '0';
      
      for (const post of postTokenBalances) {
        if (post.mint === USDC_MINT && post.owner === agentPda) {
          const pre = preTokenBalances.find(
            (b) => b.mint === USDC_MINT && b.owner === post.owner
          );
          const preAmount = pre ? parseFloat(pre.uiTokenAmount || '0') : 0;
          const postAmount = parseFloat(post.uiTokenAmount || '0');
          const delta = postAmount - preAmount;
          
          if (delta > 0) {
            amount = delta.toString();
            break;
          }
        }
      }

      // Use blockTime for timestamp, fallback to current time
      const timestamp = typeof meta.blockTime === 'number' 
        ? meta.blockTime 
        : Math.floor(Date.now() / 1000);

      return {
        txSignature,
        escrowPda,
        depositor,
        agentPda,
        amount,
        timestamp,
      };
    }
  }

  return null;
}

// M1-MONEY-03: detectViaFallback removed per plan §2.3.
// The heuristic "any SAP tx + USDC transfer to agent wallet" was too loose —
// it could match transactions that aren't actually settlement calls and
// potentially attribute external USDC transfers as settlements against the
// wrong invoice. Discriminator-based detection is now the only path; if the
// discriminator doesn't match, we return null and log, no silent fallback.

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Detects SAP escrow settlement for a given transaction signature.
 * 
 * This function looks for on-chain transactions where another agent has paid
 * Invoica via SAP's native x402 escrow flow (sap.x402.settleCall). When found,
 * it returns the settlement details needed to create and settle an invoice.
 * 
 * @param txSignature - The base58-encoded transaction signature to analyze
 * @param rpcUrl - The Solana RPC endpoint URL to query
 * @returns SapEscrowMatch if settlement detected, null otherwise
 * 
 * @example
 * ```typescript
 * const match = await detectSapEscrowSettlement(
 *   '5xKLqGdoX9vXj7nW...',
 *   'https://api.mainnet-beta.solana.com'
 * );
 * 
 * if (match) {
 *   console.log(`Received ${match.amount} USDC from ${match.depositor}`);
 *   // Create and settle invoice...
 * }
 * ```
 */
export async function detectSapEscrowSettlement(
  txSignature: string,
  rpcUrl: string
): Promise<SapEscrowMatch | null> {
  // Input validation
  if (!isValidTxSignature(txSignature)) {
    console.error('[sap-escrow] Invalid transaction signature format');
    return null;
  }

  if (!isValidRpcUrl(rpcUrl)) {
    console.error('[sap-escrow] Invalid RPC URL format');
    return null;
  }

  try {
    // Fetch transaction data
    const txData = await fetchTransaction(txSignature, rpcUrl);
    
    if (!txData) {
      console.log(`[sap-escrow] txSig=${txSignature} not found`);
      return null;
    }

    const tx = txData as Record<string, unknown>;

    // Check if transaction was successful
    const meta = tx.meta as Record<string, unknown> | undefined;
    if (!meta || (meta.err !== null && meta.err !== undefined)) {
      console.log(`[sap-escrow] txSig=${txSignature} failed or had error`);
      return null;
    }

    // Discriminator-based detection is the only path (M1-MONEY-03).
    // No heuristic fallback — if this fails to match, the tx is not a settleCall.
    const discriminatorMatch = detectViaDiscriminator(tx, txSignature);

    if (discriminatorMatch) {
      console.log(
        `[sap-escrow] txSig=${txSignature} depositor=${discriminatorMatch.depositor} amount=${discriminatorMatch.amount} USDC ` +
        `(discriminator match)`
      );
      return discriminatorMatch;
    }

    // No SAP escrow settlement found (discriminator did not match)
    console.log(`[sap-escrow] txSig=${txSignature} no SAP escrow settlement detected (discriminator miss)`);
    return null;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[sap-escrow] txSig=${txSignature} error: ${errorMessage}`);
    // Return null on error to allow pipeline to continue
    return null;
  }
}