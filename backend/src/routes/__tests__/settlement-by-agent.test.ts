jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import settlementsRouter from '../settlements';

const mockCreateClient = createClient as jest.Mock;

function buildApp(data: any[], error: any = null) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

  mockCreateClient.mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data, error }),
      range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      single: jest.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
    }),
  });

  const app = express();
  app.use(settlementsRouter);
  app.use((err: Error, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error: { message: err.message } });
  });
  return app;
}

const SETTLED = [
  { id: 's1', invoiceNumber: 1, status: 'SETTLED', amount: 100, currency: 'USD', paymentDetails: { txHash: '0xabc', network: 'base' }, settledAt: '2026-03-01T10:00:00Z', completedAt: null, createdAt: '2026-03-01T09:00:00Z' },
  { id: 's2', invoiceNumber: 2, status: 'COMPLETED', amount: 200, currency: 'USD', paymentDetails: { txHash: '0xdef', network: 'polygon' }, settledAt: '2026-03-02T10:00:00Z', completedAt: '2026-03-02T10:05:00Z', createdAt: '2026-03-02T09:00:00Z' },
];

describe('GET /v1/settlements/agent/:agentId', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 returns-array — response has data array and meta.total', async () => {
    const app = buildApp(SETTLED);
    const res = await request(app).get('/v1/settlements/agent/agent-001');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(2);
  });

  test('200 total-correct — meta.total matches data length', async () => {
    const app = buildApp([SETTLED[0]]);
    const res = await request(app).get('/v1/settlements/agent/agent-001');
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0].id).toBe('s1');
  });

  test('200 only-settled-statuses — statuses are confirmed or pending (mapped)', async () => {
    const app = buildApp(SETTLED);
    const res = await request(app).get('/v1/settlements/agent/agent-001');
    for (const item of res.body.data) {
      expect(['confirmed', 'pending']).toContain(item.status);
    }
  });

  test('200 empty-agent — returns empty array with total 0', async () => {
    const app = buildApp([]);
    const res = await request(app).get('/v1/settlements/agent/unknown');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  test('500 db-error — returns 500 on database failure', async () => {
    const app = buildApp(null as any, new Error('DB fail'));
    const res = await request(app).get('/v1/settlements/agent/agent-x');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
