import { SolanaSettlementDetector } from '../solana-detector';

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const MEMO_PROGRAM = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

const chainConfig = { rpcUrl: 'https://api.mainnet-beta.solana.com', id: 'solana' };
const wallet = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const txSig = '5wTgL6kChzzs5hGxzKxXKxVJsY3M4j7QVNxW8P9Yv2XKzL6R3mN8pQ1wE4rT7uY';

function rpcResponse(result: unknown) {
  return { ok: true, json: async () => ({ jsonrpc: '2.0', id: 1, result }) };
}

function usdcTransferInstruction(from: string, to: string, uiAmount: number) {
  return {
    programId: TOKEN_PROGRAM,
    parsed: {
      type: 'transferChecked',
      info: { source: from, destination: to, mint: USDC_MINT, tokenAmount: { uiAmount } },
    },
  };
}

function memoInstruction(text: string) {
  return {
    programId: MEMO_PROGRAM,
    data: Buffer.from(text).toString('base64'),
  };
}

function txResult(instructions: unknown[]) {
  return { transaction: { message: { instructions } } };
}

describe('SolanaSettlementDetector', () => {
  let detector: SolanaSettlementDetector;

  beforeEach(() => {
    detector = new SolanaSettlementDetector(chainConfig);
    jest.clearAllMocks();
  });

  it('creates instance with valid config', () => {
    expect(detector).toBeInstanceOf(SolanaSettlementDetector);
  });

  describe('getRecentUsdcTransfers', () => {
    it('returns empty array when no signatures found', async () => {
      mockFetch.mockResolvedValueOnce(rpcResponse([]));
      const result = await detector.getRecentUsdcTransfers(wallet);
      expect(result).toEqual([]);
    });

    it('returns settlement match for USDC transfer to wallet', async () => {
      mockFetch
        .mockResolvedValueOnce(rpcResponse([{ signature: txSig, blockTime: 1700000000 }]))
        .mockResolvedValueOnce(rpcResponse(txResult([
          usdcTransferInstruction('senderAddr', wallet, 50.0),
        ])));

      const result = await detector.getRecentUsdcTransfers(wallet);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        txHash: txSig,
        amount: 50.0,
        from: 'senderAddr',
        to: wallet,
        chain: 'solana',
        timestamp: 1700000000,
      });
    });

    it('filters out transfers to other addresses', async () => {
      mockFetch
        .mockResolvedValueOnce(rpcResponse([{ signature: txSig, blockTime: 1 }]))
        .mockResolvedValueOnce(rpcResponse(txResult([
          usdcTransferInstruction('senderAddr', 'otherWallet', 10.0),
        ])));

      const result = await detector.getRecentUsdcTransfers(wallet);
      expect(result).toHaveLength(0);
    });

    it('extracts memo and sets invoiceId', async () => {
      mockFetch
        .mockResolvedValueOnce(rpcResponse([{ signature: txSig, blockTime: 1 }]))
        .mockResolvedValueOnce(rpcResponse(txResult([
          memoInstruction('INV-0042'),
          usdcTransferInstruction('sender', wallet, 25.0),
        ])));

      const result = await detector.getRecentUsdcTransfers(wallet);
      expect(result).toHaveLength(1);
      expect(result[0].invoiceId).toBe('INV-0042');
    });

    it('returns null tx when getTransaction returns null', async () => {
      mockFetch
        .mockResolvedValueOnce(rpcResponse([{ signature: txSig, blockTime: 1 }]))
        .mockResolvedValueOnce(rpcResponse(null));

      const result = await detector.getRecentUsdcTransfers(wallet);
      expect(result).toHaveLength(0);
    });

    it('ignores non-USDC token transfers', async () => {
      mockFetch
        .mockResolvedValueOnce(rpcResponse([{ signature: txSig, blockTime: 1 }]))
        .mockResolvedValueOnce(rpcResponse(txResult([{
          programId: TOKEN_PROGRAM,
          parsed: {
            type: 'transferChecked',
            info: { source: 'a', destination: wallet, mint: 'SomeOtherMint', tokenAmount: { uiAmount: 100 } },
          },
        }])));

      const result = await detector.getRecentUsdcTransfers(wallet);
      expect(result).toHaveLength(0);
    });

    it('respects limit parameter', async () => {
      mockFetch.mockResolvedValueOnce(rpcResponse([]));
      await detector.getRecentUsdcTransfers(wallet, 5);
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.params[1].limit).toBe(5);
    });
  });

  describe('verifyTransfer', () => {
    it('returns true for matching USDC transfer', async () => {
      mockFetch.mockResolvedValueOnce(rpcResponse(txResult([
        usdcTransferInstruction('sender', wallet, 50.0),
      ])));

      const result = await detector.verifyTransfer(txSig, wallet, 50.0);
      expect(result).toBe(true);
    });

    it('returns true when transfer exceeds expected amount', async () => {
      mockFetch.mockResolvedValueOnce(rpcResponse(txResult([
        usdcTransferInstruction('sender', wallet, 100.0),
      ])));

      const result = await detector.verifyTransfer(txSig, wallet, 50.0);
      expect(result).toBe(true);
    });

    it('returns false when transfer is less than expected', async () => {
      mockFetch.mockResolvedValueOnce(rpcResponse(txResult([
        usdcTransferInstruction('sender', wallet, 10.0),
      ])));

      const result = await detector.verifyTransfer(txSig, wallet, 50.0);
      expect(result).toBe(false);
    });

    it('returns false for non-existent transaction', async () => {
      mockFetch.mockResolvedValueOnce(rpcResponse(null));
      const result = await detector.verifyTransfer(txSig, wallet, 50.0);
      expect(result).toBe(false);
    });

    it('returns false when recipient does not match', async () => {
      mockFetch.mockResolvedValueOnce(rpcResponse(txResult([
        usdcTransferInstruction('sender', 'differentWallet', 50.0),
      ])));

      const result = await detector.verifyTransfer(txSig, wallet, 50.0);
      expect(result).toBe(false);
    });
  });
});
