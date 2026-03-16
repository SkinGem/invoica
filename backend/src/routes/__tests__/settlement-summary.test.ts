import request from 'supertest';
import express from 'express';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';

function makeApp() {
  const app = express();
  app.use(express.json());
  const router = require('../settlement-summary').default;
  app.use(router);
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error: { message: err.message } });
  });
  return app;
}

const app = makeApp();

function buildChain(resolveWith: object) {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue(resolveWith),
  };
  // when no eq is called, `in` is terminal
  chain.in = jest.fn().mockResolvedValue(resolveWith);
  return chain;
}

function buildChainWithEq(resolveWith: object) {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue(resolveWith),
  };
  return chain;
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('GET /v1/settlements/summary', () => {
  it('returns zeros when no data', async () => {
    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => buildChain({ data: [], error: null })),
    });

    const res = await request(app).get('/v1/settlements/summary');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalSettlements).toBe(0);
    expect(res.body.data.totalVolume).toBe(0);
    expect(res.body.data.byChain).toEqual([]);
  });

  it('groups multiple chains correctly', async () => {
    const mockData = [
      { status: 'COMPLETED', amount: '100', paymentDetails: { network: 'base' } },
      { status: 'SETTLED', amount: '200', paymentDetails: { network: 'polygon' } },
      { status: 'COMPLETED', amount: '300', paymentDetails: { network: 'base' } },
    ];
    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => buildChain({ data: mockData, error: null })),
    });

    const res = await request(app).get('/v1/settlements/summary');
    expect(res.status).toBe(200);
    expect(res.body.data.totalSettlements).toBe(3);
    expect(res.body.data.totalVolume).toBeCloseTo(600);

    const baseEntry = res.body.data.byChain.find((c: any) => c.chain === 'base');
    expect(baseEntry).toBeDefined();
    expect(baseEntry.count).toBe(2);
    expect(baseEntry.totalAmount).toBeCloseTo(400);

    const polyEntry = res.body.data.byChain.find((c: any) => c.chain === 'polygon');
    expect(polyEntry).toBeDefined();
    expect(polyEntry.count).toBe(1);
  });

  it('applies companyId filter to Supabase query', async () => {
    const chain = buildChainWithEq({ data: [], error: null });
    (createClient as jest.Mock).mockReturnValue({ from: jest.fn(() => chain) });

    await request(app).get('/v1/settlements/summary?companyId=co-5');
    expect(chain.eq).toHaveBeenCalledWith('companyId', 'co-5');
  });

  it('parses paymentDetails stored as a JSON string', async () => {
    const mockData = [
      { status: 'COMPLETED', amount: '150', paymentDetails: '{"network":"arbitrum"}' },
    ];
    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => buildChain({ data: mockData, error: null })),
    });

    const res = await request(app).get('/v1/settlements/summary');
    expect(res.status).toBe(200);
    const arbitrumEntry = res.body.data.byChain.find((c: any) => c.chain === 'arbitrum');
    expect(arbitrumEntry).toBeDefined();
    expect(arbitrumEntry.count).toBe(1);
    expect(arbitrumEntry.totalAmount).toBeCloseTo(150);
  });

  it('falls back to "unknown" chain when paymentDetails is null', async () => {
    const mockData = [
      { status: 'SETTLED', amount: '75', paymentDetails: null },
    ];
    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => buildChain({ data: mockData, error: null })),
    });

    const res = await request(app).get('/v1/settlements/summary');
    expect(res.status).toBe(200);
    const unknownEntry = res.body.data.byChain.find((c: any) => c.chain === 'unknown');
    expect(unknownEntry).toBeDefined();
    expect(unknownEntry.count).toBe(1);
  });

  it('counts both SETTLED and COMPLETED invoices in totals', async () => {
    const mockData = [
      { status: 'SETTLED', amount: '100', paymentDetails: { network: 'base' } },
      { status: 'COMPLETED', amount: '200', paymentDetails: { network: 'base' } },
    ];
    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => buildChain({ data: mockData, error: null })),
    });

    const res = await request(app).get('/v1/settlements/summary');
    expect(res.status).toBe(200);
    expect(res.body.data.totalSettlements).toBe(2);
    expect(res.body.data.totalVolume).toBeCloseTo(300);
  });
});
