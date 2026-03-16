jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import metricsRouter from '../metrics';

const mockCreateClient = createClient as jest.Mock;

const INVOICES = [
  { status: 'COMPLETED', amount: 300 },
  { status: 'SETTLED', amount: 200 },
  { status: 'PENDING', amount: 100 },
];
const REPUTATION = { score: 85, tier: 'gold' };

function buildApp(invoices: any[], rep: any, repError: any = null) {
  const invoiceQuery: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ data: invoices, error: null }),
  };
  const repQuery: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: rep, error: repError }),
  };
  const fromMock = jest.fn()
    .mockReturnValueOnce(invoiceQuery)
    .mockReturnValueOnce(repQuery);
  mockCreateClient.mockReturnValue({ from: fromMock });
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  const app = express();
  app.use(metricsRouter);
  return app;
}

describe('GET /v1/metrics/agent/:agentId', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 returns agentId, invoices, totalValueSettled, reputation', async () => {
    const app = buildApp(INVOICES, REPUTATION);
    const res = await request(app).get('/v1/metrics/agent/agent-001');
    expect(res.status).toBe(200);
    expect(res.body.agentId).toBe('agent-001');
    expect(res.body.invoices.total).toBe(3);
    expect(res.body.invoices.byStatus.COMPLETED).toBe(1);
    expect(res.body.invoices.byStatus.SETTLED).toBe(1);
    expect(res.body.invoices.byStatus.PENDING).toBe(1);
    expect(res.body.totalValueSettled).toBe(500);
    expect(res.body.reputation.score).toBe(85);
    expect(res.body.reputation.tier).toBe('gold');
  });

  test('200 with reputation null when agent has no reputation record', async () => {
    const app = buildApp(INVOICES, null, { message: 'not found' });
    const res = await request(app).get('/v1/metrics/agent/new-agent');
    expect(res.status).toBe(200);
    expect(res.body.reputation).toBeNull();
  });

  test('200 with zero totals for agent with no invoices', async () => {
    const app = buildApp([], null);
    const res = await request(app).get('/v1/metrics/agent/empty-agent');
    expect(res.status).toBe(200);
    expect(res.body.invoices.total).toBe(0);
    expect(res.body.totalValueSettled).toBe(0);
  });

  test('500 on invoice query error', async () => {
    const invoiceQuery: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: new Error('DB fail') }),
    };
    const repQuery: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn() };
    (mockCreateClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValueOnce(invoiceQuery).mockReturnValueOnce(repQuery) });
    const app = express();
    app.use(metricsRouter);
    const res = await request(app).get('/v1/metrics/agent/agent-x');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});
