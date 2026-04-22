/**
 * UK VAT Handler Test Suite
 *
 * Tests the dedicated UK VAT handler (uk-vat.ts) introduced to preserve HMRC
 * compliance after GB was removed from the EU VAT rate table in enh/audits.
 * UK customers owe 20% VAT — these tests assert the engine now charges that
 * correctly instead of regressing to 0%.
 *
 * Follow-up: https://github.com/SkinGem/invoica/blob/main/docs/engineering/uk-vat-followup.md
 */

import {
  calculateTax,
  calculateEUVAT,
} from '../calculator';
import {
  calculateUKVAT,
  calculateUKVATResult,
  UK_VAT_RATES,
} from '../uk-vat';
import {
  getJurisdiction,
  isEUCountry,
  isUKCountry,
} from '../location-resolver';
import { TaxJurisdiction } from '../types';

// ---------------------------------------------------------------------------
// Country-code recognition
// ---------------------------------------------------------------------------

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

  describe('isUKCountry', () => {
    it('should return true for GB', () => {
      expect(isUKCountry('GB')).toBe(true);
      expect(isUKCountry('gb')).toBe(true);
    });

    it('should return true for UK alias', () => {
      expect(isUKCountry('UK')).toBe(true);
      expect(isUKCountry('uk')).toBe(true);
    });

    it('should return false for non-UK countries', () => {
      expect(isUKCountry('DE')).toBe(false);
      expect(isUKCountry('US')).toBe(false);
      expect(isUKCountry('IE')).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// calculateUKVAT — rate lookup
// ---------------------------------------------------------------------------

describe('UK VAT - Tax Rate Configuration (calculateUKVAT)', () => {
  it('should return 0.20 for GB (standard rate)', () => {
    expect(calculateUKVAT({ countryCode: 'GB' })).toBe(0.20);
  });

  it('should return 0.20 for UK alias (standard rate)', () => {
    expect(calculateUKVAT({ countryCode: 'UK' })).toBe(0.20);
  });

  it('should be case insensitive', () => {
    expect(calculateUKVAT({ countryCode: 'gb' })).toBe(0.20);
    expect(calculateUKVAT({ countryCode: 'Gb' })).toBe(0.20);
  });

  it('should return 0.05 for the reduced rate band', () => {
    expect(calculateUKVAT({ countryCode: 'GB', rateType: 'REDUCED' })).toBe(0.05);
  });

  it('should return 0.00 for the zero rate band', () => {
    expect(calculateUKVAT({ countryCode: 'GB', rateType: 'ZERO' })).toBe(0.00);
  });

  it('should return 0 for non-UK country codes', () => {
    expect(calculateUKVAT({ countryCode: 'US' })).toBe(0);
    expect(calculateUKVAT({ countryCode: 'DE' })).toBe(0);
    expect(calculateUKVAT({ countryCode: 'CA' })).toBe(0);
  });

  it('UK_VAT_RATES constant should expose 20% standard rate', () => {
    expect(UK_VAT_RATES.STANDARD).toBe(0.20);
  });
});

// ---------------------------------------------------------------------------
// EU VAT must NOT apply to GB (regression guard from enh/audits)
// ---------------------------------------------------------------------------

describe('UK VAT - EU VAT remains 0 for GB (regression guard)', () => {
  it('calculateEUVAT should return 0 for GB — EU table excludes UK', () => {
    expect(calculateEUVAT({ countryCode: 'GB' })).toBe(0);
    expect(calculateEUVAT({ countryCode: 'UK' })).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Jurisdiction resolution
// ---------------------------------------------------------------------------

describe('UK VAT - Jurisdiction Resolution', () => {
  it('should resolve TaxJurisdiction.UK for GB country code', () => {
    const jurisdiction = getJurisdiction({ countryCode: 'GB' });
    expect(jurisdiction).toBe(TaxJurisdiction.UK);
  });

  it('should resolve TaxJurisdiction.UK for UK alias', () => {
    expect(getJurisdiction({ countryCode: 'UK' })).toBe(TaxJurisdiction.UK);
  });

  it('should NOT resolve EU for GB', () => {
    expect(getJurisdiction({ countryCode: 'GB' })).not.toBe(TaxJurisdiction.EU);
  });

  it('should return NONE for other non-EU/non-US/non-UK countries', () => {
    const jurisdiction = getJurisdiction({ countryCode: 'AU' });
    expect(jurisdiction).toBe(TaxJurisdiction.NONE);
  });
});

// ---------------------------------------------------------------------------
// B2C calculations via calculateTax (main entry-point)
// ---------------------------------------------------------------------------

describe('UK VAT - B2C Calculations', () => {
  it('should charge 20% UK VAT for GB customer', () => {
    const result = calculateTax({
      amount: 100,
      buyerLocation: { countryCode: 'GB' },
    });

    expect(result.jurisdiction).toBe(TaxJurisdiction.UK);
    expect(result.taxRate).toBe(0.20);
    expect(result.taxAmount).toBe(20);
  });

  it('should calculate correct amounts for various values', () => {
    const testCases = [
      { amount: 50,   expectedTax: 10  },
      { amount: 250,  expectedTax: 50  },
      { amount: 1000, expectedTax: 200 },
    ];

    for (const { amount, expectedTax } of testCases) {
      const result = calculateTax({
        amount,
        buyerLocation: { countryCode: 'GB' },
      });

      expect(result.taxAmount).toBeCloseTo(expectedTax, 0);
    }
  });

  it('invoice note should reference HMRC', () => {
    const result = calculateTax({
      amount: 100,
      buyerLocation: { countryCode: 'GB' },
    });
    expect(result.invoiceNote).toMatch(/HMRC/i);
  });
});

// ---------------------------------------------------------------------------
// B2B — UK VAT reverse charge
// ---------------------------------------------------------------------------

describe('UK VAT - B2B Calculations (VAT number triggers reverse charge)', () => {
  it('should apply reverse charge when a UK VAT number is provided', () => {
    const result = calculateTax({
      amount: 100,
      buyerLocation: { countryCode: 'GB', vatNumber: 'GB123456789' },
    });

    expect(result.jurisdiction).toBe(TaxJurisdiction.UK);
    expect(result.taxRate).toBe(0);
    expect(result.taxAmount).toBe(0);
  });

  it('calculateUKVATResult should set isReverseCharge=true for VAT number', () => {
    const result = calculateUKVATResult(1000, {
      countryCode: 'GB',
      vatNumber: 'GB987654321',
    });

    expect(result.isReverseCharge).toBe(true);
    expect(result.taxRate).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.invoiceNote).toMatch(/reverse charge/i);
  });

  it('calculateUKVATResult should charge 20% for GB customer without VAT number', () => {
    const result = calculateUKVATResult(1000, { countryCode: 'GB' });

    expect(result.isReverseCharge).toBe(false);
    expect(result.taxRate).toBe(0.20);
    expect(result.taxAmount).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Rate comparison with EU neighbours
// ---------------------------------------------------------------------------

describe('UK VAT - Comparison with EU Countries', () => {
  it('UK standard rate (20%) should equal Austria and France standard rates', () => {
    const gbRate = calculateUKVAT({ countryCode: 'GB' });
    const atRate = calculateEUVAT({ countryCode: 'AT' });
    const frRate = calculateEUVAT({ countryCode: 'FR' });

    expect(gbRate).toBe(0.20);
    expect(atRate).toBe(0.20);
    expect(frRate).toBe(0.20);
  });

  it('UK rate should be lower than high-VAT Nordic countries', () => {
    const gbRate = calculateUKVAT({ countryCode: 'GB' });
    const seRate = calculateEUVAT({ countryCode: 'SE' }); // 25%
    const fiRate = calculateEUVAT({ countryCode: 'FI' }); // 25.5%

    expect(gbRate).toBeLessThan(seRate);
    expect(gbRate).toBeLessThan(fiRate);
  });

  it('UK rate should be above Luxembourg and Malta (lowest EU standard rates)', () => {
    const gbRate = calculateUKVAT({ countryCode: 'GB' }); // 20%
    const luRate = calculateEUVAT({ countryCode: 'LU' }); // 17%
    const mtRate = calculateEUVAT({ countryCode: 'MT' }); // 18%

    expect(gbRate).toBeGreaterThan(luRate);
    expect(gbRate).toBeGreaterThan(mtRate);
  });
});


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
