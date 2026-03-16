import { base58Decode, get402SolanaResponse } from '../x402-solana';

describe('x402-solana', () => {
  describe('base58Decode', () => {
    it('decodes a known base58 string', () => {
      // '1' in base58 = 0x00
      const result = base58Decode('1');
      expect(result).toEqual(new Uint8Array([0]));
    });

    it('decodes a longer base58 string', () => {
      // '2' in base58 = 0x01
      const result = base58Decode('2');
      expect(result[result.length - 1]).toBe(1);
    });

    it('throws on invalid characters', () => {
      expect(() => base58Decode('0OIl')).toThrow('Invalid base58 character');
    });

    it('returns empty array for empty string', () => {
      expect(base58Decode('')).toEqual(new Uint8Array(0));
    });

    it('decodes a 32-byte Solana pubkey to correct length', () => {
      // Known USDC mint address
      const decoded = base58Decode('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      expect(decoded.length).toBe(32);
    });

    it('decodes SPL Token Program ID to 32 bytes', () => {
      const decoded = base58Decode('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      expect(decoded.length).toBe(32);
    });
  });

  describe('get402SolanaResponse', () => {
    it('returns correct 402 response structure', () => {
      const response = get402SolanaResponse();
      expect(response.x402Version).toBe(1);
      expect(response.scheme).toBe('exact');
      expect(response.network).toBe('solana');
      expect(response.payment).toBeDefined();
      expect(response.payment.tokenMint).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      expect(typeof response.payment.amount).toBe('string');
    });
  });

  describe('requireX402SolanaPayment', () => {
    it('returns 402 when X-Payment header is missing', async () => {
      const { requireX402SolanaPayment } = await import('../x402-solana');
      const req = { headers: {} } as any;
      const json = jest.fn();
      const res = { status: jest.fn().mockReturnValue({ json }) } as any;
      const next = jest.fn();

      await requireX402SolanaPayment(req, res, next);
      expect(res.status).toHaveBeenCalledWith(402);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 402 for invalid base64 header', async () => {
      const { requireX402SolanaPayment } = await import('../x402-solana');
      const req = { headers: { 'x-payment': 'not-valid-base64!!!{{{' } } as any;
      const json = jest.fn();
      const res = { status: jest.fn().mockReturnValue({ json }) } as any;
      const next = jest.fn();

      await requireX402SolanaPayment(req, res, next);
      expect(res.status).toHaveBeenCalledWith(402);
    });

    it('returns 402 when authorization or signature is missing', async () => {
      const { requireX402SolanaPayment } = await import('../x402-solana');
      const payload = Buffer.from(JSON.stringify({ payload: { authorization: null } })).toString('base64');
      const req = { headers: { 'x-payment': payload } } as any;
      const json = jest.fn();
      const res = { status: jest.fn().mockReturnValue({ json }) } as any;
      const next = jest.fn();

      await requireX402SolanaPayment(req, res, next);
      expect(res.status).toHaveBeenCalledWith(402);
    });
  });
});
