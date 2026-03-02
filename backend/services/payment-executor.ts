import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export interface PaymentExecution {
  settlement_id: string;
  from_address: string;
  to_address: string;
  amount: string;
  tx_hash?: string;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  error?: string;
}

const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || '0x0000000000000000000000000000000000000001';

/**
 * Executes a USDC payment from merchant wallet to treasury
 * @param settlementId - The settlement ID to validate and link payment
 * @param fromAddress - Merchant wallet address
 * @param amount - Amount in USDC (smallest unit)
 */
export async function executePayment(
  settlementId: string,
  fromAddress: string,
  amount: string
): Promise<PaymentExecution> {
  const settlement = await supabase
    .from('settlements')
    .select('id')
    .eq('id', settlementId)
    .single();

  if (!settlement.data) {
    throw new Error(`Settlement ${settlementId} not found`);
  }

  const payment: PaymentExecution = {
    settlement_id: settlementId,
    from_address: fromAddress,
    to_address: TREASURY_ADDRESS,
    amount,
    status: 'pending',
  };

  const { data } = await supabase
    .from('payments')
    .insert(payment)
    .select()
    .single();

  return data as PaymentExecution;
}

/**
 * Gets payment status for a settlement
 * @param settlementId - The settlement ID to look up
 */
export async function getPaymentStatus(settlementId: string): Promise<PaymentExecution | null> {
  const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('settlement_id', settlementId)
    .single();

  return data as PaymentExecution | null;
}
