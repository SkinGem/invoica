jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import invoiceRouter from '../invoices';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

function buildApp(selectResult: any) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

  const chain: any = {
    select: jest.fn().mockReturnThis(),
    in:     jest.fn().mockResolvedValue(selectResult),
  };

  mockCreateClient.mockReturnValue({
    from: jest.fn().mockReturnValue(chain),
  } as any);

  const app = express();
  app.use(express.json());
  app.use(invoiceRouter);
  app.use((err: Error, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error: { message: err.message } });
  });
  return app;
}

describe('GET /v1/invoices/stats/void', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 returns-shape — returns success:true with total, totalAmount, last24h, last7d', async () => {
    const rows = [
      { amount: 100, status: 'CANCELLED', updatedAt: new Date().toISOString() },
      { amount: 50,  status: 'REFUNDED',  updatedAt: new Date().toISOString() },
    ];
    const app = buildApp({ data: rows, error: null });
    const res = await request(app).get('/v1/invoices/stats/void');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('totalAmount');
    expect(res.body.data).toHaveProperty('last24h');
    expect(res.body.data).toHaveProperty('last7d');
  });

  test('200 has-total — total equals count of cancelled+refunded invoices', async () => {
    const rows = [
      { amount: 100, status: 'CANCELLED', updatedAt: new Date().toISOString() },
      { amount: 75,  status: 'CANCELLED', updatedAt: new Date().toISOString() },
      { amount: 25,  status: 'REFUNDED',  updatedAt: new Date().toISOString() },
    ];
    const app = buildApp({ data: rows, error: null });
    const res = await request(app).get('/v1/invoices/stats/void');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(3);
  });

  test('200 has-total-amount — totalAmount sums all void invoice amounts', async () => {
    const rows = [
      { amount: 200, status: 'CANCELLED', updatedAt: new Date().toISOString() },
      { amount: 300, status: 'REFUNDED',  updatedAt: new Date().toISOString() },
    ];
    const app = buildApp({ data: rows, error: null });
    const res = await request(app).get('/v1/invoices/stats/void');
    expect(res.status).toBe(200);
    expect(res.body.data.totalAmount).toBe(500);
  });

  test('200 zero-when-empty — returns zeros when no void invoices', async () => {
    const app = buildApp({ data: [], error: null });
    const res = await request(app).get('/v1/invoices/stats/void');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.totalAmount).toBe(0);
    expect(res.body.data.last24h.count).toBe(0);
    expect(res.body.data.last7d.count).toBe(0);
  });

  test('500 db-error — returns 500 when DB query fails', async () => {
    const app = buildApp({ data: null, error: new Error('DB down') });
    const res = await request(app).get('/v1/invoices/stats/void');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
