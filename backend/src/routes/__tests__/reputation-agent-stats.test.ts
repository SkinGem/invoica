jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

jest.mock('../../services/reputation', () => ({
  computeAndStoreReputation: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import reputationRouter from '../reputation';

const mockCreateClient = createClient as jest.Mock;

const FULL_RECORD = {
  agentId: 'agent-001',
  score: 88,
  tier: 'gold',
  invoicesCompleted: 42,
  invoicesDisputed: 2,
  totalValueSettled: 5000,
  lastUpdated: '2026-03-01T00:00:00Z',
};

function buildApp(data: any, error: any = null) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

  mockCreateClient.mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data, error }),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  });

  const app = express();
  app.use(reputationRouter);
  return app;
}

describe('GET /v1/reputation/:agentId/stats', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 returns-full-record — all fields present in response', async () => {
    const app = buildApp(FULL_RECORD);
    const res = await request(app).get('/v1/reputation/agent-001/stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.agentId).toBe('agent-001');
    expect(res.body.data.score).toBe(88);
    expect(res.body.data.tier).toBe('gold');
    expect(res.body.data.invoicesCompleted).toBe(42);
    expect(res.body.data.totalValueSettled).toBe(5000);
  });

  test('200 fields-present — response has all expected keys', async () => {
    const app = buildApp(FULL_RECORD);
    const res = await request(app).get('/v1/reputation/agent-001/stats');
    const d = res.body.data;
    expect(d).toHaveProperty('score');
    expect(d).toHaveProperty('tier');
    expect(d).toHaveProperty('invoicesCompleted');
    expect(d).toHaveProperty('invoicesDisputed');
    expect(d).toHaveProperty('totalValueSettled');
    expect(d).toHaveProperty('lastUpdated');
  });

  test('404 not-found — returns 404 when no record exists', async () => {
    const app = buildApp(null);
    const res = await request(app).get('/v1/reputation/unknown-agent/stats');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('200 score-is-number — score field is a number', async () => {
    const app = buildApp(FULL_RECORD);
    const res = await request(app).get('/v1/reputation/agent-001/stats');
    expect(typeof res.body.data.score).toBe('number');
  });

  test('500 db-error — returns 500 on database failure', async () => {
    const app = buildApp(null, new Error('DB fail'));
    const res = await request(app).get('/v1/reputation/agent-err/stats');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
