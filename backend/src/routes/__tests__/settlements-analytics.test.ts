jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import settlementsRouter from '../settlements';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

function buildApp(selectResult: any) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

  mockCreateClient.mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue(selectResult),
      }),
    }),
  } as any);

  const app = express();
  app.use(express.json());
  app.use(settlementsRouter);
  app.use((err: Error, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error: { message: err.message } });
  });
  return app;
}

describe('GET /v1/settlements/analytics', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 returns-shape — success:true with total, totalAmount, avgAmount, minAmount, maxAmount', async () => {
    const app = buildApp({ data: [{ amount: 100 }, { amount: 200 }], error: null });
    const res = await request(app).get('/v1/settlements/analytics');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const d = res.body.data;
    expect(d).toHaveProperty('total');
    expect(d).toHaveProperty('totalAmount');
    expect(d).toHaveProperty('avgAmount');
    expect(d).toHaveProperty('minAmount');
    expect(d).toHaveProperty('maxAmount');
  });

  test('200 correct-aggregates — total=3, totalAmount=600, avgAmount=200, min=100, max=300', async () => {
    const app = buildApp({ data: [{ amount: 100 }, { amount: 200 }, { amount: 300 }], error: null });
    const res = await request(app).get('/v1/settlements/analytics');
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.total).toBe(3);
    expect(d.totalAmount).toBe(600);
    expect(d.avgAmount).toBe(200);
    expect(d.minAmount).toBe(100);
    expect(d.maxAmount).toBe(300);
  });

  test('200 empty-state — zero settled invoices returns all zeros', async () => {
    const app = buildApp({ data: [], error: null });
    const res = await request(app).get('/v1/settlements/analytics');
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.total).toBe(0);
    expect(d.totalAmount).toBe(0);
    expect(d.avgAmount).toBe(0);
    expect(d.minAmount).toBe(0);
    expect(d.maxAmount).toBe(0);
  });

  test('200 single-item — min and max equal the only item amount', async () => {
    const app = buildApp({ data: [{ amount: 500 }], error: null });
    const res = await request(app).get('/v1/settlements/analytics');
    expect(res.status).toBe(200);
    expect(res.body.data.minAmount).toBe(500);
    expect(res.body.data.maxAmount).toBe(500);
  });

  test('500 db-error — returns 500 when DB query fails', async () => {
    const app = buildApp({ data: null, error: new Error('DB down') });
    const res = await request(app).get('/v1/settlements/analytics');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
