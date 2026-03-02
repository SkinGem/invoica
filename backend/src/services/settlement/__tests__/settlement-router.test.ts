import { checkSettlement } from '../settlement-router';
import { EvmSettlementDetector } from '../detectors/evm-settlement-detector';
import { SolanaSettlementDetector } from '../detectors/solana-settlement-detector';

jest.mock('../detectors/evm-settlement-detector');
jest.mock('../detectors/solana-settlement-detector');

const mockEvmDetector = EvmSettlementDetector.prototype as jest.Mocked<EvmSettlementDetector>;
const mockSolanaDetector = SolanaSettlementDetector.prototype as jest.Mocked<SolanaSettlementDetector>;

describe('settlement-router', () => {
  const testAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes base chain to EvmSettlementDetector', async () => {
    mockEvmDetector.checkSettlement.mockResolvedValue({ settled: true, amount: '100' });
    const result = await checkSettlement('base', testAddress);
    expect(mockEvmDetector.checkSettlement).toHaveBeenCalledWith(testAddress, 8453);
    expect(result.settled).toBe(true);
  });

  it('routes polygon chain to EvmSettlementDetector with Polygon config', async () => {
    mockEvmDetector.checkSettlement.mockResolvedValue({ settled: false, amount: '0' });
    const result = await checkSettlement('polygon', testAddress);
    expect(mockEvmDetector.checkSettlement).toHaveBeenCalledWith(testAddress, 137);
    expect(result.settled).toBe(false);
  });

  it('routes solana chain to SolanaSettlementDetector', async () => {
    mockSolanaDetector.checkSettlement.mockResolvedValue({ settled: true, amount: '500' });
    const result = await checkSettlement('solana', testAddress);
    expect(mockSolanaDetector.checkSettlement).toHaveBeenCalledWith(testAddress);
    expect(result.settled).toBe(true);
  });

  it('throws for unsupported chain', async () => {
    await expect(checkSettlement('arbitrum', testAddress)).rejects.toThrow('Unsupported chain: arbitrum');
  });
});
