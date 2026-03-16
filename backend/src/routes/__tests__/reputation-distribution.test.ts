jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import reputationRouter from '../reputation';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

jest.mock('../../services/reputation', () => ({
  computeAndStoreReputation: jest.fn(),
}));

function buildApp(selectResult: any) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

  mockCreateClient.mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(selectResult),
    }),
  } as any);

  const app = express();
  app.use(express.json());
  app.use(reputationRouter);
  app.use((err: Error, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error: { message: err.message } });
  });
  return app;
}

describe('GET /v1/reputation/distribution', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 returns-shape — success:true with total and buckets 0_20 21_40 41_60 61_80 81_100', async () => {
    const app = buildApp({ data: [], error: null });
    const res = await request(app).get('/v1/reputation/distribution');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('buckets');
    const b = res.body.data.buckets;
    expect(b).toHaveProperty('0_20');
    expect(b).toHaveProperty('21_40');
    expect(b).toHaveProperty('41_60');
    expect(b).toHaveProperty('61_80');
    expect(b).toHaveProperty('81_100');
  });

  test('200 buckets-correct — scores 10, 35, 55, 72, 95 land in correct buckets', async () => {
    const rows = [{ score: 10 }, { score: 35 }, { score: 55 }, { score: 72 }, { score: 95 }];
    const app = buildApp({ data: rows, error: null });
    const res = await request(app).get('/v1/reputation/distribution');
    expect(res.status).toBe(200);
    const b = res.body.data.buckets;
    expect(b['0_20']).toBe(1);
    expect(b['21_40']).toBe(1);
    expect(b['41_60']).toBe(1);
    expect(b['61_80']).toBe(1);
    expect(b['81_100']).toBe(1);
    expect(res.body.data.total).toBe(5);
  });

  test('200 empty-state — no agents returns all buckets at 0 and total 0', async () => {
    const app = buildApp({ data: [], error: null });
    const res = await request(app).get('/v1/reputation/distribution');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
    for (const key of ['0_20', '21_40', '41_60', '61_80', '81_100']) {
      expect(res.body.data.buckets[key]).toBe(0);
    }
  });

  test('200 multiple-same-bucket — two high scorers both land in 81_100', async () => {
    const rows = [{ score: 85 }, { score: 99 }];
    const app = buildApp({ data: rows, error: null });
    const res = await request(app).get('/v1/reputation/distribution');
    expect(res.status).toBe(200);
    expect(res.body.data.buckets['81_100']).toBe(2);
  });

  test('500 db-error — returns 500 when DB query fails', async () => {
    const app = buildApp({ data: null, error: new Error('DB down') });
    const res = await request(app).get('/v1/reputation/distribution');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
