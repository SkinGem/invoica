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
    select:  jest.fn().mockReturnThis(),
    eq:      jest.fn().mockReturnThis(),
    gte:     jest.fn().mockReturnThis(),
    lte:     jest.fn().mockReturnThis(),
    or:      jest.fn().mockReturnThis(),
    order:   jest.fn().mockResolvedValue(selectResult),
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

const SAMPLE_INVOICE = {
  id: 'inv-1', invoiceNumber: 'INV-001', status: 'PENDING', amount: 100,
  currency: 'USDC', customerEmail: 'alice@example.com', customerName: 'Alice',
  companyId: null, paymentDetails: null, settledAt: null, completedAt: null,
  createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z',
};

describe('GET /v1/invoices/search/advanced', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 returns-array — returns success:true with data array and meta', async () => {
    const app = buildApp({ data: [SAMPLE_INVOICE], error: null });
    const res = await request(app).get('/v1/invoices/search/advanced');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('limit');
    expect(res.body.meta).toHaveProperty('offset');
  });

  test('200 filters-by-status — accepts ?status= filter', async () => {
    const app = buildApp({ data: [SAMPLE_INVOICE], error: null });
    const res = await request(app).get('/v1/invoices/search/advanced?status=PENDING');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  test('200 filters-by-amount-range — accepts ?minAmount= and ?maxAmount=', async () => {
    const app = buildApp({ data: [SAMPLE_INVOICE], error: null });
    const res = await request(app).get('/v1/invoices/search/advanced?minAmount=50&maxAmount=200');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('200 empty-state — returns empty array when no matches', async () => {
    const app = buildApp({ data: [], error: null });
    const res = await request(app).get('/v1/invoices/search/advanced?status=CANCELLED');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.meta.total).toBe(0);
  });

  test('500 db-error — returns 500 when DB query fails', async () => {
    const app = buildApp({ data: null, error: new Error('DB down') });
    const res = await request(app).get('/v1/invoices/search/advanced');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
