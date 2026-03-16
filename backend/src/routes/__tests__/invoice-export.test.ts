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
    order:  jest.fn().mockReturnThis(),
    eq:     jest.fn().mockResolvedValue(selectResult),
  };
  // When no status filter: order resolves directly
  chain.order.mockImplementation((..._args: any[]) => ({
    ...chain,
    then: (resolve: any) => Promise.resolve(selectResult).then(resolve),
    catch: (reject: any) => Promise.resolve(selectResult).catch(reject),
  }));

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

describe('GET /v1/invoices/export.csv', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 returns-csv — responds with text/csv content type', async () => {
    const rows = [
      { id: 'inv-1', invoiceNumber: 'INV-001', status: 'SETTLED', amount: 100, currency: 'USDC', customerEmail: 'a@b.com', customerName: 'Alice', createdAt: '2026-03-01T00:00:00Z', settledAt: '2026-03-02T00:00:00Z' },
    ];
    const app = buildApp({ data: rows, error: null });
    const res = await request(app).get('/v1/invoices/export.csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/invoices\.csv/);
  });

  test('200 has-headers — CSV contains expected column headers', async () => {
    const app = buildApp({ data: [], error: null });
    const res = await request(app).get('/v1/invoices/export.csv');
    expect(res.status).toBe(200);
    const firstLine = res.text.split('\n')[0];
    expect(firstLine).toBe('id,invoiceNumber,status,amount,currency,customerEmail,customerName,createdAt,settledAt');
  });

  test('200 empty-csv — returns only headers when no invoices exist', async () => {
    const app = buildApp({ data: [], error: null });
    const res = await request(app).get('/v1/invoices/export.csv');
    expect(res.status).toBe(200);
    const lines = res.text.split('\n').filter(Boolean);
    expect(lines).toHaveLength(1); // only header
  });

  test('200 respects-status-filter — accepts ?status= query parameter', async () => {
    const rows = [
      { id: 'inv-2', invoiceNumber: 'INV-002', status: 'PENDING', amount: 50, currency: 'USDC', customerEmail: 'b@c.com', customerName: 'Bob', createdAt: '2026-03-01T00:00:00Z', settledAt: null },
    ];
    const app = buildApp({ data: rows, error: null });
    const res = await request(app).get('/v1/invoices/export.csv?status=PENDING');
    expect(res.status).toBe(200);
    expect(res.text).toContain('PENDING');
    expect(res.text).toContain('INV-002');
  });

  test('500 db-error — returns 500 when DB query fails', async () => {
    const app = buildApp({ data: null, error: new Error('DB down') });
    const res = await request(app).get('/v1/invoices/export.csv');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
