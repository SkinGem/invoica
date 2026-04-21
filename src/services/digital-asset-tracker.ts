// 1099-DA Digital Asset Tracking — TICKET-017-AGENTTAX-05
// IRS Form 1099-DA is used for 2025-and-later digital asset broker transactions,
// with the first filing cycle landing in calendar year 2026.
// USDC payments via x402 and direct Base transfers are digital assets.
// This module tracks the fields needed for 1099-DA compliance.

export interface DigitalAssetTransaction {
  transaction_id: string;
  invoice_id: string;
  asset: 'USDC';
  network: 'Base' | 'Solana';
  gross_proceeds_usd: number;
  transaction_hash: string;
  from_address: string;
  to_address: string;
  transaction_date: string;
  counterparty_id: string;
  is_digital_asset: true;
}

/**
 * Check if a transaction qualifies as a digital asset transaction for 1099-DA.
 * USDC on Base mainnet and Solana mainnet both qualify.
 */
export function isDigitalAsset(paymentMethod: string): boolean {
  const method = paymentMethod?.toLowerCase() ?? '';
  return method.includes('usdc') || method.includes('base') ||
         method.includes('solana') || method.includes('x402') ||
         method.includes('crypto') || method.includes('blockchain');
}

/**
 * Build a 1099-DA record from an Invoica payment.
 * Call this whenever a digital asset payment is confirmed.
 */
export function buildDigitalAssetRecord(
  invoiceId: string,
  amount: number,
  txHash: string,
  fromAddress: string,
  toAddress: string,
  network: 'Base' | 'Solana' = 'Base'
): DigitalAssetTransaction {
  return {
    transaction_id: `da-${Date.now()}-${txHash.slice(-8)}`,
    invoice_id:      invoiceId,
    asset:           'USDC',
    network,
    gross_proceeds_usd: amount,
    transaction_hash:   txHash,
    from_address:       fromAddress,
    to_address:         toAddress,
    transaction_date:   new Date().toISOString(),
    counterparty_id:    fromAddress,
    is_digital_asset:   true,
  };
}

// Note: Full 1099-DA filing/transmission integration is still deferred.
// For now: persist/report-ready records for auditor review and downstream 2025+ tax-year filing workflows.
