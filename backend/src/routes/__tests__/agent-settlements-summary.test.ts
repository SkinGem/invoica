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

const SETTLED_ROWS = [
  { amount: 100, currency: 'USD', status: 'SETTLED' },
  { amount: 200, currency: 'USD', status: 'COMPLETED' },
  { amount: 300, currency: 'EUR', status: 'SETTLED' },
];

function buildMockChain(resolveWith: any) {
  const chain: any = {
    eq: jest.fn(),
    in: jest.fn(),
  };
  chain.eq.mockReturnValue(chain);
  chain.in.mockResolvedValue(resolveWith);
  return chain;
}

describe('GET /v1/agents/:agentId/settlements/summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  test('200 returns-shape — response has agentId, totalSettled, totalAmount, avgAmount, currencies', async () => {
    const chain = buildMockChain({ data: SETTLED_ROWS, error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/agents/agent-1/settlements/summary');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const d = res.body.data;
    expect(d.agentId).toBe('agent-1');
    expect(d).toHaveProperty('totalSettled');
    expect(d).toHaveProperty('totalAmount');
    expect(d).toHaveProperty('avgAmount');
    expect(Array.isArray(d.currencies)).toBe(true);
  });

  test('200 total-correct — totals and avg computed correctly', async () => {
    const chain = buildMockChain({ data: SETTLED_ROWS, error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/agents/agent-1/settlements/summary');
    expect(res.body.data.totalSettled).toBe(3);
    expect(res.body.data.totalAmount).toBe(600);
    expect(res.body.data.avgAmount).toBeCloseTo(200);
  });

  test('200 zero-when-empty — returns zeros and empty currencies when no settlements', async () => {
    const chain = buildMockChain({ data: [], error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/agents/agent-none/settlements/summary');
    expect(res.status).toBe(200);
    expect(res.body.data.totalSettled).toBe(0);
    expect(res.body.data.totalAmount).toBe(0);
    expect(res.body.data.avgAmount).toBe(0);
  });

  test('200 currencies-array — unique currencies extracted correctly', async () => {
    const chain = buildMockChain({ data: SETTLED_ROWS, error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/agents/agent-1/settlements/summary');
    expect(res.body.data.currencies).toContain('USD');
    expect(res.body.data.currencies).toContain('EUR');
    expect(res.body.data.currencies).toHaveLength(2);
  });

  test('500 db-error — returns 500 when DB query fails', async () => {
    const chain = buildMockChain({ data: null, error: new Error('DB down') });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/agents/agent-1/settlements/summary');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
