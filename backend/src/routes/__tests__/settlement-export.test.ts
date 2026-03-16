jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import settlementsRouter from '../settlements';

const mockCreateClient = createClient as jest.Mock;

const SETTLED_ROWS = [
  { id: '1', invoiceNumber: 1, agentId: 'agent-a', amount: 100, currency: 'USD', paymentDetails: { network: 'base-mainnet', txHash: '0xabc' }, createdAt: '2026-03-01T10:00:00Z', settledAt: '2026-03-01T10:05:00Z' },
  { id: '2', invoiceNumber: 2, agentId: 'agent-b', amount: 250, currency: 'ETH', paymentDetails: { network: 'ethereum', txHash: '0xdef' }, createdAt: '2026-03-02T10:00:00Z', settledAt: '2026-03-02T10:10:00Z' },
];

function buildApp(data: any[], error: any = null) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

  mockCreateClient.mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data, error }),
      eq: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
    }),
  });

  const app = express();
  app.use(settlementsRouter);
  app.use((err: Error, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error: { message: err.message } });
  });
  return app;
}

describe('GET /v1/settlements/export.csv', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 returns-csv — response is text/csv', async () => {
    const app = buildApp(SETTLED_ROWS);
    const res = await request(app).get('/v1/settlements/export.csv');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/text\/csv/);
  });

  test('200 csv-has-headers — first line contains expected column headers', async () => {
    const app = buildApp(SETTLED_ROWS);
    const res = await request(app).get('/v1/settlements/export.csv');
    const lines = res.text.replace(/^\uFEFF/, '').split('\n');
    expect(lines[0]).toBe('Date,Invoice#,AgentId,Amount,Currency,Network,TxHash');
  });

  test('200 csv-data-rows — data rows match settled invoice count', async () => {
    const app = buildApp(SETTLED_ROWS);
    const res = await request(app).get('/v1/settlements/export.csv');
    const lines = res.text.replace(/^\uFEFF/, '').split('\n').filter(Boolean);
    expect(lines).toHaveLength(3); // 1 header + 2 data rows
    expect(lines[1]).toContain('agent-a');
    expect(lines[2]).toContain('agent-b');
  });

  test('200 content-type-header — Content-Disposition is set for download', async () => {
    const app = buildApp(SETTLED_ROWS);
    const res = await request(app).get('/v1/settlements/export.csv');
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(res.headers['content-disposition']).toMatch(/settlements\.csv/);
  });

  test('500 db-error — returns 500 on database failure', async () => {
    const app = buildApp(null as any, new Error('DB down'));
    const res = await request(app).get('/v1/settlements/export.csv');
    expect(res.status).toBe(500);
  });
});
