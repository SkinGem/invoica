jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import agentsRouter from '../agents';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

function buildApp(selectResult: any) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

  const chain: any = {
    select: jest.fn().mockResolvedValue(selectResult),
  };

  mockCreateClient.mockReturnValue({
    from: jest.fn().mockReturnValue(chain),
  } as any);

  const app = express();
  app.use(express.json());
  app.use(agentsRouter);
  app.use((err: Error, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error: { message: err.message } });
  });
  return app;
}

describe('GET /v1/agents/activity/summary', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 returns-shape — returns success:true with all required fields', async () => {
    const rows = [
      { agentId: 'ag-1', amount: 100, status: 'SETTLED',   updatedAt: new Date().toISOString() },
      { agentId: 'ag-2', amount: 50,  status: 'PENDING',   updatedAt: new Date().toISOString() },
    ];
    const app = buildApp({ data: rows, error: null });
    const res = await request(app).get('/v1/agents/activity/summary');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalAgents');
    expect(res.body.data).toHaveProperty('activeAgents');
    expect(res.body.data).toHaveProperty('totalInvoices');
    expect(res.body.data).toHaveProperty('totalSettled');
    expect(res.body.data).toHaveProperty('totalRevenue');
  });

  test('200 has-total-agents — totalAgents counts distinct agentIds', async () => {
    const rows = [
      { agentId: 'ag-1', amount: 100, status: 'SETTLED',   updatedAt: new Date().toISOString() },
      { agentId: 'ag-1', amount: 50,  status: 'COMPLETED', updatedAt: new Date().toISOString() },
      { agentId: 'ag-2', amount: 75,  status: 'PENDING',   updatedAt: new Date().toISOString() },
    ];
    const app = buildApp({ data: rows, error: null });
    const res = await request(app).get('/v1/agents/activity/summary');
    expect(res.status).toBe(200);
    expect(res.body.data.totalAgents).toBe(2);
    expect(res.body.data.totalInvoices).toBe(3);
  });

  test('200 has-total-revenue — totalRevenue sums SETTLED+COMPLETED amounts', async () => {
    const rows = [
      { agentId: 'ag-1', amount: 200, status: 'SETTLED',   updatedAt: new Date().toISOString() },
      { agentId: 'ag-2', amount: 300, status: 'COMPLETED', updatedAt: new Date().toISOString() },
      { agentId: 'ag-3', amount: 999, status: 'PENDING',   updatedAt: new Date().toISOString() },
    ];
    const app = buildApp({ data: rows, error: null });
    const res = await request(app).get('/v1/agents/activity/summary');
    expect(res.status).toBe(200);
    expect(res.body.data.totalRevenue).toBe(500);
    expect(res.body.data.totalSettled).toBe(2);
  });

  test('200 zero-when-empty — all zeros when no invoices exist', async () => {
    const app = buildApp({ data: [], error: null });
    const res = await request(app).get('/v1/agents/activity/summary');
    expect(res.status).toBe(200);
    expect(res.body.data.totalAgents).toBe(0);
    expect(res.body.data.activeAgents).toBe(0);
    expect(res.body.data.totalRevenue).toBe(0);
  });

  test('500 db-error — returns 500 when DB query fails', async () => {
    const app = buildApp({ data: null, error: new Error('DB down') });
    const res = await request(app).get('/v1/agents/activity/summary');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
