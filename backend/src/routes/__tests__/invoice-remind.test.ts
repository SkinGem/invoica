jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import invoicesRouter from '../invoices';

const mockCreateClient = createClient as jest.Mock;

function buildApp(fetchResult: any) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

  mockCreateClient.mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(fetchResult),
      update: jest.fn().mockReturnThis(),
    }),
  });

  const app = express();
  app.use(express.json());
  app.use(invoicesRouter);
  app.use((err: Error, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error: { message: err.message, code: 'DB_ERROR' } });
  });
  return app;
}

describe('POST /v1/invoices/:id/remind', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 reminder-sent — returns sent:true for PENDING invoice', async () => {
    const app = buildApp({
      data: { id: 'inv-001', status: 'PENDING', customerEmail: 'customer@example.com' },
      error: null,
    });
    const res = await request(app).post('/v1/invoices/inv-001/remind');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sent).toBe(true);
  });

  test('200 returns-recipient — response includes customerEmail as to', async () => {
    const app = buildApp({
      data: { id: 'inv-002', status: 'PROCESSING', customerEmail: 'agent@invoica.ai' },
      error: null,
    });
    const res = await request(app).post('/v1/invoices/inv-002/remind');
    expect(res.status).toBe(200);
    expect(res.body.data.to).toBe('agent@invoica.ai');
    expect(res.body.data.invoiceId).toBe('inv-002');
  });

  test('400 already-settled — returns 400 for SETTLED invoice', async () => {
    const app = buildApp({
      data: { id: 'inv-003', status: 'SETTLED', customerEmail: 'x@y.com' },
      error: null,
    });
    const res = await request(app).post('/v1/invoices/inv-003/remind');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });

  test('404 not-found — returns 404 when invoice does not exist', async () => {
    const app = buildApp({ data: null, error: new Error('not found') });
    const res = await request(app).post('/v1/invoices/nonexistent/remind');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('500 db-error — returns 500 on database failure', async () => {
    mockCreateClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('DB crash')),
        update: jest.fn().mockReturnThis(),
      }),
    });
    const app = (() => {
      const a = express();
      a.use(express.json());
      a.use(invoicesRouter);
      a.use((err: Error, _req: any, res: any, _next: any) => {
        res.status(500).json({ success: false, error: { message: err.message, code: 'DB_ERROR' } });
      });
      return a;
    })();
    const res = await request(app).post('/v1/invoices/inv-x/remind');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
