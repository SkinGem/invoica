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

const ROWS = [
  { amount: 100, paymentDetails: { chain: 'base' } },
  { amount: 200, paymentDetails: { chain: 'base' } },
  { amount: 300, paymentDetails: { chain: 'polygon' } },
  { amount: 400, paymentDetails: { chain: 'base' } },
  { amount: 150, paymentDetails: { chain: 'solana' } },
];

describe('GET /v1/metrics/chains', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  test('200 returns-array — response has success and data array', async () => {
    mockCreateClient.mockReturnValue({
      from: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ data: ROWS, error: null }) }),
    } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/metrics/chains');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('200 sorted-by-count — data sorted by invoiceCount descending', async () => {
    mockCreateClient.mockReturnValue({
      from: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ data: ROWS, error: null }) }),
    } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/metrics/chains');
    const data = res.body.data;
    expect(data[0].chain).toBe('base');
    expect(data[0].invoiceCount).toBe(3);
    expect(data[1].invoiceCount).toBeLessThanOrEqual(data[0].invoiceCount);
  });

  test('200 has-total-amount — each entry has totalAmount number', async () => {
    mockCreateClient.mockReturnValue({
      from: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ data: ROWS, error: null }) }),
    } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/metrics/chains');
    expect(res.body.data[0].totalAmount).toBe(700); // 100+200+400
    expect(res.body.data.every((d: any) => typeof d.totalAmount === 'number')).toBe(true);
  });

  test('200 empty-state — returns empty array when no invoices', async () => {
    mockCreateClient.mockReturnValue({
      from: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ data: [], error: null }) }),
    } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/metrics/chains');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  test('500 db-error — returns 500 when DB query fails', async () => {
    mockCreateClient.mockReturnValue({
      from: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ data: null, error: new Error('DB down') }) }),
    } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/metrics/chains');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
