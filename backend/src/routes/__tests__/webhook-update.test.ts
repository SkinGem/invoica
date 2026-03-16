jest.mock('../../lib/prisma', () => ({
  prisma: {},
}));

const mockFindById = jest.fn();
const mockUpdate = jest.fn();
jest.mock('../../services/webhook/types', () => ({
  WebhookRepository: jest.fn().mockImplementation(() => ({
    register: jest.fn(),
    listAll: jest.fn(),
    findById: mockFindById,
    delete: jest.fn(),
    update: mockUpdate,
  })),
}));

import express from 'express';
import request from 'supertest';
import webhookRouter from '../webhooks';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(webhookRouter);
  app.use((err: Error, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error: { message: err.message } });
  });
  return app;
}

const app = buildApp();

const WEBHOOK = {
  id: 'wh-1',
  url: 'https://example.com/hook',
  events: ['invoice.created'],
  secret: 'supersecretvalue1234',
};

describe('PUT /v1/webhooks/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 updates-url — returns updated webhook with new URL', async () => {
    mockFindById.mockResolvedValue(WEBHOOK);
    mockUpdate.mockResolvedValue({ ...WEBHOOK, url: 'https://new.com/hook' });
    const res = await request(app)
      .put('/v1/webhooks/wh-1')
      .send({ url: 'https://new.com/hook' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toBe('https://new.com/hook');
  });

  test('200 updates-events — returns updated webhook with new events', async () => {
    mockFindById.mockResolvedValue(WEBHOOK);
    mockUpdate.mockResolvedValue({ ...WEBHOOK, events: ['invoice.settled', 'invoice.created'] });
    const res = await request(app)
      .put('/v1/webhooks/wh-1')
      .send({ events: ['invoice.settled', 'invoice.created'] });
    expect(res.status).toBe(200);
    expect(res.body.data.events).toContain('invoice.settled');
  });

  test('400 no-fields — returns 400 when neither url nor events provided', async () => {
    const res = await request(app)
      .put('/v1/webhooks/wh-1')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NO_FIELDS');
  });

  test('404 not-found — returns 404 when webhook does not exist', async () => {
    mockFindById.mockResolvedValue(null);
    const res = await request(app)
      .put('/v1/webhooks/nonexistent')
      .send({ url: 'https://new.com' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('500 db-error — returns 500 when update throws', async () => {
    mockFindById.mockResolvedValue(WEBHOOK);
    mockUpdate.mockRejectedValue(new Error('DB down'));
    const res = await request(app)
      .put('/v1/webhooks/wh-1')
      .send({ url: 'https://new.com' });
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
