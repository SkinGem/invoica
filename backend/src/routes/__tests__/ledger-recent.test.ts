jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

jest.mock('../../middleware/apiKeyAuth', () => ({
  requireApiKey: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../lib/email', () => ({
  sendVerificationEmail: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import ledgerRouter from '../ledger';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(ledgerRouter);
  app.use((err: Error, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error: { message: err.message } });
  });
  return app;
}

const RECENT = [
  { id: 'inv-1', invoiceNumber: 10, status: 'SETTLED',   amount: 100, currency: 'USD', agentId: 'agent-a', updatedAt: '2026-03-16T10:00:00Z' },
  { id: 'inv-2', invoiceNumber: 9,  status: 'COMPLETED', amount: 200, currency: 'USD', agentId: 'agent-b', updatedAt: '2026-03-16T09:00:00Z' },
];

function buildMockChain(resolveWith: any) {
  const chain: any = {
    in: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
  };
  chain.in.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.limit.mockResolvedValue(resolveWith);
  return chain;
}

describe('GET /v1/ledger/recent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  test('200 returns-array — response has data array and meta', async () => {
    const chain = buildMockChain({ data: RECENT, error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/ledger/recent');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
  });

  test('200 respects-limit — meta.limit matches requested limit', async () => {
    const chain = buildMockChain({ data: [RECENT[0]], error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/ledger/recent?limit=1');
    expect(res.body.meta.limit).toBe(1);
  });

  test('200 max-limit-50 — limit is capped at 50', async () => {
    const chain = buildMockChain({ data: RECENT, error: null });
    const mockFrom = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) });
    mockCreateClient.mockReturnValue({ from: mockFrom } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/ledger/recent?limit=999');
    expect(res.body.meta.limit).toBe(50);
  });

  test('200 only-settled-completed — route only fetches SETTLED/COMPLETED invoices (in() called with correct statuses)', async () => {
    const chain = buildMockChain({ data: RECENT, error: null });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/ledger/recent');
    expect(res.status).toBe(200);
    // Verify the chain was called (in() was invoked for status filter)
    expect(chain.in).toHaveBeenCalledWith('status', ['SETTLED', 'COMPLETED']);
  });

  test('500 db-error — returns 500 when DB query fails', async () => {
    const chain = buildMockChain({ data: null, error: new Error('DB down') });
    mockCreateClient.mockReturnValue({ from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(chain) }) } as any);
    const app = buildApp();
    const res = await request(app).get('/v1/ledger/recent');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
