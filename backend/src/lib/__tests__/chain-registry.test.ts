import { CHAINS, getChain, getSupportedChains, isEvmChain, isSolanaChain } from '../chain-registry';

describe('getSupportedChains', () => {
  it('includes base, polygon, and solana', () => {
    const chains = getSupportedChains();
    expect(chains).toContain('base');
    expect(chains).toContain('polygon');
    expect(chains).toContain('solana');
  });

  it('returns exactly 3 chains', () => {
    expect(getSupportedChains()).toHaveLength(3);
  });
});

describe('getChain', () => {
  it('returns base chain with correct id', () => {
    const chain = getChain('base');
    expect(chain.id).toBe('base');
    expect(chain.displayName).toBe('Base');
  });

  it('returns polygon chain with chainId 137', () => {
    const chain = getChain('polygon');
    expect(chain.chainId).toBe(137);
  });

  it('returns solana chain with type solana', () => {
    const chain = getChain('solana');
    expect(chain.type).toBe('solana');
    expect(chain.chainId).toBe('solana');
  });

  it('throws on unsupported chain', () => {
    expect(() => getChain('ethereum')).toThrow('Unsupported chain');
  });

  it('throws error mentioning the unknown chain id', () => {
    expect(() => getChain('arbitrum')).toThrow('arbitrum');
  });
});

describe('isEvmChain', () => {
  it('returns true for base', () => {
    expect(isEvmChain('base')).toBe(true);
  });

  it('returns true for polygon', () => {
    expect(isEvmChain('polygon')).toBe(true);
  });

  it('returns false for solana', () => {
    expect(isEvmChain('solana')).toBe(false);
  });
});

describe('isSolanaChain', () => {
  it('returns true for solana', () => {
    expect(isSolanaChain('solana')).toBe(true);
  });

  it('returns false for base', () => {
    expect(isSolanaChain('base')).toBe(false);
  });

  it('returns false for polygon', () => {
    expect(isSolanaChain('polygon')).toBe(false);
  });
});

describe('CHAINS data integrity', () => {
  it('all chains have usdcDecimals of 6', () => {
    for (const chain of Object.values(CHAINS)) {
      expect(chain.usdcDecimals).toBe(6);
    }
  });

  it('all chains have non-empty rpcUrl', () => {
    for (const chain of Object.values(CHAINS)) {
      expect(chain.rpcUrl).toBeTruthy();
    }
  });

  it('all chains have non-empty usdcAddress', () => {
    for (const chain of Object.values(CHAINS)) {
      expect(chain.usdcAddress).toBeTruthy();
    }
  });
});
