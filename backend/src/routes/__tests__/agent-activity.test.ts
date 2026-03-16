jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import agentRouter from '../agents';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(agentRouter);
  app.use((err: Error, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error: { message: err.message } });
  });
  return app;
}

const ACTIVITY = [
  { id: 'inv-1', status: 'SETTLED',   amount: 100, currency: 'USD', createdAt: '2026-03-16T10:00:00Z' },
  { id: 'inv-2', status: 'PENDING',   amount: 50,  currency: 'USD', createdAt: '2026-03-15T10:00:00Z' },
];

function buildMockChain(resolveWith: any) {
  const chain: any = {
    eq: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
  };
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.limit.mockResolvedValue(resolveWith);
  return chain;
}

describe('GET /v1/agents/:agentId/activity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  test('200 returns-array — response has success and data array', async () => {
    const chain = buildMockChain({ data: ACTIVITY, error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/agents/agent-1/activity');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('200 limit-respected — limit query param is applied (capped at 20)', async () => {
    const chain = buildMockChain({ data: ACTIVITY, error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/agents/agent-1/activity?limit=5');
    expect(res.status).toBe(200);
    // Verify limit was called with 5 (capped at 20 since 5<20)
    expect(chain.limit).toHaveBeenCalledWith(5);
  });

  test('200 empty-when-no-activity — returns empty array when no invoices found', async () => {
    const chain = buildMockChain({ data: [], error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/agents/agent-none/activity');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  test('200 has-required-fields — each entry has id, status, amount, currency, createdAt', async () => {
    const chain = buildMockChain({ data: ACTIVITY, error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/agents/agent-1/activity');
    const first = res.body.data[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('status');
    expect(first).toHaveProperty('amount');
    expect(first).toHaveProperty('currency');
    expect(first).toHaveProperty('createdAt');
  });

  test('500 db-error — returns 500 when DB query fails', async () => {
    const chain = buildMockChain({ data: null, error: new Error('DB down') });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/agents/agent-1/activity');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
