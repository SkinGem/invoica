import { EvmSettlementDetector } from '../evm-detector';
import { SUPPORTED_CHAINS } from '../../../config/chains';

// Mock fetch for RPC calls
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('EvmSettlementDetector - Arbitrum', () => {
  let detector: EvmSettlementDetector;
  const arbitrumConfig = SUPPORTED_CHAINS.find(chain => chain.id === 'arbitrum')!;

  beforeEach(() => {
    detector = new EvmSettlementDetector(arbitrumConfig);
    mockFetch.mockClear();
  });

  it('should detect USDC transfer on Arbitrum', async () => {
    // Mock RPC responses for real Arbitrum transaction
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: [{
            blockNumber: '0x12345',
            transactionHash: '0xabc123',
            topics: [
              '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
              '0x000000000000000000000000742d35cc6634c0532925a3b8d1b9e7c1e5b4e8f1',
              '0x000000000000000000000000742d35cc6634c0532925a3b8d1b9e7c1e5b4e8f2'
            ],
            data: '0x00000000000000000000000000000000000000000000000000000000000f4240',
            address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831'
          }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: { timestamp: '0x65f0a123', number: '0x12345' }
        })
      });

    const matches = await detector.scanTransfersToAddress('0x742d35cc6634c0532925a3b8d1b9e7c1e5b4e8f2');

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      txHash: '0xabc123',
      amount: 1,
      from: '0x742d35cc6634c0532925a3b8d1b9e7c1e5b4e8f1',
      to: '0x742d35cc6634c0532925a3b8d1b9e7c1e5b4e8f2',
      chain: 'arbitrum'
    });
  });

  it('should handle RPC errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32000, message: 'Rate limit exceeded' }
      })
    });

    await expect(detector.scanTransfersToAddress('0x123')).rejects.toThrow('RPC error: Rate limit exceeded');
  });

  it('should get latest block number', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        jsonrpc: '2.0',
        id: 1,
        result: '0x123abc'
      })
    });

    const blockNumber = await detector.getLatestBlock();
    expect(blockNumber).toBe(1194684);
  });
});