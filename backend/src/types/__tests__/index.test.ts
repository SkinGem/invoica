import type { ChainConfig } from '../index';

describe('ChainConfig interface shape', () => {
  it('constructs an EVM chain config with numeric id', () => {
    const chain: ChainConfig = {
      id: 8453,
      name: 'base',
      rpcUrl: 'https://mainnet.base.org',
      usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      explorerUrl: 'https://basescan.org',
      isTestnet: false,
    };
    expect(chain.id).toBe(8453);
    expect(chain.isTestnet).toBe(false);
  });

  it('constructs a non-EVM chain config with string id', () => {
    const chain: ChainConfig = {
      id: 'solana',
      name: 'solana',
      rpcUrl: 'https://api.mainnet-beta.solana.com',
      usdcAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      explorerUrl: 'https://explorer.solana.com',
      isTestnet: false,
    };
    expect(chain.id).toBe('solana');
    expect(typeof chain.id).toBe('string');
  });

  it('constructs a testnet chain with isTestnet=true', () => {
    const chain: ChainConfig = {
      id: 84532,
      name: 'base-sepolia',
      rpcUrl: 'https://sepolia.base.org',
      usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      explorerUrl: 'https://sepolia.basescan.org',
      isTestnet: true,
    };
    expect(chain.isTestnet).toBe(true);
    expect(chain.name).toBe('base-sepolia');
  });
});
