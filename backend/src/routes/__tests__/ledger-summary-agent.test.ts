jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import ledgerRouter from '../ledger';

const mockCreateClient = createClient as jest.Mock;

function buildApp(data: any[], error: any = null) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

  mockCreateClient.mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data, error }),
    }),
  });

  const app = express();
  app.use(ledgerRouter);
  return app;
}

describe('GET /v1/ledger/summary/:agentId', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 with-entries — returns debit, credit, net, txCount, currency', async () => {
    const data = [
      { status: 'SETTLED', amount: 200, currency: 'USD' },
      { status: 'PENDING', amount: 50, currency: 'USD' },
      { status: 'REFUNDED', amount: 30, currency: 'USD' },
    ];
    const app = buildApp(data);
    const res = await request(app).get('/v1/ledger/summary/agent-001');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.agentId).toBe('agent-001');
    expect(res.body.data.debit).toBe(250);
    expect(res.body.data.credit).toBe(30);
    expect(res.body.data.net).toBe(-220);
    expect(res.body.data.txCount).toBe(3);
    expect(res.body.data.currency).toBe('USD');
  });

  test('200 returns-net — net is credit minus debit', async () => {
    const data = [
      { status: 'COMPLETED', amount: 100, currency: 'ETH' },
      { status: 'REFUNDED', amount: 150, currency: 'ETH' },
    ];
    const app = buildApp(data);
    const res = await request(app).get('/v1/ledger/summary/agent-002');
    expect(res.body.data.net).toBe(50); // 150 - 100
  });

  test('200 currency-from-first-entry — currency taken from first row', async () => {
    const data = [
      { status: 'PENDING', amount: 10, currency: 'SOL' },
    ];
    const app = buildApp(data);
    const res = await request(app).get('/v1/ledger/summary/agent-003');
    expect(res.body.data.currency).toBe('SOL');
  });

  test('404 not-found — returns 404 when no invoices exist for agentId', async () => {
    const app = buildApp([]);
    const res = await request(app).get('/v1/ledger/summary/unknown-agent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('500 db-error — returns 500 on database failure', async () => {
    const app = buildApp(null as any, new Error('DB crash'));
    const res = await request(app).get('/v1/ledger/summary/agent-x');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('DB_ERROR');
  });
});
