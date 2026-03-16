import {
  UnsupportedChainError,
  DEFAULT_CHAIN,
  SUPPORTED_CHAINS,
  getChainConfig,
  getSupportedChainIds,
  isChainSupported,
} from '../chains';

describe('UnsupportedChainError', () => {
  it('is an instance of Error', () => {
    const err = new UnsupportedChainError('unknown');
    expect(err).toBeInstanceOf(Error);
  });

  it('sets the chainId property', () => {
    const err = new UnsupportedChainError('polygon');
    expect(err.chainId).toBe('polygon');
  });

  it('includes the chain id in the message', () => {
    const err = new UnsupportedChainError('avalanche');
    expect(err.message).toContain('avalanche');
  });

  it('has name UnsupportedChainError', () => {
    const err = new UnsupportedChainError('x');
    expect(err.name).toBe('UnsupportedChainError');
  });
});

describe('DEFAULT_CHAIN', () => {
  it('equals "base"', () => {
    expect(DEFAULT_CHAIN).toBe('base');
  });
});

describe('SUPPORTED_CHAINS', () => {
  it('contains base chain', () => {
    expect(SUPPORTED_CHAINS.has('base')).toBe(true);
  });

  it('contains solana chain', () => {
    expect(SUPPORTED_CHAINS.has('solana')).toBe(true);
  });

  it('base chain has required fields', () => {
    const chain = SUPPORTED_CHAINS.get('base')!;
    expect(chain.id).toBeDefined();
    expect(chain.name).toBe('Base');
    expect(chain.rpcUrl).toBeDefined();
    expect(chain.usdcAddress).toBeDefined();
  });
});

describe('getChainConfig', () => {
  it('returns config for base', () => {
    const config = getChainConfig('base');
    expect(config.name).toBe('Base');
  });

  it('throws UnsupportedChainError for unknown chain', () => {
    expect(() => getChainConfig('fake-chain')).toThrow(UnsupportedChainError);
  });

  it('thrown error contains the chain id', () => {
    expect(() => getChainConfig('fake-chain')).toThrow('fake-chain');
  });
});

describe('getSupportedChainIds', () => {
  it('returns an array', () => {
    expect(Array.isArray(getSupportedChainIds())).toBe(true);
  });

  it('includes base', () => {
    expect(getSupportedChainIds()).toContain('base');
  });

  it('includes solana', () => {
    expect(getSupportedChainIds()).toContain('solana');
  });
});

describe('isChainSupported', () => {
  it('returns true for base', () => {
    expect(isChainSupported('base')).toBe(true);
  });

  it('returns false for unsupported chain', () => {
    expect(isChainSupported('fake-chain')).toBe(false);
  });
});
