// Set env BEFORE module loads — SELLER_WALLET is a module-level constant
const SELLER = '0xSellerWalletAddress1234567890123456789012';
process.env.X402_SELLER_WALLET = SELLER;
process.env.X402_PRICE_ATOMIC = '1000';

// Mock viem before importing middleware (module-level side effects)
jest.mock('viem', () => ({
  createPublicClient: jest.fn(() => ({
    readContract: jest.fn().mockResolvedValue(false),
  })),
  http: jest.fn(),
  parseAbi: jest.fn(() => []),
  verifyTypedData: jest.fn(),
}));

jest.mock('viem/chains', () => ({ base: { id: 8453 } }));

import { verifyTypedData } from 'viem';
import { get402Response, requireX402Payment } from '../x402';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function makeReq(headers: Record<string, string> = {}) {
  return {
    header: (name: string) => headers[name] ?? undefined,
  } as any;
}

function makePayloadHeader(override: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    payload: {
      authorization: {
        from: '0xSenderAddress123456789012345678901234567',
        to: SELLER,
        value: '1000',
        validAfter: '0',
        validBefore: String(now + 3600),
        nonce: '0xdeadbeef',
        ...override,
      },
      signature: '0xsig',
    },
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

beforeEach(() => {
  jest.clearAllMocks();
  (verifyTypedData as jest.Mock).mockResolvedValue(true);
});

// ---------------------------------------------------------------------------
// get402Response
// ---------------------------------------------------------------------------

describe('get402Response', () => {
  it('returns x402Version 1', () => {
    const r = get402Response();
    expect(r.x402Version).toBe(1);
  });

  it('returns scheme "exact"', () => {
    expect(get402Response().scheme).toBe('exact');
  });

  it('returns network "base"', () => {
    expect(get402Response().network).toBe('base');
  });

  it('returns payment object with token and chainId', () => {
    const r = get402Response();
    expect(r.payment.token).toMatch(/^0x/);
    expect(r.payment.chainId).toBe(8453);
  });
});

// ---------------------------------------------------------------------------
// requireX402Payment — missing header
// ---------------------------------------------------------------------------

describe('requireX402Payment — missing header', () => {
  it('returns 402 with get402Response body when X-Payment header is missing', async () => {
    const req = makeReq({});
    const res = makeRes();
    await requireX402Payment(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(402);
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.x402Version).toBe(1);
  });

  it('does not call next() when header is missing', async () => {
    const next = jest.fn();
    await requireX402Payment(makeReq(), makeRes(), next);
    expect(next).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// requireX402Payment — malformed payload
// ---------------------------------------------------------------------------

describe('requireX402Payment — malformed payload', () => {
  it('returns 402 when X-Payment is not valid base64 JSON', async () => {
    const req = makeReq({ 'X-Payment': 'not-valid-base64!!!' });
    const res = makeRes();
    await requireX402Payment(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(402);
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error).toContain('verification failed');
  });
});

// ---------------------------------------------------------------------------
// requireX402Payment — validation checks
// ---------------------------------------------------------------------------

describe('requireX402Payment — authorization validation', () => {
  it('returns 402 when recipient does not match seller wallet', async () => {
    const header = makePayloadHeader({ to: '0xWrongRecipient' });
    const req = makeReq({ 'X-Payment': header });
    const res = makeRes();
    await requireX402Payment(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(402);
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error).toContain('Invalid recipient');
  });

  it('returns 402 when payment amount is insufficient', async () => {
    const header = makePayloadHeader({ value: '100' }); // less than 1000
    const req = makeReq({ 'X-Payment': header });
    const res = makeRes();
    await requireX402Payment(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(402);
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error).toContain('Insufficient payment');
  });

  it('returns 402 when authorization has expired', async () => {
    const pastTime = String(Math.floor(Date.now() / 1000) - 100);
    const header = makePayloadHeader({ validBefore: pastTime });
    const req = makeReq({ 'X-Payment': header });
    const res = makeRes();
    await requireX402Payment(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(402);
    expect((res.json as jest.Mock).mock.calls[0][0].error).toContain('expired');
  });

  it('returns 402 when authorization is not yet valid', async () => {
    const futureTime = String(Math.floor(Date.now() / 1000) + 9999);
    const header = makePayloadHeader({ validAfter: futureTime });
    const req = makeReq({ 'X-Payment': header });
    const res = makeRes();
    await requireX402Payment(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(402);
    expect((res.json as jest.Mock).mock.calls[0][0].error).toContain('not yet valid');
  });

  it('returns 402 when EIP-712 signature is invalid', async () => {
    (verifyTypedData as jest.Mock).mockResolvedValue(false);
    const header = makePayloadHeader();
    const req = makeReq({ 'X-Payment': header });
    const res = makeRes();
    await requireX402Payment(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(402);
    expect((res.json as jest.Mock).mock.calls[0][0].error).toContain('Invalid EIP-712 signature');
  });
});

// ---------------------------------------------------------------------------
// requireX402Payment — success path
// ---------------------------------------------------------------------------

describe('requireX402Payment — success', () => {
  it('calls next() when payment is fully valid', async () => {
    const header = makePayloadHeader({ nonce: '0xnonce001' });
    const req = makeReq({ 'X-Payment': header }) as any;
    const res = makeRes();
    const next = jest.fn();
    await requireX402Payment(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('attaches x402Payment to request on success', async () => {
    // Use a unique nonce to avoid "Nonce already used" from previous test
    const header = makePayloadHeader({ nonce: '0xnonce002' });
    const req = makeReq({ 'X-Payment': header }) as any;
    await requireX402Payment(req, makeRes(), jest.fn());
    expect(req.x402Payment).toBeDefined();
    expect(req.x402Payment.nonce).toBe('0xnonce002');
  });
});
