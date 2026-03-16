jest.mock('../../lib/prisma', () => ({
  prisma: {},
}));

const mockFindById = jest.fn();
const mockDelete = jest.fn();
jest.mock('../../services/webhook/types', () => ({
  WebhookRepository: jest.fn().mockImplementation(() => ({
    register: jest.fn(),
    listAll: jest.fn(),
    findById: mockFindById,
    delete: mockDelete,
    update: jest.fn(),
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

const WEBHOOK = { id: 'wh-1', url: 'https://example.com/hook', events: ['invoice.created'] };

describe('DELETE /v1/webhooks/bulk', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 returns-deleted-count — deletes existing webhooks and returns count', async () => {
    mockFindById.mockResolvedValue(WEBHOOK);
    mockDelete.mockResolvedValue(undefined);
    const res = await request(app)
      .delete('/v1/webhooks/bulk')
      .send({ ids: ['wh-1', 'wh-2'] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deleted).toBe(2);
    expect(Array.isArray(res.body.data.ids)).toBe(true);
  });

  test('200 validates-ids-array — skips IDs not found in DB, only counts deleted', async () => {
    mockFindById
      .mockResolvedValueOnce(WEBHOOK)   // wh-1 found
      .mockResolvedValueOnce(null);     // wh-999 not found
    mockDelete.mockResolvedValue(undefined);
    const res = await request(app)
      .delete('/v1/webhooks/bulk')
      .send({ ids: ['wh-1', 'wh-999'] });
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(1);
    expect(res.body.data.ids).toContain('wh-1');
  });

  test('400 missing-ids — returns 400 when ids field is missing', async () => {
    const res = await request(app)
      .delete('/v1/webhooks/bulk')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_IDS');
  });

  test('400 too-many-ids — returns 400 when ids array exceeds 20', async () => {
    const ids = Array.from({ length: 21 }, (_, i) => `wh-${i}`);
    const res = await request(app)
      .delete('/v1/webhooks/bulk')
      .send({ ids });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('TOO_MANY_IDS');
  });

  test('500 db-error — returns 500 when delete throws', async () => {
    mockFindById.mockResolvedValue(WEBHOOK);
    mockDelete.mockRejectedValue(new Error('DB down'));
    const res = await request(app)
      .delete('/v1/webhooks/bulk')
      .send({ ids: ['wh-1'] });
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
