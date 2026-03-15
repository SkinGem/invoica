import { checkSettlement } from '../settlement-router';
import { EvmSettlementDetector } from '../evm-detector';
import { SolanaSettlementDetector } from '../solana-detector';

jest.mock('../evm-detector');
jest.mock('../solana-detector');

const mockScanTransfers = jest.fn().mockResolvedValue([]);
const mockSolanaTransfers = jest.fn().mockResolvedValue([]);

(EvmSettlementDetector as jest.MockedClass<typeof EvmSettlementDetector>)
  .mockImplementation(() => ({ scanTransfersToAddress: mockScanTransfers } as any));
(SolanaSettlementDetector as jest.MockedClass<typeof SolanaSettlementDetector>)
  .mockImplementation(() => ({ getRecentUsdcTransfers: mockSolanaTransfers } as any));

const ADDR = '0xabc123';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('settlement-router', () => {
  it('routes base to EvmSettlementDetector', async () => {
    await checkSettlement('base', ADDR);
    expect(EvmSettlementDetector).toHaveBeenCalledTimes(1);
    expect(mockScanTransfers).toHaveBeenCalledWith(ADDR, 'latest', 'latest');
    expect(SolanaSettlementDetector).not.toHaveBeenCalled();
  });

  it('routes polygon to EvmSettlementDetector', async () => {
    await checkSettlement('polygon', ADDR);
    expect(EvmSettlementDetector).toHaveBeenCalledTimes(1);
    expect(mockScanTransfers).toHaveBeenCalled();
    expect(SolanaSettlementDetector).not.toHaveBeenCalled();
  });

  it('routes solana to SolanaSettlementDetector', async () => {
    await checkSettlement('solana', ADDR);
    expect(SolanaSettlementDetector).toHaveBeenCalledTimes(1);
    expect(mockSolanaTransfers).toHaveBeenCalledWith(ADDR, 20);
    expect(EvmSettlementDetector).not.toHaveBeenCalled();
  });

  it('throws for unsupported chain', async () => {
    await expect(checkSettlement('arbitrum', ADDR)).rejects.toThrow('Unsupported chain: arbitrum');
  });
});
