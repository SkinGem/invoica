jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import metricsRouter from '../metrics';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

function buildApp(selectResult: any) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

  mockCreateClient.mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        gte: jest.fn().mockResolvedValue(selectResult),
      }),
    }),
  } as any);

  const app = express();
  app.use(express.json());
  app.use(metricsRouter);
  app.use((err: Error, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error: { message: err.message } });
  });
  return app;
}

describe('GET /v1/metrics/peak-hours', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 returns-shape — success:true with hours array (24 entries) and total', async () => {
    const app = buildApp({ data: [], error: null });
    const res = await request(app).get('/v1/metrics/peak-hours');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('hours');
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data.hours).toHaveLength(24);
  });

  test('200 has-hour-fields — each entry has hour (0-23), count, percentage', async () => {
    const app = buildApp({ data: [], error: null });
    const res = await request(app).get('/v1/metrics/peak-hours');
    expect(res.status).toBe(200);
    const first = res.body.data.hours[0];
    expect(first).toHaveProperty('hour', 0);
    expect(first).toHaveProperty('count');
    expect(first).toHaveProperty('percentage');
    const last = res.body.data.hours[23];
    expect(last).toHaveProperty('hour', 23);
  });

  test('200 correct-count — invoice at UTC hour 14 increments hour-14 count', async () => {
    // Force a UTC time at hour 14
    const d = new Date('2026-03-01T14:30:00.000Z');
    const rows = [{ createdAt: d.toISOString() }, { createdAt: d.toISOString() }];
    const app = buildApp({ data: rows, error: null });
    const res = await request(app).get('/v1/metrics/peak-hours');
    expect(res.status).toBe(200);
    const hour14 = res.body.data.hours.find((h: any) => h.hour === 14);
    expect(hour14.count).toBe(2);
    expect(res.body.data.total).toBe(2);
  });

  test('200 empty-state — no invoices returns 24 zeros with percentage 0', async () => {
    const app = buildApp({ data: [], error: null });
    const res = await request(app).get('/v1/metrics/peak-hours');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
    for (const entry of res.body.data.hours) {
      expect(entry.count).toBe(0);
      expect(entry.percentage).toBe(0);
    }
  });

  test('500 db-error — returns 500 when DB query fails', async () => {
    const app = buildApp({ data: null, error: new Error('DB down') });
    const res = await request(app).get('/v1/metrics/peak-hours');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
