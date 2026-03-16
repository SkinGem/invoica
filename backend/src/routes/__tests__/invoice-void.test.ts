jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import invoicesRouter from '../invoices';

const mockCreateClient = createClient as jest.Mock;

function buildApp(fetchResult: any, updateResult?: any) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

  let callCount = 0;
  mockCreateClient.mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(() => {
        const result = callCount === 0 ? fetchResult : (updateResult || fetchResult);
        callCount++;
        return Promise.resolve(result);
      }),
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

describe('POST /v1/invoices/:id/void', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 voided — successfully voids a PENDING invoice', async () => {
    const fetchResult = { data: { id: 'inv-001', status: 'PENDING' }, error: null };
    const updateResult = {
      data: {
        id: 'inv-001', invoiceNumber: 1, status: 'CANCELLED', amount: 100, currency: 'USD',
        customerEmail: 'a@b.com', customerName: 'Test', companyId: null,
        paymentDetails: null, settledAt: null, completedAt: null,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      error: null,
    };
    const app = buildApp(fetchResult, updateResult);
    const res = await request(app).post('/v1/invoices/inv-001/void');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('200 returned-cancelled-status — voided invoice has CANCELLED status', async () => {
    const fetchResult = { data: { id: 'inv-002', status: 'PROCESSING' }, error: null };
    const updateResult = {
      data: {
        id: 'inv-002', invoiceNumber: 2, status: 'CANCELLED', amount: 50, currency: 'USD',
        customerEmail: 'x@y.com', customerName: 'Agent', companyId: null,
        paymentDetails: null, settledAt: null, completedAt: null,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      error: null,
    };
    const app = buildApp(fetchResult, updateResult);
    const res = await request(app).post('/v1/invoices/inv-002/void');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');
  });

  test('400 already-cancelled — returns 400 if invoice is already CANCELLED', async () => {
    const fetchResult = { data: { id: 'inv-003', status: 'CANCELLED' }, error: null };
    const app = buildApp(fetchResult);
    const res = await request(app).post('/v1/invoices/inv-003/void');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ALREADY_CANCELLED');
  });

  test('404 not-found — returns 404 when invoice does not exist', async () => {
    const fetchResult = { data: null, error: new Error('not found') };
    const app = buildApp(fetchResult);
    const res = await request(app).post('/v1/invoices/nonexistent/void');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('500 db-error — returns 500 on update error', async () => {
    const fetchResult = { data: { id: 'inv-004', status: 'PENDING' }, error: null };
    const updateResult = { data: null, error: new Error('DB down') };
    const app = buildApp(fetchResult, updateResult);
    const res = await request(app).post('/v1/invoices/inv-004/void');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
