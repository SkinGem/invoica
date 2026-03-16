jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import settlementsRouter from '../settlements';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(settlementsRouter);
  app.use((err: Error, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error: { message: err.message } });
  });
  return app;
}

const SETTLEMENTS = [
  { id: 's-1', invoiceNumber: 1, amount: 500,  currency: 'USDC', agentId: 'agent-a', settledAt: '2026-03-16T10:00:00Z', updatedAt: '2026-03-16T10:00:00Z' },
  { id: 's-2', invoiceNumber: 2, amount: 1000, currency: 'ETH',  agentId: 'agent-b', settledAt: '2026-03-15T10:00:00Z', updatedAt: '2026-03-15T10:00:00Z' },
];

function buildMockChain(resolveWith: any) {
  const chain: any = {
    select: jest.fn(),
    in:     jest.fn(),
    order:  jest.fn(),
    limit:  jest.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.limit.mockResolvedValue(resolveWith);
  return chain;
}

describe('GET /v1/settlements/recent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  test('200 returns-array — response has success and data array', async () => {
    const chain = buildMockChain({ data: SETTLEMENTS, error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue(chain) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/settlements/recent');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
  });

  test('200 respects-limit — limit query param is passed to DB', async () => {
    const chain = buildMockChain({ data: SETTLEMENTS, error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue(chain) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/settlements/recent?limit=5');
    expect(res.status).toBe(200);
    expect(chain.limit).toHaveBeenCalledWith(5);
  });

  test('200 max-limit-50 — limit capped at 50 regardless of query param', async () => {
    const chain = buildMockChain({ data: SETTLEMENTS, error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue(chain) } as any);
    const app = buildApp();
    await request(app).get('/v1/settlements/recent?limit=999');
    expect(chain.limit).toHaveBeenCalledWith(50);
  });

  test('200 empty-state — returns empty array when no settlements', async () => {
    const chain = buildMockChain({ data: [], error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue(chain) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/settlements/recent');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  test('500 db-error — returns 500 when DB query fails', async () => {
    const chain = buildMockChain({ data: null, error: new Error('DB down') });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue(chain) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/settlements/recent');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
