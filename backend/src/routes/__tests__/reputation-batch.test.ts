jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import reputationRouter from '../reputation';

const mockCreateClient = createClient as jest.Mock;

const AGENTS = [
  { agentId: 'agent-001', score: 90, tier: 'platinum' },
  { agentId: 'agent-002', score: 75, tier: 'gold' },
];

function buildApp(data: any[], error: any = null) {
  const query: any = {
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockResolvedValue({ data, error }),
  };
  mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue(query) });
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  const app = express();
  app.use(express.json());
  app.use(reputationRouter);
  return app;
}

describe('POST /v1/reputation/batch', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 returns array of reputation records for valid agentIds', async () => {
    const app = buildApp(AGENTS);
    const res = await request(app)
      .post('/v1/reputation/batch')
      .send({ agentIds: ['agent-001', 'agent-002'] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].agentId).toBe('agent-001');
    expect(res.body.data[0].score).toBe(90);
    expect(res.body.data[0].tier).toBe('platinum');
  });

  test('200 returns empty array when no matching agents found', async () => {
    const app = buildApp([]);
    const res = await request(app)
      .post('/v1/reputation/batch')
      .send({ agentIds: ['unknown-agent'] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  test('400 when agentIds is missing from body', async () => {
    const app = buildApp([]);
    const res = await request(app)
      .post('/v1/reputation/batch')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  test('400 when agentIds exceeds 50 items', async () => {
    const app = buildApp([]);
    const agentIds = Array.from({ length: 51 }, (_, i) => `agent-${i}`);
    const res = await request(app)
      .post('/v1/reputation/batch')
      .send({ agentIds });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('LIMIT_EXCEEDED');
  });

  test('500 on database error', async () => {
    const app = buildApp(null as any, new Error('DB connection failed'));
    const res = await request(app)
      .post('/v1/reputation/batch')
      .send({ agentIds: ['agent-001'] });
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('DB_ERROR');
  });
});
