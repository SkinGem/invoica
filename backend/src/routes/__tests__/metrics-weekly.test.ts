jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import metricsRouter from '../metrics';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(metricsRouter);
  app.use((err: Error, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error: { message: err.message } });
  });
  return app;
}

function buildMockChain(resolveWith: any) {
  const chain: any = {
    select: jest.fn(),
    gte:    jest.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.gte.mockResolvedValue(resolveWith);
  return chain;
}

describe('GET /v1/metrics/weekly', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  test('200 returns-12-weeks — response has exactly 12 weekly buckets', async () => {
    const chain = buildMockChain({ data: [], error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue(chain) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/metrics/weekly');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(12);
  });

  test('200 has-week-field — each entry has a week field in ISO format (YYYY-Www)', async () => {
    const chain = buildMockChain({ data: [], error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue(chain) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/metrics/weekly');
    expect(res.status).toBe(200);
    const first = res.body.data[0];
    expect(first).toHaveProperty('week');
    expect(typeof first.week).toBe('string');
    expect(first.week).toMatch(/^\d{4}-W\d{2}$/);
  });

  test('200 has-count-field — each entry has count and amount fields', async () => {
    const chain = buildMockChain({ data: [], error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue(chain) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/metrics/weekly');
    expect(res.status).toBe(200);
    const first = res.body.data[0];
    expect(first).toHaveProperty('count');
    expect(first).toHaveProperty('amount');
  });

  test('200 zeros-for-empty-weeks — empty DB returns 12 weeks all with zero counts', async () => {
    const chain = buildMockChain({ data: [], error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue(chain) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/metrics/weekly');
    expect(res.status).toBe(200);
    const totalCount = res.body.data.reduce((s: number, d: any) => s + d.count, 0);
    expect(totalCount).toBe(0);
  });

  test('500 db-error — returns 500 when DB query fails', async () => {
    const chain = buildMockChain({ data: null, error: new Error('DB down') });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue(chain) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/metrics/weekly');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
