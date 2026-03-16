jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import metricsRouter from '../metrics';

const mockCreateClient = createClient as jest.Mock;

function buildApp(data: any[], error: any = null) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

  mockCreateClient.mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockResolvedValue({ data, error }),
      lte: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  });

  const app = express();
  app.use(metricsRouter);
  return app;
}

// Today's date key for generating test data
const todayKey = new Date().toISOString().slice(0, 10);
const today2 = `${todayKey}T10:00:00Z`;
const today3 = `${todayKey}T11:00:00Z`;

describe('GET /v1/metrics/daily', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 returns-7-days — response has exactly 7 entries', async () => {
    const app = buildApp([]);
    const res = await request(app).get('/v1/metrics/daily');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(7);
  });

  test('200 has-date-field — each entry has a date string in YYYY-MM-DD format', async () => {
    const app = buildApp([]);
    const res = await request(app).get('/v1/metrics/daily');
    for (const entry of res.body.data) {
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test('200 has-invoice-count — each entry has invoiceCount and settlementCount', async () => {
    const app = buildApp([{ status: 'SETTLED', createdAt: today2 }]);
    const res = await request(app).get('/v1/metrics/daily');
    const today = res.body.data.find((d: any) => d.date === todayKey);
    expect(today).toBeDefined();
    expect(today.invoiceCount).toBe(1);
    expect(today.settlementCount).toBe(1);
  });

  test('200 zeros-for-empty-days — days with no data have 0 counts', async () => {
    const app = buildApp([]);
    const res = await request(app).get('/v1/metrics/daily');
    for (const entry of res.body.data) {
      expect(entry.invoiceCount).toBe(0);
      expect(entry.settlementCount).toBe(0);
    }
  });

  test('500 db-error — returns 500 on database failure', async () => {
    const app = buildApp(null as any, new Error('DB fail'));
    const res = await request(app).get('/v1/metrics/daily');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
