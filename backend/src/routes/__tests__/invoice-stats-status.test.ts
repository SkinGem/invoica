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

  const selectChain: any = {
    select: jest.fn().mockResolvedValue(selectResult),
  };

  mockCreateClient.mockReturnValue({
    from: jest.fn().mockReturnValue(selectChain),
  } as any);

  const app = express();
  app.use(express.json());
  app.use(invoiceRouter);
  app.use((err: Error, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error: { message: err.message } });
  });
  return app;
}

describe('GET /v1/invoices/stats/status', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 returns-shape — returns success:true with data.total and data.byStatus', async () => {
    const rows = [{ status: 'PENDING' }, { status: 'SETTLED' }, { status: 'COMPLETED' }];
    const app = buildApp({ data: rows, error: null });
    const res = await request(app).get('/v1/invoices/stats/status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('byStatus');
  });

  test('200 has-total — total equals number of invoices', async () => {
    const rows = [{ status: 'PENDING' }, { status: 'PENDING' }, { status: 'SETTLED' }];
    const app = buildApp({ data: rows, error: null });
    const res = await request(app).get('/v1/invoices/stats/status');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(3);
  });

  test('200 has-by-status — byStatus has all expected status keys with correct counts', async () => {
    const rows = [
      { status: 'PENDING' }, { status: 'PENDING' },
      { status: 'SETTLED' },
      { status: 'COMPLETED' },
      { status: 'CANCELLED' },
    ];
    const app = buildApp({ data: rows, error: null });
    const res = await request(app).get('/v1/invoices/stats/status');
    expect(res.status).toBe(200);
    const { byStatus } = res.body.data;
    expect(byStatus.PENDING).toBe(2);
    expect(byStatus.SETTLED).toBe(1);
    expect(byStatus.COMPLETED).toBe(1);
    expect(byStatus.CANCELLED).toBe(1);
    expect(typeof byStatus.PROCESSING).toBe('number');
  });

  test('200 zero-when-empty — all counts are 0 when no invoices exist', async () => {
    const app = buildApp({ data: [], error: null });
    const res = await request(app).get('/v1/invoices/stats/status');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
    const { byStatus } = res.body.data;
    for (const key of ['PENDING', 'PROCESSING', 'SETTLED', 'COMPLETED', 'CANCELLED', 'REFUNDED']) {
      expect(byStatus[key]).toBe(0);
    }
  });

  test('500 db-error — returns 500 when DB query fails', async () => {
    const app = buildApp({ data: null, error: new Error('DB down') });
    const res = await request(app).get('/v1/invoices/stats/status');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
