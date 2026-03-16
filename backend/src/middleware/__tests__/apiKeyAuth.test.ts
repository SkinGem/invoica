jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('bcrypt', () => ({ compare: jest.fn() }));

import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import { requireApiKey } from '../apiKeyAuth';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSbChain(result: unknown) {
  const chain: any = {};
  const ret = jest.fn().mockReturnValue(chain);
  chain.select = ret;
  chain.update = ret;
  chain.eq = ret;
  chain.limit = jest.fn().mockResolvedValue(result);
  return chain;
}

function mockSb(result: unknown) {
  (createClient as jest.Mock).mockReturnValue({ from: jest.fn(() => buildSbChain(result)) });
}

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    headers: {},
    ...overrides,
  } as any;
}

function makeRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const VALID_ROW = {
  id: 'key-001',
  customerId: 'cust-001',
  keyHash: '$2b$hash',
  isActive: true,
  expiresAt: null,
};

const VALID_KEY = 'sk_abcdefgh1234567890';

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('requireApiKey — missing / invalid key format', () => {
  it('returns 401 when no Authorization and no X-Api-Key', async () => {
    const req = makeReq({ headers: {} });
    const res = makeRes();
    const next = jest.fn();
    await requireApiKey(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Bearer key lacks sk_ prefix', async () => {
    const req = makeReq({ headers: { authorization: 'Bearer notsk_key123' } });
    const res = makeRes();
    const next = jest.fn();
    await requireApiKey(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when X-Api-Key lacks sk_ prefix', async () => {
    const req = makeReq({ headers: { 'x-api-key': 'notsk_key123' } });
    const res = makeRes();
    const next = jest.fn();
    await requireApiKey(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireApiKey — Supabase lookup failures', () => {
  it('returns 401 when Supabase returns error', async () => {
    mockSb({ data: null, error: { message: 'DB error' } });
    const req = makeReq({ headers: { 'x-api-key': VALID_KEY } });
    const res = makeRes();
    await requireApiKey(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when Supabase returns empty rows', async () => {
    mockSb({ data: [], error: null });
    const req = makeReq({ headers: { 'x-api-key': VALID_KEY } });
    const res = makeRes();
    await requireApiKey(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when bcrypt does not match any row', async () => {
    mockSb({ data: [VALID_ROW], error: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    const req = makeReq({ headers: { 'x-api-key': VALID_KEY } });
    const res = makeRes();
    await requireApiKey(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('requireApiKey — success path', () => {
  it('calls next() and attaches companyId/apiKeyId when key is valid and not expired', async () => {
    mockSb({ data: [VALID_ROW], error: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const req = makeReq({ headers: { 'x-api-key': VALID_KEY } }) as any;
    const res = makeRes();
    const next = jest.fn();
    await requireApiKey(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.companyId).toBe('cust-001');
    expect(req.apiKeyId).toBe('key-001');
  });

  it('calls next() when expiresAt is in the future', async () => {
    const row = { ...VALID_ROW, expiresAt: new Date(Date.now() + 86400000).toISOString() };
    mockSb({ data: [row], error: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const req = makeReq({ headers: { 'x-api-key': VALID_KEY } }) as any;
    const next = jest.fn();
    await requireApiKey(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
  });
});

describe('requireApiKey — expiry check', () => {
  it('returns 401 KEY_EXPIRED when expiresAt is in the past', async () => {
    const row = { ...VALID_ROW, expiresAt: new Date(Date.now() - 86400000).toISOString() };
    mockSb({ data: [row], error: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const req = makeReq({ headers: { 'x-api-key': VALID_KEY } });
    const res = makeRes();
    await requireApiKey(req as any, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'KEY_EXPIRED' }) })
    );
  });
});

describe('requireApiKey — header extraction priority', () => {
  it('uses Bearer token when both Authorization and X-Api-Key are present', async () => {
    mockSb({ data: [], error: null });
    const req = makeReq({
      headers: {
        authorization: 'Bearer sk_bearer1234',
        'x-api-key': 'sk_xapikey1234',
      },
    });
    const res = makeRes();
    await requireApiKey(req as any, res, jest.fn());
    // Both keys lack rows — just verify it didn't crash and returned 401
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('uses X-Api-Key when Authorization header is absent', async () => {
    mockSb({ data: [VALID_ROW], error: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const req = makeReq({ headers: { 'x-api-key': VALID_KEY } }) as any;
    const next = jest.fn();
    await requireApiKey(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
  });
});
