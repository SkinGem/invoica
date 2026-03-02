/**
 * Tax Calculator Service
 * 
 * Calculates VAT and sales tax for EU and US jurisdictions.
 * Handles B2B reverse charge, B2C domestic VAT, and US nexus-based taxation.
 */

import { TaxJurisdiction, TaxCalculationResult, TaxRate } from '../types';
import { getJurisdiction, isEUCountry } from './location-resolver';
import { getUSTaxRate } from './us-tax-rates';

/**
 * TAX_RATES Map for EU countries
 * Contains standard VAT rates, reduced rates, and effective dates
 */
export const TAX_RATES: Map<string, TaxRate> = new Map([
  ['AT', { id: 'AT-STD', countryCode: 'AT', rate: 0.20, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['BE', { id: 'BE-STD', countryCode: 'BE', rate: 0.21, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['BG', { id: 'BG-STD', countryCode: 'BG', rate: 0.20, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['CY', { id: 'CY-STD', countryCode: 'CY', rate: 0.19, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['CZ', { id: 'CZ-STD', countryCode: 'CZ', rate: 0.21, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['DE', { id: 'DE-STD', countryCode: 'DE', rate: 0.19, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['DK', { id: 'DK-STD', countryCode: 'DK', rate: 0.25, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['EE', { id: 'EE-STD', countryCode: 'EE', rate: 0.22, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['EL', { id: 'EL-STD', countryCode: 'EL', rate: 0.24, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['ES', { id: 'ES-STD', countryCode: 'ES', rate: 0.21, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['FI', { id: 'FI-STD', countryCode: 'FI', rate: 0.24, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['FR', { id: 'FR-STD', countryCode: 'FR', rate: 0.20, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['HR', { id: 'HR-STD', countryCode: 'HR', rate: 0.25, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['HU', { id: 'HU-STD', countryCode: 'HU', rate: 0.27, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['IE', { id: 'IE-STD', countryCode: 'IE', rate: 0.23, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['IT', { id: 'IT-STD', countryCode: 'IT', rate: 0.22, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['LT', { id: 'LT-STD', countryCode: 'LT', rate: 0.21, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['LU', { id: 'LU-STD', countryCode: 'LU', rate: 0.17, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['LV', { id: 'LV-STD', countryCode: 'LV', rate: 0.21, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['MT', { id: 'MT-STD', countryCode: 'MT', rate: 0.18, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['NL', { id: 'NL-STD', countryCode: 'NL', rate: 0.21, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['PL', { id: 'PL-STD', countryCode: 'PL', rate: 0.23, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['PT', { id: 'PT-STD', countryCode: 'PT', rate: 0.23, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['RO', { id: 'RO-STD', countryCode: 'RO', rate: 0.19, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['SE', { id: 'SE-STD', countryCode: 'SE', rate: 0.25, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['SI', { id: 'SI-STD', countryCode: 'SI', rate: 0.22, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['SK', { id: 'SK-STD', countryCode: 'SK', rate: 0.20, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['XI', { id: 'XI-STD', countryCode: 'XI', rate: 0.20, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
  ['GB', { id: 'GB-STD', countryCode: 'GB', rate: 0.20, effectiveDate: new Date('2024-01-01'), appliesToDigitalServices: true }],
]);

/**
 * Minimum threshold for digital services in EU (in EUR)
 * Applies to B2C OSS scheme
 */
const B2C_EU_THRESHOLD_EUR = 10000;

/**
 * Calculates tax for a given transaction
 * @param params - Calculation parameters
 * @returns Promise resolving to tax calculation result
 */
export async function calculateTax(params: {
  amount: number;
  vatNumber?: string;
  billingCountry?: string;
  ipAddress?: string;
  customerType: 'B2B' | 'B2C';
  productType: 'digital' | 'physical' | 'service';
}): Promise<TaxCalculationResult> {
  const { amount, vatNumber, billingCountry, ipAddress, customerType, productType } = params;

  // Validate input
  if (amount < 0) {
    throw new Error('Amount cannot be negative');
  }

  if (!billingCountry && !vatNumber && !ipAddress) {
    throw new Error('At least one location identifier is required');
  }

  // Get jurisdiction
  const jurisdiction = await getJurisdiction({
    vatNumber,
    billingCountry,
    ipAddress,
  });

  // Calculate based on jurisdiction
  if (jurisdiction.isEU) {
    return calculateEUTax(amount, jurisdiction, customerType);
  } else {
    return calculateNoTax(amount, jurisdiction);
  }
}

/**
 * Calculates EU VAT tax
 * @param amount - Net amount
 * @param jurisdiction - Tax jurisdiction
 * @param customerType - B2B or B2C
 * @returns Tax calculation result
 */
function calculateEUTax(
  amount: number,
  jurisdiction: TaxJurisdiction,
  customerType: 'B2B' | 'B2C'
): TaxCalculationResult {
  // B2B with valid VAT: Reverse charge (0% - buyer accounts for VAT)
  if (customerType === 'B2B' && jurisdiction.isValidVAT) {
    return {
      netAmount: amount,
      taxAmount: 0,
      grossAmount: amount,
      taxRate: 0,
      taxType: 'REVERSE_CHARGE',
      jurisdiction: jurisdiction.countryCode,
      invoiceNote: 'Reverse charge - Art. 196 Council Directive 2006/112/EC',
      evidence: jurisdiction.evidence,
    };
  }

  // B2C or B2B without valid VAT: Apply domestic rate
  const taxRate = getEUTaxRate(jurisdiction.countryCode);
  
  if (!taxRate) {
    throw new Error(`No tax rate found for country: ${jurisdiction.countryCode}`);
  }

  const taxAmount = roundCurrency(amount * taxRate.rate);
  const grossAmount = amount + taxAmount;

  return {
    netAmount: amount,
    taxAmount,
    grossAmount,
    taxRate: taxRate.rate,
    taxType: jurisdiction.hasVAT ? 'REVERSE_CHARGE' : 'DOMESTIC',
    jurisdiction: jurisdiction.countryCode,
    taxRateId: taxRate.id,
    effectiveDate: taxRate.effectiveDate,
    evidence: jurisdiction.evidence,
  };
}

/**
 * Calculates tax for non-EU jurisdictions (US or other)
 * @param amount - Net amount
 * @param jurisdiction - Tax jurisdiction
 * @returns Tax calculation result
 */
function calculateNoTax(amount: number, jurisdiction: TaxJurisdiction): TaxCalculationResult {
  return {
    netAmount: amount,
    taxAmount: 0,
    grossAmount: amount,
    taxRate: 0,
    taxType: 'OUTSIDE_EU',
    jurisdiction: jurisdiction.countryCode,
    evidence: jurisdiction.evidence,
  };
}

/**
 * Gets the EU tax rate for a country
 * @param countryCode - Two-letter country code
 * @returns Tax rate or undefined
 */
export function getEUTaxRate(countryCode: string): TaxRate | undefined {
  return TAX_RATES.get(countryCode.toUpperCase());
}

/**
 * Gets all available EU tax rates
 * @returns Array of all tax rates
 */
export function getAllTaxRates(): TaxRate[] {
  return Array.from(TAX_RATES.values());
}

/**
 * Rounds currency to 2 decimal places
 * @param value - Value to round
 * @returns Rounded value
 */
function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export default {
  calculateTax,
  getEUTaxRate,
  getAllTaxRates,
  TAX_RATES,
};
