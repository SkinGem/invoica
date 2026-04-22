/**
 * UK VAT Handler
 *
 * Calculates UK VAT obligations under HMRC rules post-Brexit.
 * The UK left the EU VAT area on 1 January 2021 and operates its own
 * independent VAT regime administered by HMRC.
 *
 * Standard rate: 20%
 * Reduced rate:   5%  (domestic fuel, children's car seats, etc.)
 * Zero rate:      0%  (most food, children's clothing, books, etc.)
 *
 * B2B reverse charge: UK-registered businesses supply their VAT number;
 * the buyer self-accounts for VAT, so the invoice is raised at 0%.
 *
 * References:
 *   https://www.gov.uk/vat-rates
 *   https://www.gov.uk/guidance/vat-reverse-charge-for-business-to-business-transactions
 */

import { TaxJurisdiction } from './types';
import { LocationInput } from './location-resolver';

/**
 * UK VAT rates
 */
export const UK_VAT_RATES = {
  STANDARD: 0.20,
  REDUCED: 0.05,
  ZERO: 0.00,
} as const;

export type UKVATRateType = keyof typeof UK_VAT_RATES;

export interface UKVATInput extends LocationInput {
  /**
   * Optional HMRC VAT registration number (format: GB + 9 digits).
   * When present, the transaction is treated as B2B and the reverse
   * charge mechanism applies — no VAT is charged on the invoice.
   */
  vatNumber?: string;
  /**
   * The VAT rate band to apply. Defaults to 'STANDARD' (20%).
   */
  rateType?: UKVATRateType;
}

export interface UKVATResult {
  taxRate: number;
  taxAmount: number;
  jurisdiction: TaxJurisdiction.UK;
  rateType: UKVATRateType;
  isReverseCharge: boolean;
  invoiceNote: string;
}

/**
 * Returns the UK VAT rate for the given rate band.
 *
 * @param rateType - 'STANDARD' | 'REDUCED' | 'ZERO'. Defaults to 'STANDARD'.
 * @returns VAT rate as a decimal (e.g. 0.20 for 20%)
 *
 * @example
 * calculateUKVAT({ countryCode: 'GB' })
 * // Returns: 0.20
 *
 * @example
 * calculateUKVAT({ countryCode: 'GB', rateType: 'REDUCED' })
 * // Returns: 0.05
 */
export function calculateUKVAT(input: UKVATInput): number {
  const { countryCode, rateType = 'STANDARD' } = input;

  // Validate country — only GB and the legacy UK alias are accepted
  const normalizedCountry = (countryCode ?? '').toUpperCase();
  if (normalizedCountry !== 'GB' && normalizedCountry !== 'UK') {
    return 0;
  }

  return UK_VAT_RATES[rateType];
}

/**
 * Full UK VAT calculation for a given amount.
 *
 * Handles the B2B reverse-charge case (vatNumber present) and B2C
 * (consumer buyer, no VAT number) automatically.
 *
 * @param amount    - Transaction amount in the smallest currency unit (e.g. pence)
 * @param input     - UK VAT input containing country code, optional VAT number and rate type
 * @returns         - Full UKVATResult with rate, amount, jurisdiction and invoice note
 *
 * @example
 * // B2C – standard-rated supply to a UK consumer
 * calculateUKVATResult(10000, { countryCode: 'GB' })
 * // { taxRate: 0.20, taxAmount: 2000, isReverseCharge: false, ... }
 *
 * @example
 * // B2B – UK-registered business supplies their VAT number
 * calculateUKVATResult(10000, { countryCode: 'GB', vatNumber: 'GB123456789' })
 * // { taxRate: 0, taxAmount: 0, isReverseCharge: true, ... }
 */
export function calculateUKVATResult(amount: number, input: UKVATInput): UKVATResult {
  const isReverseCharge = Boolean(input.vatNumber && input.vatNumber.trim().length > 0);

  if (isReverseCharge) {
    return {
      taxRate: 0,
      taxAmount: 0,
      jurisdiction: TaxJurisdiction.UK,
      rateType: input.rateType ?? 'STANDARD',
      isReverseCharge: true,
      invoiceNote:
        'UK VAT reverse charge — customer to account for VAT to HMRC (VAT Act 1994 s.8)',
    };
  }

  const rateType: UKVATRateType = input.rateType ?? 'STANDARD';
  const taxRate = UK_VAT_RATES[rateType];
  const taxAmount = Math.round(amount * taxRate);

  return {
    taxRate,
    taxAmount,
    jurisdiction: TaxJurisdiction.UK,
    rateType,
    isReverseCharge: false,
    invoiceNote: `UK VAT applied at ${(taxRate * 100).toFixed(0)}% (HMRC standard rate)`,
  };
}

export default {
  calculateUKVAT,
  calculateUKVATResult,
  UK_VAT_RATES,
};
