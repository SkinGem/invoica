jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import metricsRouter from '../metrics';

const mockCreateClient = createClient as jest.Mock;

function buildApp(
  invoices: any[],
  settlements: any[],
  reputation: any[],
  error: any = null
) {
  const makeQuery = (data: any[]) => ({
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    mockResult: Promise.resolve({ data: error ? null : data, error }),
    then(res: any, rej: any) { return this.mockResult.then(res, rej); },
  });

  const fromMock = jest.fn()
    .mockReturnValueOnce(makeQuery(invoices))
    .mockReturnValueOnce(makeQuery(settlements))
    .mockReturnValueOnce(makeQuery(reputation));

  mockCreateClient.mockReturnValue({ from: fromMock });
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

  const app = express();
  app.use(metricsRouter);
  return app;
}

const INVOICES = [
  { status: 'PENDING' },
  { status: 'PENDING' },
  { status: 'PROCESSING' },
  { status: 'SETTLED' },
  { status: 'COMPLETED' },
];
const SETTLEMENTS_LAST7 = [{ id: 'inv-1' }, { id: 'inv-2' }];
const AGENTS = [
  { agentId: 'agent-1', score: 80 },
  { agentId: 'agent-2', score: 60 },
];

describe('GET /v1/metrics', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 with correct invoice totals and byStatus', async () => {
    const app = buildApp(INVOICES, SETTLEMENTS_LAST7, AGENTS);
    const res = await request(app).get('/v1/metrics');
    expect(res.status).toBe(200);
    expect(res.body.invoices.total).toBe(5);
    expect(res.body.invoices.byStatus.PENDING).toBe(2);
    expect(res.body.invoices.byStatus.PROCESSING).toBe(1);
    expect(res.body.invoices.byStatus.SETTLED).toBe(1);
    expect(res.body.invoices.byStatus.COMPLETED).toBe(1);
  });

  test('200 with correct settlement totals', async () => {
    const app = buildApp(INVOICES, SETTLEMENTS_LAST7, AGENTS);
    const res = await request(app).get('/v1/metrics');
    expect(res.body.settlements.total).toBe(2); // SETTLED + COMPLETED
    expect(res.body.settlements.last7Days).toBe(2);
  });

  test('200 with correct reputation summary', async () => {
    const app = buildApp(INVOICES, SETTLEMENTS_LAST7, AGENTS);
    const res = await request(app).get('/v1/metrics');
    expect(res.body.reputation.agents).toBe(2);
    expect(res.body.reputation.avgScore).toBe(70);
  });

  test('200 with zeros when all tables empty', async () => {
    const app = buildApp([], [], []);
    const res = await request(app).get('/v1/metrics');
    expect(res.status).toBe(200);
    expect(res.body.invoices.total).toBe(0);
    expect(res.body.settlements.total).toBe(0);
    expect(res.body.settlements.last7Days).toBe(0);
    expect(res.body.reputation.agents).toBe(0);
    expect(res.body.reputation.avgScore).toBe(0);
  });

  test('500 on database error', async () => {
    const app = buildApp([], [], [], new Error('DB failure'));
    const res = await request(app).get('/v1/metrics');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});
