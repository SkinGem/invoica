import { Connection, PublicKey, TransactionSignature } from '@solana/web3.js';
import { supabase } from '../lib/supabase';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const SETTLEMENT_CONFIRM_TIMEOUT_MS = 60000;
const SETTLEMENT_CONFIRM_POLL_INTERVAL_MS = 3000;

export interface Settlement {
  merchant_id: string;
  period_start: string;
  period_end: string;
  total_invoices: number;
  total_amount: number;
  currency: string;
  usdc_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chain?: string;
  token?: string;
  tx_signature?: string;
  confirmed_at?: string;
}

interface InvoiceRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

interface SettlementRow extends Settlement {
  id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Connection pool for Solana RPC connections to avoid creating new connections frequently
 */
let solanaConnection: Connection | null = null;

function getSolanaConnection(): Connection {
  if (!solanaConnection) {
    solanaConnection = new Connection(SOLANA_RPC_URL, 'confirmed');
  }
  return solanaConnection;
}

/**
 * Confirms a Solana transaction using RPC poll-based confirmation.
 * Throws error if confirmation fails or times out.
 */
export async function confirmSolanaTransaction(
  signature: TransactionSignature,
  timeoutMs: number = SETTLEMENT_CONFIRM_TIMEOUT_MS
): Promise<boolean> {
  const connection = getSolanaConnection();
  const startTime = Date.now();
  let lastError: Error | null = null;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const status = await connection.getSignatureStatus(signature);

      if (status.value) {
        if (status.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
        }

        if (status.value.confirmed || status.value.status === 'confirmed') {
          return true;
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    await new Promise(resolve => setTimeout(resolve, SETTLEMENT_CONFIRM_POLL_INTERVAL_MS));
  }

  throw new Error(
    `Transaction confirmation timeout after ${timeoutMs}ms. Signature: ${signature}. Last error: ${lastError?.message}`
  );
}

/**
 * Records a settled payment to the settlements table with Solana USDC details.
 * Stores chain=Solana and token=USDC-SPL as per requirements.
 */
export async function recordSettlement(
  merchantId: string,
  periodStart: Date,
  periodEnd: Date,
  totalInvoices: number,
  totalAmount: number,
  currency: string,
  usdcAmount: number,
  txSignature?: string
): Promise<string> {
  const now = new Date().toISOString();
  
  const settlementRecord = {
    merchant_id: merchantId,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    total_invoices: totalInvoices,
    total_amount: totalAmount,
    currency,
    usdc_amount: usdcAmount,
    status: txSignature ? 'processing' : 'completed',
    chain: 'Solana',
    token: 'USDC-SPL',
    tx_signature: txSignature ?? null,
    confirmed_at: txSignature ? null : now,
    created_at: now,
    updated_at: now
  };

  const { data, error } = await supabase
    .from<SettlementRow>('settlements')
    .insert(settlementRecord)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to record settlement: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error('Settlement record created but no ID returned');
  }

  return data.id;
}

/**
 * Updates settlement status after confirmation.
 */
export async function updateSettlementStatus(
  settlementId: string,
  status: Settlement['status'],
  txSignature?: string
): Promise<void> {
  const updateData: Partial<SettlementRow> = {
    status,
    updated_at: new Date().toISOString()
  };

  if (txSignature) {
    updateData.tx_signature = txSignature;
  }

  if (status === 'completed') {
    updateData.confirmed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from<SettlementRow>('settlements')
    .update(updateData)
    .eq('id', settlementId);

  if (error) {
    throw new Error(`Failed to update settlement status: ${error.message}`);
  }
}

/**
 * Processes a complete settlement flow: generates report, records it,
 * confirms the blockchain transaction, and updates status.
 */
export async function processSettlement(
  merchantId: string,
  startDate: Date,
  endDate: Date,
  txSignature?: TransactionSignature
): Promise<Settlement> {
  const settlement = await generateSettlementReport(merchantId, startDate, endDate);

  if (settlement.total_amount <= 0) {
    return settlement;
  }

  const settlementId = await recordSettlement(
    merchantId,
    startDate,
    endDate,
    settlement.total_invoices,
    settlement.total_amount,
    settlement.currency,
    settlement.usdc_amount,
    txSignature
  );

  if (txSignature) {
    try {
      await confirmSolanaTransaction(txSignature);
      await updateSettlementStatus(settlementId, 'completed', txSignature);
      settlement.status = 'completed';
      settlement.tx_signature = txSignature;
      settlement.confirmed_at = new Date().toISOString();
    } catch (error) {
      await updateSettlementStatus(settlementId, 'failed', txSignature);
      settlement.status = 'failed';
      throw error;
    }
  }

  return settlement;
}

/**
 * Generates a settlement report for a merchant within a date range.
 * Queries paid invoices, aggregates totals, and converts to USDC.
 */
export async function generateSettlementReport(
  merchantId: string,
  startDate: Date,
  endDate: Date
): Promise<Settlement> {
  const { data: invoices, error } = await supabase
    .from<InvoiceRow>('invoices')
    .select('id, amount, currency, status, created_at')
    .eq('merchant_id', merchantId)
    .eq('status', 'paid')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (error) throw new Error(`Failed to query invoices: ${error.message}`);

  const totalInvoices = invoices?.length ?? 0;
  const totalAmount = invoices?.reduce((sum, inv) => sum + (inv.amount ?? 0), 0) ?? 0;
  const currency = invoices?.[0]?.currency ?? 'USD';
  const usdcAmount = totalAmount;

  const settlement: Settlement = {
    merchant_id: merchantId,
    period_start: startDate.toISOString(),
    period_end: endDate.toISOString(),
    total_invoices: totalInvoices,
    total_amount: totalAmount,
    currency,
    usdc_amount: usdcAmount,
    status: totalAmount > 0 ? 'pending' : 'completed',
    chain: 'Solana',
    token: 'USDC-SPL'
  };

  return settlement;
}

/**
 * Fetches recent settlement history for a merchant.
 */
export async function getSettlementHistory(
  merchantId: string,
  limit: number = 10
): Promise<Settlement[]> {
  const { data: settlements, error } = await supabase
    .from<Settlement>('settlements')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('period_end', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch settlements: ${error.message}`);

  return settlements ?? [];
}

/**
 * Fetches a specific settlement by ID.
 */
export async function getSettlementById(
  settlementId: string
): Promise<Settlement | null> {
  const { data: settlement, error } = await supabase
    .from<SettlementRow>('settlements')
    .select('*')
    .eq('id', settlementId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch settlement: ${error.message}`);
  }

  return settlement;
}