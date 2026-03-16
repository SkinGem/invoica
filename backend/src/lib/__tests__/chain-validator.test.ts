import { validateChainCompatibility } from '../chain-validator';

describe('validateChainCompatibility — invalid inputs', () => {
  it('returns invalid when chainId is empty string', () => {
    const result = validateChainCompatibility('', '0x1234567890123456789012345678901234567890');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Chain ID is required');
  });

  it('returns invalid when address is empty string', () => {
    const result = validateChainCompatibility('base', '');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Address is required');
  });

  it('returns invalid for unsupported chain', () => {
    const result = validateChainCompatibility('ethereum', '0x1234567890123456789012345678901234567890');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unsupported chain');
  });

  it('error message lists supported chains when chain is unsupported', () => {
    const result = validateChainCompatibility('arbitrum', '0x1234');
    expect(result.error).toContain('base');
    expect(result.error).toContain('polygon');
    expect(result.error).toContain('solana');
  });
});

describe('validateChainCompatibility — valid inputs', () => {
  it('returns valid for base chain with any non-empty address', () => {
    const result = validateChainCompatibility('base', '0x1234567890123456789012345678901234567890');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns valid for polygon chain with any non-empty address', () => {
    const result = validateChainCompatibility('polygon', '0xabcdef1234567890abcdef1234567890abcdef12');
    expect(result.valid).toBe(true);
  });

  it('returns valid for solana chain with any non-empty address', () => {
    const result = validateChainCompatibility('solana', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    expect(result.valid).toBe(true);
  });
});

describe('validateChainCompatibility — whitespace trimming', () => {
  it('trims whitespace from chainId before validation', () => {
    const result = validateChainCompatibility('  base  ', '0x1234567890123456789012345678901234567890');
    expect(result.valid).toBe(true);
  });

  it('trims whitespace from address before validation', () => {
    const result = validateChainCompatibility('polygon', '  0xabcdef1234567890abcdef1234567890abcdef12  ');
    expect(result.valid).toBe(true);
  });

  it('returns invalid for chainId that is only whitespace', () => {
    const result = validateChainCompatibility('   ', '0x1234');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unsupported chain');
  });
});
