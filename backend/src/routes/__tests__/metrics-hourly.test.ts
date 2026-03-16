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

describe('GET /v1/metrics/hourly', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  test('200 returns-24-hours — response has exactly 24 hourly buckets', async () => {
    const chain = buildMockChain({ data: [], error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue(chain) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/metrics/hourly');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(24);
  });

  test('200 has-hour-field — each entry has an hour field (ISO string)', async () => {
    const chain = buildMockChain({ data: [], error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue(chain) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/metrics/hourly');
    expect(res.status).toBe(200);
    const first = res.body.data[0];
    expect(first).toHaveProperty('hour');
    expect(typeof first.hour).toBe('string');
    expect(first.hour).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/);
  });

  test('200 has-count-field — each entry has count and amount fields', async () => {
    const chain = buildMockChain({ data: [], error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue(chain) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/metrics/hourly');
    expect(res.status).toBe(200);
    const first = res.body.data[0];
    expect(first).toHaveProperty('count');
    expect(first).toHaveProperty('amount');
  });

  test('200 zeros-for-empty-hours — empty DB returns 24 zeros', async () => {
    const chain = buildMockChain({ data: [], error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue(chain) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/metrics/hourly');
    expect(res.status).toBe(200);
    const totalCount = res.body.data.reduce((s: number, d: any) => s + d.count, 0);
    expect(totalCount).toBe(0);
  });

  test('500 db-error — returns 500 when DB query fails', async () => {
    const chain = buildMockChain({ data: null, error: new Error('DB down') });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue(chain) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/metrics/hourly');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
