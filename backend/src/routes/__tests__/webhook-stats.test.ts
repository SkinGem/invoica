jest.mock('../../lib/prisma', () => ({
  prisma: {},
}));

const mockListAll = jest.fn();
jest.mock('../../services/webhook/types', () => ({
  WebhookRepository: jest.fn().mockImplementation(() => ({
    register: jest.fn(),
    listAll: mockListAll,
    findById: jest.fn(),
    delete: jest.fn(),
  })),
}));

import express from 'express';
import request from 'supertest';
import webhookRouter from '../webhooks';

function buildApp() {
  const app = express();
  app.use(webhookRouter);
  app.use((err: Error, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error: { message: err.message } });
  });
  return app;
}

const app = buildApp();

describe('GET /v1/webhooks/stats', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 returns-stats — returns total and byEvent object', async () => {
    mockListAll.mockResolvedValue([
      { id: '1', url: 'https://a.com', events: ['invoice.created', 'invoice.settled'] },
      { id: '2', url: 'https://b.com', events: ['invoice.created', 'settlement.confirmed'] },
    ]);
    const res = await request(app).get('/v1/webhooks/stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('byEvent');
  });

  test('200 total-correct — total equals number of registered webhooks', async () => {
    mockListAll.mockResolvedValue([
      { id: '1', url: 'https://a.com', events: ['invoice.created'] },
      { id: '2', url: 'https://b.com', events: ['invoice.settled'] },
      { id: '3', url: 'https://c.com', events: ['settlement.confirmed'] },
    ]);
    const res = await request(app).get('/v1/webhooks/stats');
    expect(res.body.data.total).toBe(3);
  });

  test('200 by-event-correct — byEvent counts subscriptions per event type', async () => {
    mockListAll.mockResolvedValue([
      { id: '1', url: 'https://a.com', events: ['invoice.created', 'invoice.settled'] },
      { id: '2', url: 'https://b.com', events: ['invoice.created'] },
    ]);
    const res = await request(app).get('/v1/webhooks/stats');
    expect(res.body.data.byEvent['invoice.created']).toBe(2);
    expect(res.body.data.byEvent['invoice.settled']).toBe(1);
    expect(res.body.data.byEvent['settlement.confirmed']).toBeUndefined();
  });

  test('200 empty-state — returns total 0 and empty byEvent when no webhooks', async () => {
    mockListAll.mockResolvedValue([]);
    const res = await request(app).get('/v1/webhooks/stats');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.byEvent).toEqual({});
  });

  test('500 db-error — returns 500 when listAll throws', async () => {
    mockListAll.mockRejectedValue(new Error('DB down'));
    const res = await request(app).get('/v1/webhooks/stats');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
