jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import invoiceRouter from '../invoices';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(invoiceRouter);
  app.use((err: Error, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error: { message: err.message } });
  });
  return app;
}

const NOW = new Date('2026-03-16T12:00:00.000Z');
const OVERDUE_DATE = new Date(NOW.getTime() - 48 * 60 * 60 * 1000).toISOString(); // 48h ago
const RECENT_DATE = new Date(NOW.getTime() - 1 * 60 * 60 * 1000).toISOString();  // 1h ago

const OVERDUE_INVOICES = [
  { id: 'inv-1', invoiceNumber: 1, status: 'PENDING', amount: 100, currency: 'USD', customerEmail: 'a@b.com', customerName: 'A', companyId: null, paymentDetails: null, settledAt: null, completedAt: null, createdAt: OVERDUE_DATE, updatedAt: OVERDUE_DATE },
  { id: 'inv-2', invoiceNumber: 2, status: 'PENDING', amount: 200, currency: 'USD', customerEmail: 'b@c.com', customerName: 'B', companyId: null, paymentDetails: null, settledAt: null, completedAt: null, createdAt: OVERDUE_DATE, updatedAt: OVERDUE_DATE },
];

function buildMockChain(resolveWith: any) {
  const chain: any = {
    eq: jest.fn(),
    lt: jest.fn(),
    order: jest.fn(),
  };
  chain.eq.mockReturnValue(chain);
  chain.lt.mockReturnValue(chain);
  chain.order.mockResolvedValue(resolveWith);
  return chain;
}

describe('GET /v1/invoices/overdue', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    app = buildApp();
  });

  test('200 returns-array — response has success, data array, and meta', async () => {
    const chain = buildMockChain({ data: OVERDUE_INVOICES, error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const res = await request(app).get('/v1/invoices/overdue');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
  });

  test('200 only-pending — all returned invoices have PENDING status', async () => {
    const chain = buildMockChain({ data: OVERDUE_INVOICES, error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const res = await request(app).get('/v1/invoices/overdue');
    expect(res.body.data.every((inv: any) => inv.status === 'PENDING')).toBe(true);
  });

  test('200 cutoff-in-meta — meta contains cutoffISO string', async () => {
    const chain = buildMockChain({ data: OVERDUE_INVOICES, error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const res = await request(app).get('/v1/invoices/overdue');
    expect(typeof res.body.meta.cutoffISO).toBe('string');
    expect(res.body.meta.total).toBe(2);
  });

  test('200 empty-state — returns empty array when no overdue invoices', async () => {
    const chain = buildMockChain({ data: [], error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const res = await request(app).get('/v1/invoices/overdue');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  test('500 db-error — returns 500 when DB query fails', async () => {
    const chain = buildMockChain({ data: null, error: new Error('DB down') });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const res = await request(app).get('/v1/invoices/overdue');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
