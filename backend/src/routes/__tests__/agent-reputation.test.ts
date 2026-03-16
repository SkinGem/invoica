jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import agentRouter from '../agents';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(agentRouter);
  app.use((err: Error, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error: { message: err.message } });
  });
  return app;
}

const REPUTATION = {
  agentId: 'agent-1',
  score: 850,
  tier: 'gold',
  disputeRate: 0.02,
  completionRate: 0.97,
  updatedAt: '2026-03-16T10:00:00Z',
};

function buildMockChain(resolveWith: any) {
  const chain: any = {
    eq: jest.fn(),
    maybeSingle: jest.fn(),
  };
  chain.eq.mockReturnValue(chain);
  chain.maybeSingle.mockResolvedValue(resolveWith);
  return chain;
}

describe('GET /v1/agents/:agentId/reputation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  test('200 returns-shape — response has success and data object', async () => {
    const chain = buildMockChain({ data: REPUTATION, error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/agents/agent-1/reputation');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('200 has-score — returned data has a numeric score', async () => {
    const chain = buildMockChain({ data: REPUTATION, error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/agents/agent-1/reputation');
    expect(typeof res.body.data.score).toBe('number');
    expect(res.body.data.score).toBe(850);
  });

  test('200 has-tier — returned data has a tier string', async () => {
    const chain = buildMockChain({ data: REPUTATION, error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/agents/agent-1/reputation');
    expect(typeof res.body.data.tier).toBe('string');
    expect(res.body.data.tier).toBe('gold');
  });

  test('404 not-found — returns 404 when no reputation record exists', async () => {
    const chain = buildMockChain({ data: null, error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/agents/agent-none/reputation');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('500 db-error — returns 500 when DB query fails', async () => {
    const chain = buildMockChain({ data: null, error: new Error('DB down') });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/agents/agent-1/reputation');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
