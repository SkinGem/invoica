import request from 'supertest';
import express from 'express';

let mockChain: any;

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: jest.fn(() => mockChain) })),
}));

import settlementsRouter from '../settlements';

const app = express();
app.use(settlementsRouter);

function buildChain(data: any[], count = 0) {
  const resolved = Promise.resolve({ data, error: null, count });
  const chain: any = {
    then: (res: any, rej: any) => resolved.then(res, rej),
    catch: (rej: any) => resolved.catch(rej),
  };
  ['select', 'in', 'eq', 'gte', 'lte', 'order', 'range'].forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  return chain;
}

const SETTLED_INV = {
  id: 'inv-1', invoiceNumber: 1, status: 'SETTLED', amount: 100, currency: 'USDC',
  customerEmail: 'a@b.com', customerName: 'Alice', paymentDetails: null,
  settledAt: '2026-03-10T00:00:00Z', completedAt: null, createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z',
};

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('GET /v1/settlements — filter tests', () => {
  test('agentId filter: calls eq(companyId, agentId) on query chain', async () => {
    mockChain = buildChain([SETTLED_INV], 1);
    await request(app).get('/v1/settlements?agentId=agent-abc');
    expect(mockChain.eq).toHaveBeenCalledWith('companyId', 'agent-abc');
  });

  test('from filter: calls gte(settledAt, from) on query chain', async () => {
    mockChain = buildChain([SETTLED_INV], 1);
    await request(app).get('/v1/settlements?from=2026-03-01T00:00:00Z');
    expect(mockChain.gte).toHaveBeenCalledWith('settledAt', '2026-03-01T00:00:00Z');
  });

  test('to filter: calls lte(settledAt, to) on query chain', async () => {
    mockChain = buildChain([SETTLED_INV], 1);
    await request(app).get('/v1/settlements?to=2026-03-31T00:00:00Z');
    expect(mockChain.lte).toHaveBeenCalledWith('settledAt', '2026-03-31T00:00:00Z');
  });

  test('combined agentId+from+to filter: all three applied', async () => {
    mockChain = buildChain([SETTLED_INV], 1);
    await request(app).get('/v1/settlements?agentId=agent-xyz&from=2026-03-01T00:00:00Z&to=2026-03-31T00:00:00Z');
    expect(mockChain.eq).toHaveBeenCalledWith('companyId', 'agent-xyz');
    expect(mockChain.gte).toHaveBeenCalledWith('settledAt', '2026-03-01T00:00:00Z');
    expect(mockChain.lte).toHaveBeenCalledWith('settledAt', '2026-03-31T00:00:00Z');
  });

  test('200 with empty result when no matches', async () => {
    mockChain = buildChain([], 0);
    const res = await request(app).get('/v1/settlements?agentId=no-such-agent');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });
});
