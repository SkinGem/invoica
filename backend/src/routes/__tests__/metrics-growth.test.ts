jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import metricsRouter from '../metrics';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

type QueryResult = { data: any[] | null; error: Error | null };

function buildApp(results: [QueryResult, QueryResult, QueryResult, QueryResult]) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

  let callIndex = 0;
  const makeChain = (result: QueryResult) => ({
    select: jest.fn().mockReturnValue({
      gte: jest.fn().mockReturnValue({
        lt: jest.fn().mockResolvedValue(result),
      }),
      // last7Start gte with no lt (current period)
    }),
  });

  // We need 4 chained queries — use a counter approach
  const chains = results.map((r) => {
    const ltMock = jest.fn().mockResolvedValue(r);
    const gteMock = jest.fn().mockReturnValue({ lt: ltMock, then: undefined });
    // For current periods (no lt), resolve directly from gte
    gteMock.mockImplementation(() => ({ lt: ltMock, ...r }));
    // Simpler: each select returns an object that resolves via gte
    return r;
  });

  mockCreateClient.mockReturnValue({
    from: jest.fn().mockImplementation(() => {
      const result = chains[callIndex++] || { data: [], error: null };
      const ltMock = jest.fn().mockResolvedValue(result);
      const gteMock = jest.fn().mockReturnValue({ lt: ltMock });
      // For queries that don't call lt (current window)
      const selectMock = jest.fn().mockReturnValue({
        gte: jest.fn().mockImplementation(() => ({
          lt: jest.fn().mockResolvedValue(result),
          // make it thenable so it resolves without .lt too
          then: (resolve: any) => resolve(result),
          catch: (reject: any) => ({ then: (r: any) => r(result) }),
        })),
      });
      return { select: selectMock };
    }),
  } as any);

  const app = express();
  app.use(express.json());
  app.use(metricsRouter);
  app.use((err: Error, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error: { message: err.message } });
  });
  return app;
}

// Simpler mock builder that captures all 4 parallel calls
function buildAppSimple(
  currInvData: any[], prevInvData: any[],
  currSetData: any[], prevSetData: any[],
  error: Error | null = null,
) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

  const responses = [
    { data: currInvData, error },
    { data: prevInvData, error },
    { data: currSetData, error },
    { data: prevSetData, error },
  ];
  let idx = 0;

  mockCreateClient.mockReturnValue({
    from: jest.fn().mockImplementation(() => {
      const resp = responses[idx++] || { data: [], error: null };
      const ltFn = jest.fn().mockResolvedValue(resp);
      const gteFn = jest.fn().mockImplementation(() => ({
        lt: ltFn,
        then: (resolve: any) => Promise.resolve(resp).then(resolve),
        catch: (fn: any) => Promise.resolve(resp).catch(fn),
      }));
      return {
        select: jest.fn().mockReturnValue({ gte: gteFn }),
      };
    }),
  } as any);

  const app = express();
  app.use(express.json());
  app.use(metricsRouter);
  app.use((err: Error, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error: { message: err.message } });
  });
  return app;
}

describe('GET /v1/metrics/growth', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 returns-shape — success:true with invoices and settlements keys', async () => {
    const app = buildAppSimple([{ id: '1' }], [{ id: '2' }], [], []);
    const res = await request(app).get('/v1/metrics/growth');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('invoices');
    expect(res.body.data).toHaveProperty('settlements');
    expect(res.body.data.invoices).toHaveProperty('current');
    expect(res.body.data.invoices).toHaveProperty('previous');
    expect(res.body.data.invoices).toHaveProperty('growthPct');
  });

  test('200 positive-growth — more invoices this week returns positive growthPct', async () => {
    // current=10, previous=5 → growthPct=100
    const curr = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));
    const prev = Array.from({ length: 5 }, (_, i) => ({ id: String(i) }));
    const app = buildAppSimple(curr, prev, [], []);
    const res = await request(app).get('/v1/metrics/growth');
    expect(res.status).toBe(200);
    expect(res.body.data.invoices.current).toBe(10);
    expect(res.body.data.invoices.previous).toBe(5);
    expect(res.body.data.invoices.growthPct).toBe(100);
  });

  test('200 negative-growth — fewer invoices this week returns negative growthPct', async () => {
    // current=3, previous=6 → growthPct=-50
    const curr = Array.from({ length: 3 }, (_, i) => ({ id: String(i) }));
    const prev = Array.from({ length: 6 }, (_, i) => ({ id: String(i) }));
    const app = buildAppSimple(curr, prev, [], []);
    const res = await request(app).get('/v1/metrics/growth');
    expect(res.status).toBe(200);
    expect(res.body.data.invoices.growthPct).toBe(-50);
  });

  test('200 zero-previous — growthPct is null when previous period has no entries', async () => {
    const app = buildAppSimple([{ id: '1' }], [], [], []);
    const res = await request(app).get('/v1/metrics/growth');
    expect(res.status).toBe(200);
    expect(res.body.data.invoices.growthPct).toBeNull();
  });

  test('500 db-error — returns 500 when DB query fails', async () => {
    const app = buildAppSimple([], [], [], [], new Error('DB down'));
    const res = await request(app).get('/v1/metrics/growth');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
