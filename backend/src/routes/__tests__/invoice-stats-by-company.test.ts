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
    select: jest.fn().mockResolvedValue(selectResult),
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

describe('GET /v1/invoices/stats/by-company', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 returns-array — success:true with data as array', async () => {
    const rows = [
      { companyId: 'co-1', amount: 100, status: 'PENDING' },
    ];
    const app = buildApp({ data: rows, error: null });
    const res = await request(app).get('/v1/invoices/stats/by-company');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('200 has-company-id — each entry has companyId, count, totalAmount, settledCount, settledAmount', async () => {
    const rows = [
      { companyId: 'co-1', amount: 200, status: 'SETTLED' },
      { companyId: 'co-1', amount: 100, status: 'PENDING' },
    ];
    const app = buildApp({ data: rows, error: null });
    const res = await request(app).get('/v1/invoices/stats/by-company');
    expect(res.status).toBe(200);
    const entry = res.body.data[0];
    expect(entry).toHaveProperty('companyId', 'co-1');
    expect(entry).toHaveProperty('count', 2);
    expect(entry).toHaveProperty('totalAmount', 300);
    expect(entry).toHaveProperty('settledCount', 1);
    expect(entry).toHaveProperty('settledAmount', 200);
  });

  test('200 sorted-by-amount — results sorted by totalAmount descending', async () => {
    const rows = [
      { companyId: 'low',  amount: 50,  status: 'PENDING' },
      { companyId: 'high', amount: 500, status: 'PENDING' },
      { companyId: 'mid',  amount: 200, status: 'PENDING' },
    ];
    const app = buildApp({ data: rows, error: null });
    const res = await request(app).get('/v1/invoices/stats/by-company');
    expect(res.status).toBe(200);
    const amounts = res.body.data.map((d: any) => d.totalAmount);
    expect(amounts[0]).toBeGreaterThanOrEqual(amounts[1]);
    expect(amounts[1]).toBeGreaterThanOrEqual(amounts[2]);
  });

  test('200 respects-limit — ?limit=1 returns at most 1 company', async () => {
    const rows = [
      { companyId: 'co-1', amount: 100, status: 'PENDING' },
      { companyId: 'co-2', amount: 200, status: 'PENDING' },
      { companyId: 'co-3', amount: 300, status: 'PENDING' },
    ];
    const app = buildApp({ data: rows, error: null });
    const res = await request(app).get('/v1/invoices/stats/by-company?limit=1');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  test('500 db-error — returns 500 when DB query fails', async () => {
    const app = buildApp({ data: null, error: new Error('DB down') });
    const res = await request(app).get('/v1/invoices/stats/by-company');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
