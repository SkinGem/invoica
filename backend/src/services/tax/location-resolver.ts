/**
 * Location Resolver Service
 * 
 * Resolves tax jurisdiction based on VAT number, address, or IP location.
 * Handles EU VAT validation and determines applicable tax rules.
 */

import { getClientIp } from '../utils/ip-utils';
import { validateVATNumber } from '../vat-validator';
import { cacheManager } from '../cache/cache-manager';
import { TaxJurisdiction, LocationEvidence, VATValidationResult } from '../types';

/**
 * EU countries including UK territories
 * 'XI' = Northern Ireland (post-Brexit special status)
 * 'GB' = Great Britain (England, Scotland, Wales)
 */
const EU_COUNTRIES = [
  'AT', // Austria
  'BE', // Belgium
  'BG', // Bulgaria
  'CY', // Cyprus
  'CZ', // Czech Republic
  'DE', // Germany
  'DK', // Denmark
  'EE', // Estonia
  'EL', // Greece
  'ES', // Spain
  'FI', // Finland
  'FR', // France
  'HR', // Croatia
  'HU', // Hungary
  'IE', // Ireland
  'IT', // Italy
  'LT', // Lithuania
  'LU', // Luxembourg
  'LV', // Latvia
  'MT', // Malta
  'NL', // Netherlands
  'PL', // Poland
  'PT', // Portugal
  'RO', // Romania
  'SE', // Sweden
  'SI', // Slovenia
  'SK', // Slovakia
  'XI', // Northern Ireland (UK - special status for EU VAT)
  'GB', // Great Britain (England, Scotland, Wales)
];

const EU_VAT_PREFIXES = ['AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES', 'FI', 'FR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'XI', 'GB'];

/**
 * Determines if a country code is an EU country
 * @param countryCode - Two-letter country code
 * @returns True if the country is in the EU
 */
export function isEUCountry(countryCode: string): boolean {
  if (!countryCode) {
    return false;
  }
  return EU_COUNTRIES.includes(countryCode.toUpperCase());
}

/**
 * Gets the jurisdiction based on VAT number, address, or IP
 * @param params - Object containing location information
 * @returns Promise resolving to TaxJurisdiction
 */
export async function getJurisdiction(params: {
  vatNumber?: string;
  billingCountry?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<TaxJurisdiction> {
  const { vatNumber, billingCountry, ipAddress } = params;
  
  const evidence: LocationEvidence = {
    timestamp: new Date(),
    source: [],
  };

  // Priority 1: Validate VAT number if provided
  if (vatNumber) {
    try {
      const vatResult = await validateVATNumberWithCache(vatNumber);
      
      if (vatResult.isValid) {
        evidence.source.push({
          type: 'VAT_NUMBER',
          value: vatNumber,
          validatedAt: vatResult.validatedAt,
        });

        return {
          countryCode: vatResult.countryCode!,
          isEU: isEUCountry(vatResult.countryCode!),
          hasVAT: true,
          vatNumber: vatNumber,
          isValidVAT: true,
          taxType: determineTaxType(vatResult.countryCode!, true),
          evidence,
        };
      }
    } catch (error) {
      // VAT validation failed, fall through to other methods
      console.warn(`VAT validation failed for ${vatNumber}:`, error);
    }
  }

  // Priority 2: Use billing country if provided
  if (billingCountry) {
    const normalizedCountry = billingCountry.toUpperCase();
    
    evidence.source.push({
      type: 'BILLING_ADDRESS',
      value: normalizedCountry,
      validatedAt: new Date(),
    });

    return {
      countryCode: normalizedCountry,
      isEU: isEUCountry(normalizedCountry),
      hasVAT: false,
      isValidVAT: false,
      taxType: determineTaxType(normalizedCountry, false),
      evidence,
    };
  }

  // Priority 3: Use IP address as last resort
  if (ipAddress) {
    try {
      const geoInfo = await resolveIPLocation(ipAddress);
      
      if (geoInfo?.countryCode) {
        const normalizedCountry = geoInfo.countryCode.toUpperCase();
        
        evidence.source.push({
          type: 'IP_GEOLOCATION',
          value: `${ipAddress} -> ${normalizedCountry}`,
          validatedAt: new Date(),
        });

        return {
          countryCode: normalizedCountry,
          isEU: isEUCountry(normalizedCountry),
          hasVAT: false,
          isValidVAT: false,
          taxType: determineTaxType(normalizedCountry, false),
          evidence,
        };
      }
    } catch (error) {
      console.warn(`IP geolocation failed for ${ipAddress}:`, error);
    }
  }

  // Cannot determine jurisdiction
  throw new Error('Unable to determine tax jurisdiction: no valid location information provided');
}

/**
 * Validates VAT number with caching
 * @param vatNumber - VAT number to validate
 * @returns VAT validation result
 */
async function validateVATNumberWithCache(vatNumber: string): Promise<VATValidationResult> {
  const cacheKey = `vat_validation:${vatNumber.toUpperCase()}`;
  
  // Check cache first (30 days as per compliance requirements)
  const cached = await cacheManager.get<VATValidationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  // Call VIES API
  const result = await validateVATNumber(vatNumber);
  
  // Cache valid results for 30 days
  if (result.isValid) {
    const ttlSeconds = 30 * 24 * 60 * 60; // 30 days
    await cacheManager.set(cacheKey, result, ttlSeconds);
  }
  
  return result;
}

/**
 * Resolves IP address to location
 * @param ipAddress - IP address to resolve
 * @returns Location information
 */
async function resolveIPLocation(ipAddress: string): Promise<{ countryCode: string } | null> {
  // This would typically use a geolocation service
  // For now, return null to fall back to other methods
  // In production, integrate with MaxMind, IPAPI, etc.
  return null;
}

/**
 * Determines the tax type based on jurisdiction and buyer status
 * @param countryCode - Country code
 * @param hasValidVAT - Whether buyer has valid VAT number
 * @returns Tax type string
 */
function determineTaxType(countryCode: string, hasValidVAT: boolean): string {
  const isEU = isEUCountry(countryCode);
  
  if (!isEU) {
    return 'OUTSIDE_EU';
  }
  
  if (hasValidVAT) {
    return 'REVERSE_CHARGE';
  }
  
  return 'DOMESTIC';
}

/**
 * Extracts country code from VAT number
 * @param vatNumber - Full VAT number with country prefix
 * @returns Country code or null if invalid
 */
export function extractCountryFromVAT(vatNumber: string): string | null {
  if (!vatNumber || vatNumber.length < 2) {
    return null;
  }
  
  const prefix = vatNumber.substring(0, 2).toUpperCase();
  
  if (EU_VAT_PREFIXES.includes(prefix)) {
    return prefix;
  }
  
  return null;
}

export default {
  getJurisdiction,
  isEUCountry,
  extractCountryFromVAT,
};
