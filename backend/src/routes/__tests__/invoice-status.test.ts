jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import request from 'supertest';
import invoiceRouter from '../invoices';

const mockCreateClient = createClient as jest.Mock;

const EXISTING = {
  id: 'inv-001',
  status: 'PENDING',
  invoiceNumber: 1,
  amount: 100,
  currency: 'USDC',
  customerEmail: 'a@b.com',
  customerName: 'Test',
  companyId: null,
  paymentDetails: null,
  settledAt: null,
  completedAt: null,
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
};

function buildMock(
  fetchResult: { data: any; error: any },
  updateResult: { data: any; error: any }
) {
  const fetchQuery: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(fetchResult),
  };
  const updateQuery: any = {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(updateResult),
  };
  const fromMock = jest.fn()
    .mockReturnValueOnce(fetchQuery)
    .mockReturnValueOnce(updateQuery);
  mockCreateClient.mockReturnValue({ from: fromMock });

  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

  const app = express();
  app.use(express.json());
  app.use(invoiceRouter);
  return app;
}

describe('PATCH /v1/invoices/:id/status', () => {
  beforeEach(() => jest.clearAllMocks());

  test('400 when status is invalid value', async () => {
    const app = buildMock({ data: EXISTING, error: null }, { data: null, error: null });
    const res = await request(app).patch('/v1/invoices/inv-001/status').send({ status: 'INVALID' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });

  test('400 when status is missing from body', async () => {
    const app = buildMock({ data: EXISTING, error: null }, { data: null, error: null });
    const res = await request(app).patch('/v1/invoices/inv-001/status').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });

  test('404 when invoice not found', async () => {
    const app = buildMock({ data: null, error: { message: 'not found' } }, { data: null, error: null });
    const res = await request(app).patch('/v1/invoices/no-such-id/status').send({ status: 'PROCESSING' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('400 on invalid transition (COMPLETED → PENDING)', async () => {
    const completed = { ...EXISTING, status: 'COMPLETED' };
    const app = buildMock({ data: completed, error: null }, { data: null, error: null });
    const res = await request(app).patch('/v1/invoices/inv-001/status').send({ status: 'PENDING' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  test('200 success on valid transition PENDING → PROCESSING', async () => {
    const updated = { ...EXISTING, status: 'PROCESSING', updatedAt: '2026-03-16T00:00:00Z' };
    const app = buildMock({ data: EXISTING, error: null }, { data: updated, error: null });
    const res = await request(app).patch('/v1/invoices/inv-001/status').send({ status: 'PROCESSING' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PROCESSING');
  });

  test('200 with settledAt set when transitioning to SETTLED', async () => {
    const now = '2026-03-16T12:00:00.000Z';
    const updated = { ...EXISTING, status: 'SETTLED', settledAt: now, updatedAt: now };
    const app = buildMock({ data: EXISTING, error: null }, { data: updated, error: null });
    const res = await request(app).patch('/v1/invoices/inv-001/status').send({ status: 'SETTLED' });
    expect(res.status).toBe(200);
    expect(res.body.data.settledAt).toBeTruthy();
  });

  test('200 with completedAt set when transitioning to COMPLETED', async () => {
    const processing = { ...EXISTING, status: 'PROCESSING' };
    const now = '2026-03-16T12:00:00.000Z';
    const updated = { ...processing, status: 'COMPLETED', completedAt: now, updatedAt: now };
    const app = buildMock({ data: processing, error: null }, { data: updated, error: null });
    const res = await request(app).patch('/v1/invoices/inv-001/status').send({ status: 'COMPLETED' });
    expect(res.status).toBe(200);
    expect(res.body.data.completedAt).toBeTruthy();
  });

  test('response shape has success and data fields', async () => {
    const updated = { ...EXISTING, status: 'PROCESSING', updatedAt: '2026-03-16T00:00:00Z' };
    const app = buildMock({ data: EXISTING, error: null }, { data: updated, error: null });
    const res = await request(app).patch('/v1/invoices/inv-001/status').send({ status: 'PROCESSING' });
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('status');
  });

  test('500 on database update error', async () => {
    const app = buildMock(
      { data: EXISTING, error: null },
      { data: null, error: new Error('DB write failed') }
    );
    const res = await request(app).patch('/v1/invoices/inv-001/status').send({ status: 'PROCESSING' });
    expect(res.status).toBe(500);
  });
});
