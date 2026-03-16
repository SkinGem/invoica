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
      select: jest.fn().mockResolvedValue({ data, error }),
      gte: jest.fn().mockReturnThis(),
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

const INVOICES = [
  { agentId: 'agent-a', amount: 300 },
  { agentId: 'agent-b', amount: 500 },
  { agentId: 'agent-a', amount: 200 },
  { agentId: 'agent-c', amount: 100 },
  { agentId: 'agent-b', amount: 250 },
];

describe('GET /v1/metrics/leaderboard', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 returns-ranked-list — returns array with rank, agentId, totalAmount, invoiceCount', async () => {
    const app = buildApp(INVOICES);
    const res = await request(app).get('/v1/metrics/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toHaveProperty('rank');
    expect(res.body.data[0]).toHaveProperty('agentId');
    expect(res.body.data[0]).toHaveProperty('totalAmount');
    expect(res.body.data[0]).toHaveProperty('invoiceCount');
  });

  test('200 rank-starts-at-1 — first entry has rank 1, sorted by totalAmount desc', async () => {
    const app = buildApp(INVOICES);
    const res = await request(app).get('/v1/metrics/leaderboard');
    expect(res.body.data[0].rank).toBe(1);
    expect(res.body.data[0].agentId).toBe('agent-b'); // 750 total
    expect(res.body.data[1].agentId).toBe('agent-a'); // 500 total
    expect(res.body.data[2].agentId).toBe('agent-c'); // 100 total
  });

  test('200 respects-limit — ?limit=2 returns only top 2', async () => {
    const app = buildApp(INVOICES);
    const res = await request(app).get('/v1/metrics/leaderboard?limit=2');
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[1].rank).toBe(2);
  });

  test('200 empty-state — returns empty array when no invoices', async () => {
    const app = buildApp([]);
    const res = await request(app).get('/v1/metrics/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  test('500 db-error — returns 500 on database failure', async () => {
    const app = buildApp(null as any, new Error('DB fail'));
    const res = await request(app).get('/v1/metrics/leaderboard');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
