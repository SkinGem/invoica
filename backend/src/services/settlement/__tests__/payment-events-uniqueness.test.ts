/**
 * M1-MONEY-02 regression test — plan §1 M1 exit criterion:
 * "Replay test passes. Zero unauth data routes."
 *
 * The same (chain, txHash) pair cannot record twice. UNIQUE constraint in the
 * DB is the actual safety net; this test proves the helper surfaces the
 * violation as a DuplicatePaymentError so callers can abort settlement.
 */
import { recordPaymentEvent, DuplicatePaymentError } from '../payment-events';
import { supabase } from '../../../lib/supabase';

jest.mock('../../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

describe('recordPaymentEvent — duplicate-settlement prevention', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockInsert(result: { data: unknown; error: unknown }) {
    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue(result),
        }),
      }),
    });
  }

  it('inserts a new payment event and returns its id', async () => {
    mockInsert({ data: { id: 'evt-1' }, error: null });
    const result = await recordPaymentEvent({
      invoiceId: 'inv-1',
      chain: 'base',
      txHash: '0xabc',
      amountUsdc: 100,
      source: 'evm-detector',
    });
    expect(result.id).toBe('evt-1');
  });

  it('throws DuplicatePaymentError on UNIQUE(chain, txHash) violation (PG code 23505)', async () => {
    mockInsert({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "PaymentEvents_chain_txHash_key"' },
    });
    await expect(
      recordPaymentEvent({
        invoiceId: 'inv-2',
        chain: 'base',
        txHash: '0xabc',
        amountUsdc: 100,
        source: 'evm-detector',
      }),
    ).rejects.toBeInstanceOf(DuplicatePaymentError);
  });

  it('throws DuplicatePaymentError when error message mentions the constraint by name', async () => {
    mockInsert({
      data: null,
      error: { message: 'duplicate key value violates unique constraint "paymentevents_chain_txhash_key"' },
    });
    await expect(
      recordPaymentEvent({
        invoiceId: 'inv-3',
        chain: 'polygon',
        txHash: '0xdef',
        amountUsdc: 50,
        source: 'evm-detector',
      }),
    ).rejects.toBeInstanceOf(DuplicatePaymentError);
  });

  it('rethrows non-duplicate errors unchanged', async () => {
    const otherError = { code: '42P01', message: 'relation "PaymentEvents" does not exist' };
    mockInsert({ data: null, error: otherError });
    await expect(
      recordPaymentEvent({
        invoiceId: 'inv-4',
        chain: 'solana',
        txHash: 'sig-xyz',
        amountUsdc: 25,
        source: 'solana-detector',
      }),
    ).rejects.toMatchObject(otherError);
  });

  it('exposes the conflicting chain and txHash on the thrown error', async () => {
    mockInsert({
      data: null,
      error: { code: '23505', message: 'duplicate key' },
    });
    try {
      await recordPaymentEvent({
        invoiceId: 'inv-5',
        chain: 'arbitrum',
        txHash: '0xfoo',
        amountUsdc: 10,
        source: 'evm-detector',
      });
      fail('expected DuplicatePaymentError');
    } catch (err) {
      expect(err).toBeInstanceOf(DuplicatePaymentError);
      expect((err as DuplicatePaymentError).chain).toBe('arbitrum');
      expect((err as DuplicatePaymentError).txHash).toBe('0xfoo');
      expect((err as DuplicatePaymentError).code).toBe('DUPLICATE_TX');
    }
  });
});
