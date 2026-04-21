/**
 * UK VAT Guardrail Test Suite
 *
 * The current tax engine only supports US sales tax and EU VAT.
 * These tests ensure UK traffic is not incorrectly treated as EU VAT traffic.
 */

import {
  calculateTax,
  calculateEUVAT,
} from '../calculator';
import {
  getJurisdiction,
  isEUCountry,
} from '../location-resolver';
import { TaxJurisdiction } from '../types';

describe('UK VAT - Country Code Recognition', () => {
  describe('isEUCountry', () => {
    it('should return false for GB (Great Britain)', () => {
      expect(isEUCountry('GB')).toBe(false);
      expect(isEUCountry('gb')).toBe(false);
    });

    it('should return false for non-EU countries', () => {
      expect(isEUCountry('US')).toBe(false);
      expect(isEUCountry('CA')).toBe(false);
      expect(isEUCountry('AU')).toBe(false);
    });

    it('should return false for empty input', () => {
      expect(isEUCountry('')).toBe(false);
    });
  });
});

describe('UK VAT - Tax Rate Configuration', () => {
  describe('calculateEUVAT', () => {
    it('should return 0 for GB', () => {
      const rate = calculateEUVAT({ countryCode: 'GB' });
      expect(rate).toBe(0);
    });

    it('should return 0 for UK (alternative code)', () => {
      const rate = calculateEUVAT({ countryCode: 'UK' });
      expect(rate).toBe(0);
    });

    it('should return 0 for non-EU countries', () => {
      expect(calculateEUVAT({ countryCode: 'US' })).toBe(0);
      expect(calculateEUVAT({ countryCode: 'CA' })).toBe(0);
    });

    it('should be case insensitive', () => {
      expect(calculateEUVAT({ countryCode: 'gb' })).toBe(0);
      expect(calculateEUVAT({ countryCode: 'Gb' })).toBe(0);
    });
  });
});

describe('UK VAT - B2C Calculations', () => {
  it('should not charge EU VAT for GB customer', () => {
    const result = calculateTax({
      amount: 100,
      buyerLocation: { countryCode: 'GB' },
    });

    expect(result.jurisdiction).toBe(TaxJurisdiction.NONE);
    expect(result.taxRate).toBe(0);
    expect(result.taxAmount).toBe(0);
  });

  it('should keep tax at 0 for various amounts', () => {
    const testCases = [
      { amount: 50, expectedTax: 0 },
      { amount: 250, expectedTax: 0 },
      { amount: 1000, expectedTax: 0 },
    ];

    for (const { amount, expectedTax } of testCases) {
      const result = calculateTax({
        amount,
        buyerLocation: { countryCode: 'GB' },
      });

      expect(result.taxAmount).toBeCloseTo(expectedTax, 0);
    }
  });
});

describe('UK VAT - B2B Calculations (VAT number triggers reverse charge)', () => {
  it('should remain unsupported even if a UK VAT number is provided', () => {
    const result = calculateTax({
      amount: 100,
      buyerLocation: { countryCode: 'GB', vatNumber: 'GB123456789' },
    });

    expect(result.jurisdiction).toBe(TaxJurisdiction.NONE);
    expect(result.taxRate).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.invoiceNote).toContain('No applicable tax jurisdiction');
  });

  it('should not apply EU VAT for GB customer without VAT number', () => {
    const result = calculateTax({
      amount: 100,
      buyerLocation: { countryCode: 'GB' },
    });

    expect(result.taxRate).toBe(0);
    expect(result.taxAmount).toBe(0);
  });
});

describe('UK VAT - Jurisdiction Resolution', () => {
  it('should resolve NONE for GB country code', () => {
    const jurisdiction = getJurisdiction({ countryCode: 'GB' });
    expect(jurisdiction).toBe(TaxJurisdiction.NONE);
  });

  it('should return NONE for non-EU/non-US countries', () => {
    const jurisdiction = getJurisdiction({ countryCode: 'AU' });
    expect(jurisdiction).toBe(TaxJurisdiction.NONE);
  });
});

describe('UK VAT - Edge Cases', () => {
  it('should handle invalid amount gracefully (negative)', () => {
    const result = calculateTax({
      amount: -100,
      buyerLocation: { countryCode: 'GB' },
    });
    // Negative amounts return 0 tax
    expect(result.taxAmount).toBe(0);
  });

  it('should handle zero amount gracefully', () => {
    const result = calculateTax({
      amount: 0,
      buyerLocation: { countryCode: 'GB' },
    });
    expect(result.taxAmount).toBe(0);
  });
});

describe('UK VAT - Comparison with Other EU Countries', () => {
  it('should no longer match EU VAT countries', () => {
    const gbRate = calculateEUVAT({ countryCode: 'GB' });
    const atRate = calculateEUVAT({ countryCode: 'AT' });
    const bgRate = calculateEUVAT({ countryCode: 'BG' });

    expect(gbRate).toBe(0);
    expect(atRate).toBe(0.20);
    expect(bgRate).toBe(0.20);
  });

  it('should remain below high-VAT Nordic countries', () => {
    const gbRate = calculateEUVAT({ countryCode: 'GB' });
    const seRate = calculateEUVAT({ countryCode: 'SE' });
    const fiRate = calculateEUVAT({ countryCode: 'FI' });

    // Sweden (25%) and Finland (25.5%) have higher rates
    expect(gbRate).toBeLessThan(seRate);
    expect(gbRate).toBeLessThan(fiRate);
  });

  it('should remain below low-VAT EU countries because UK is unsupported here', () => {
    const gbRate = calculateEUVAT({ countryCode: 'GB' });
    const luRate = calculateEUVAT({ countryCode: 'LU' });
    const mtRate = calculateEUVAT({ countryCode: 'MT' });

    expect(gbRate).toBeLessThan(luRate);
    expect(gbRate).toBeLessThan(mtRate);
  });
});
