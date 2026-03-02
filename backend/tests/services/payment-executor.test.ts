import { executePayment, PaymentExecution } from '../../services/payment-executor';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
  })),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

jest.mock('../../services/payment-executor', () => ({
  ...jest.requireActual('../../services/payment-executor'),
}));

describe('PaymentExecutor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executePayment', () => {
    it('should throw error if settlement does not exist', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null }),
          }),
        }),
      });

      await expect(executePayment('invalid-id', '0x123', '1000000'))
        .rejects.toThrow('Settlement invalid-id not found');
    });

    it('should create pending payment when settlement exists', async () => {
      const mockSettlement = { id: 'settle-123' };
      const mockPayment: PaymentExecution = {
        settlement_id: 'settle-123',
        from_address: '0x123',
        to_address: '0x0000000000000000000000000000000000000001',
        amount: '1000000',
        status: 'pending',
      };

      const selectMock = {
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockSettlement }),
        }),
      };

      const insertMock = {
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockPayment }),
        }),
      };

      (mockSupabase.from as jest.Mock)
        .mockReturnValueOnce({ select: () => selectMock })
        .mockReturnValueOnce({ insert: () => insertMock });

      const result = await executePayment('settle-123', '0x123', '1000000');

      expect(result.status).toBe('pending');
      expect(result.settlement_id).toBe('settle-123');
      expect(result.from_address).toBe('0x123');
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment when found', async () => {
      const mockPayment: PaymentExecution = {
        settlement_id: 'settle-123',
        from_address: '0x123',
        to_address: '0x456',
        amount: '1000000',
        status: 'confirmed',
        tx_hash: '0xabc',
      };

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockPayment }),
          }),
        }),
      });

      const result = await getPaymentStatus('settle-123');

      expect(result).toEqual(mockPayment);
      expect(result?.status).toBe('confirmed');
    });

    it('should return null when payment not found', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null }),
          }),
        }),
      });

      const result = await getPaymentStatus('unknown-settlement');

      expect(result).toBeNull();
    });
  });
});
