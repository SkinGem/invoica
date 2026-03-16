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

const AGENTS = [
  { agentId: 'agent-1', score: 90, tier: 'platinum', invoicesCompleted: 50, totalValueSettled: 5000, lastUpdated: '2026-03-10T00:00:00Z' },
  { agentId: 'agent-2', score: 70, tier: 'gold', invoicesCompleted: 20, totalValueSettled: 2000, lastUpdated: '2026-03-08T00:00:00Z' },
];

function buildApp(result: { data: any; error: any }) {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
  };
  mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue(chain) });
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  const app = express();
  app.use(reputationRouter);
  return app;
}

describe('GET /x402/oracle/scores', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 returns array of agent scores', async () => {
    const app = buildApp({ data: AGENTS, error: null });
    const res = await request(app).get('/x402/oracle/scores');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  test('200 with empty array when no agents', async () => {
    const app = buildApp({ data: [], error: null });
    const res = await request(app).get('/x402/oracle/scores');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  test('response entries include agentId, score, tier fields', async () => {
    const app = buildApp({ data: AGENTS, error: null });
    const res = await request(app).get('/x402/oracle/scores');
    const entry = res.body.data[0];
    expect(entry).toHaveProperty('agentId', 'agent-1');
    expect(entry).toHaveProperty('score', 90);
    expect(entry).toHaveProperty('tier', 'platinum');
  });

  test('500 on database error', async () => {
    const app = buildApp({ data: null, error: { message: 'DB failure' } });
    const res = await request(app).get('/x402/oracle/scores');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('DB_ERROR');
  });
});
