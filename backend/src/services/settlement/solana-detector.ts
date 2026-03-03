import {
  Connection,
  PublicKey,
  TransactionResponse,
  ParsedInstruction,
  ParsedTransactionWithMeta,
} from '@solana/web3.js';
import { Logger } from '../../utils/logger';
import { AppError } from '../../errors/app-error';

/**
 * Configuration for blockchain chain connections
 */
interface ChainConfig {
  rpcUrl: string;
  chainId: string;
  chainType: 'evm' | 'solana' | 'bitcoin';
}

/**
 * Represents a matched settlement from USDC transfer
 */
interface SettlementMatch {
  fromAddress: string;
  toAddress: string;
  amount: number;
  txSignature: string;
  memo: string | null;
  timestamp: number;
}

/**
 * Custom error for Solana settlement detection failures
 */
export class SolanaSettlementError extends AppError {
  constructor(message: string, code: string = 'SOLANA_SETTLEMENT_ERROR', statusCode: number = 500) {
    super(message, code, statusCode);
    this.name = 'SolanaSettlementError';
  }
}

/**
 * SPL Token Program address
 */
const SPL_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

/**
 * USDC Mint address on Solana mainnet
 */
const USDC_MINT_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

/**
 * Memo Program address
 */
const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

/**
 * USDC decimal places (6 for USDC)
 */
const USDC_DECIMALS = 6;

/**
 * SolanaSettlementDetector
 * 
 * Detects USDC SPL token transfers on Solana mainnet by querying RPC endpoints
 * and parsing transaction data for SPL token transfers.
 */
export class SolanaSettlementDetector {
  private readonly connection: Connection;
  private readonly logger: Logger;

  /**
   * Creates a new SolanaSettlementDetector instance
   * @param chain - Chain configuration containing RPC URL
   */
  constructor(private chain: ChainConfig) {
    this.connection = new Connection(chain.rpcUrl, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    this.logger = new Logger('SolanaSettlementDetector');
  }

  /**
   * Gets recent USDC transfers for a wallet address
   * 
   * @param walletAddress - The Solana wallet address to query
   * @param limit - Maximum number of transactions to return (default: 20)
   * @returns Promise<SettlementMatch[]> Array of matched USDC transfers
   * @throws SolanaSettlementError if RPC calls fail or address is invalid
   */
  async getRecentUsdcTransfers(
    walletAddress: string,
    limit: number = 20
  ): Promise<SettlementMatch[]> {
    try {
      const walletPubkey = new PublicKey(walletAddress);
      
      this.logger.info(`Fetching recent signatures for wallet: ${walletAddress}`);

      const signatures = await this.connection.getSignaturesForAddress(
        walletPubkey,
        { limit },
        'confirmed'
      );

      this.logger.info(`Found ${signatures.length} signatures`);

      const settlements: SettlementMatch[] = [];

      for (const sigInfo of signatures) {
        try {
          const match = await this.parseTransactionForUsdc(sigInfo.signature);
          if (match) {
            settlements.push(match);
          }
        } catch (error) {
          this.logger.warn(`Failed to parse transaction ${sigInfo.signature}: ${error}`);
          continue;
        }
      }

      return settlements;
    } catch (error) {
      if (error instanceof PublicKey.InvalidBase58Error) {
        throw new SolanaSettlementError(
          `Invalid wallet address: ${walletAddress}`,
          'INVALID_WALLET_ADDRESS',
          400
        );
      }
      throw new SolanaSettlementError(
        `Failed to get recent USDC transfers: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GET_TRANSFERS_FAILED'
      );
    }
  }

  /**
   * Parses a transaction to extract USDC transfer details
   * 
   * @param txSignature - The transaction signature to parse
   * @returns Promise<SettlementMatch | null> Settlement match or null if not a USDC transfer
   */
  private async parseTransactionForUsdc(txSignature: string): Promise<SettlementMatch | null> {
    const tx = await this.connection.getParsedTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });

    if (!tx) {
      return null;
    }

    const meta = tx.meta;
    if (!meta) {
      return null;
    }

    // Find SPL token transfer instructions
    const parsedInstructions = tx.transaction.message.instructions as ParsedInstruction[];
    
    let fromAddress: string | null = null;
    let toAddress: string | null = null;
    let amount = 0;
    let isUsdcTransfer = false;

    for (const instruction of parsedInstructions) {
      if (instruction.parsed && typeof instruction.parsed === 'object') {
        const parsed = instruction.parsed as Record<string, unknown>;
        
        // Check if this is a transfer instruction
        if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
          const programId = instruction.programId?.toString();
          
          if (programId === SPL_TOKEN_PROGRAM_ID) {
            const info = parsed.info as Record<string, unknown>;
            
            // Check if it's USDC mint
            const mint = info.mint as string | undefined;
            if (mint === USDC_MINT_ADDRESS) {
              isUsdcTransfer = true;
              
              // Handle both transfer and transferChecked formats
              if (parsed.type === 'transferChecked') {
                const tokenAmount = info.tokenAmount as Record<string, number>;
                amount = tokenAmount.amount ? Number(tokenAmount.amount) / Math.pow(10, tokenAmount.decimals || USDC_DECIMALS) : 0;
              } else {
                amount = info.amount ? Number(info.amount) / Math.pow(10, USDC_DECIMALS) : 0;
              }
              
              fromAddress = info.source as string;
              toAddress = info.destination as string;
            }
          }
        }
      }
    }

    if (!isUsdcTransfer) {
      return null;
    }

    // Extract memo if present
    const memo = await this.extractMemo(txSignature);

    return {
      fromAddress: fromAddress!,
      toAddress: toAddress!,
      amount,
      txSignature,
      memo,
      timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
    };
  }

  /**
   * Verifies if a transaction matches expected transfer details
   * 
   * @param txSignature - The transaction signature to verify
   * @param expectedRecipient - Expected recipient wallet address
   * @param expectedAmountUsdc - Expected minimum amount in USDC
   * @returns Promise<boolean> True if transfer matches expectations
   * @throws SolanaSettlementError if transaction lookup fails
   */
  async verifyTransfer(
    txSignature: string,
    expectedRecipient: string,
    expectedAmountUsdc: number
  ): Promise<boolean> {
    try {
      const tx = await this.connection.getParsedTransaction(txSignature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });

      if (!tx) {
        this.logger.warn(`Transaction not found: ${txSignature}`);
        return false;
      }

      const meta = tx.meta;
      if (!meta) {
        return false;
      }

      const parsedInstructions = tx.transaction.message.instructions as ParsedInstruction[];
      
      let isUsdcTransfer = false;
      let recipientMatches = false;
      let amountMeetsMinimum = false;

      for (const instruction of parsedInstructions) {
        if (instruction.parsed && typeof instruction.parsed === 'object') {
          const parsed = instruction.parsed as Record<string, unknown>;
          
          if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
            const programId = instruction.programId?.toString();
            
            if (programId === SPL_TOKEN_PROGRAM_ID) {
              const info = parsed.info as Record<string, unknown>;
              const mint = info.mint as string | undefined;
              
              if (mint === USDC_MINT_ADDRESS) {
                isUsdcTransfer = true;
                
                // Check recipient
                const destination = info.destination as string;
                recipientMatches = destination === expectedRecipient;
                
                // Check amount
                let transferAmount = 0;
                if (parsed.type === 'transferChecked') {
                  const tokenAmount = info.tokenAmount as Record<string, number>;
                  transferAmount = tokenAmount.amount ? Number(tokenAmount.amount) / Math.pow(10, tokenAmount.decimals || USDC_DECIMALS) : 0;
                } else {
                  transferAmount = info.amount ? Number(info.amount) / Math.pow(10, USDC_DECIMALS) : 0;
                }
                
                amountMeetsMinimum = transferAmount >= expectedAmountUsdc;
                
                this.logger.info(
                  `Transfer verified: isUsdc=${isUsdcTransfer}, recipientMatch=${recipientMatches}, amount=${transferAmount}, minRequired=${expectedAmountUsdc}`
                );
                
                break;
              }
            }
          }
        }
      }

      return isUsdcTransfer && recipientMatches && amountMeetsMinimum;
    } catch (error) {
      if (error instanceof PublicKey.InvalidBase58Error) {
        throw new SolanaSettlementError(
          `Invalid transaction signature: ${txSignature}`,
          'INVALID_SIGNATURE',
          400
        );
      }
      throw new SolanaSettlementError(
        `Failed to verify transfer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'VERIFY_TRANSFER_FAILED'
      );
    }
  }

  /**
   * Extracts memo from a transaction if present
   * 
   * @param txSignature - The transaction signature to extract memo from
   * @returns Promise<string | null> Memo string or null if not found
   */
  async extractMemo(txSignature: string): Promise<string | null> {
    try {
      const tx = await this.connection.getParsedTransaction(txSignature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });

      if (!tx) {
        return null;
      }

      const parsedInstructions = tx.transaction.message.instructions as ParsedInstruction[];

      for (const instruction of parsedInstructions) {
        const programId = instruction.programId?.toString();
        
        if (programId === MEMO_PROGRAM_ID) {
          if (instruction.parsed && typeof instruction.parsed === 'object') {
            const parsed = instruction.parsed as Record<string, unknown>;
            if (parsed.type === 'Memo' && parsed.memo) {
              return parsed.memo as string;
            }
          } else if (typeof instruction.data === 'string') {
            // Handle raw memo data
            try {
              return Buffer.from(instruction.data, 'base64').toString('utf-8');
            } catch {
              return instruction.data;
            }
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.warn(`Failed to extract memo from ${txSignature}: ${error}`);
      return null;
    }
  }

  /**
   * Gets the connection instance for direct RPC access
   * @returns Connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }
}