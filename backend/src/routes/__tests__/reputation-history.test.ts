import request from 'supertest';
import express from 'express';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  prisma: {
    agentReputation: {
      findFirst: jest.fn(),
    },
  },
}));

import router from '../reputation-history';
import { prisma } from '../../lib/prisma';

const app = express();
app.use(router);

const mockRecord = {
  score: 82.5,
  tier: 'gold',
  updatedAt: new Date('2026-03-10T12:00:00.000Z'),
};

describe('GET /v1/reputation/:agentId/history', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 with history array when agent found within 30 days', async () => {
    (prisma.agentReputation.findFirst as jest.Mock).mockResolvedValue(mockRecord);

    const res = await request(app).get('/v1/reputation/agent-123/history');

    expect(res.status).toBe(200);
    expect(res.body.agentId).toBe('agent-123');
    expect(res.body.history).toHaveLength(1);
    expect(res.body.history[0].score).toBe(82.5);
    expect(res.body.history[0].tier).toBe('gold');
    expect(res.body.history[0].timestamp).toBe('2026-03-10T12:00:00.000Z');
  });

  test('200 with empty history when agent not found', async () => {
    (prisma.agentReputation.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/v1/reputation/unknown-agent/history');

    expect(res.status).toBe(200);
    expect(res.body.agentId).toBe('unknown-agent');
    expect(res.body.history).toEqual([]);
  });

  test('500 on database error', async () => {
    (prisma.agentReputation.findFirst as jest.Mock).mockRejectedValue(new Error('DB failure'));

    const res = await request(app).get('/v1/reputation/agent-123/history');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });

  test('passes updatedAt filter with 30-day window to prisma', async () => {
    (prisma.agentReputation.findFirst as jest.Mock).mockResolvedValue(null);

    await request(app).get('/v1/reputation/agent-abc/history');

    const call = (prisma.agentReputation.findFirst as jest.Mock).mock.calls[0][0];
    expect(call.where.agentId).toBe('agent-abc');
    expect(call.where.updatedAt.gte).toBeInstanceOf(Date);
    const diffMs = Date.now() - call.where.updatedAt.gte.getTime();
    expect(diffMs).toBeLessThan(31 * 24 * 60 * 60 * 1000);
  });

  test('response history entry has score, tier, timestamp fields', async () => {
    (prisma.agentReputation.findFirst as jest.Mock).mockResolvedValue(mockRecord);

    const res = await request(app).get('/v1/reputation/agent-123/history');
    const entry = res.body.history[0];

    expect(Object.keys(entry)).toEqual(expect.arrayContaining(['score', 'tier', 'timestamp']));
    expect(typeof entry.score).toBe('number');
    expect(typeof entry.tier).toBe('string');
    expect(typeof entry.timestamp).toBe('string');
  });
});
