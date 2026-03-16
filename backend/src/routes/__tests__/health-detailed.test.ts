import request from 'supertest';
import express from 'express';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  prisma: { $queryRaw: jest.fn() },
}));

jest.mock('../../lib/redis', () => ({
  __esModule: true,
  redis: { ping: jest.fn() },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import router from '../health';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';

const app = express();
app.use(router);

describe('GET /v1/health/detailed', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('200 ok when all services healthy', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }]);
    process.env.REDIS_URL = 'redis://localhost';
    (redis.ping as jest.Mock).mockResolvedValue('PONG');
    mockFetch.mockResolvedValue({ status: 200 });

    const res = await request(app).get('/v1/health/detailed');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.services.database).toBe('ok');
    expect(res.body.services.redis).toBe('ok');
    expect(res.body.services.openclaw).toBe('ok');
  });

  test('200 degraded when openclaw unreachable', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }]);
    delete process.env.REDIS_URL;
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const res = await request(app).get('/v1/health/detailed');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('degraded');
    expect(res.body.services.openclaw).toBe('error');
  });

  test('200 degraded when redis error', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }]);
    process.env.REDIS_URL = 'redis://localhost';
    (redis.ping as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));
    mockFetch.mockResolvedValue({ status: 200 });

    const res = await request(app).get('/v1/health/detailed');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('degraded');
    expect(res.body.services.redis).toBe('error');
  });

  test('503 degraded when database down', async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('DB error'));
    delete process.env.REDIS_URL;
    mockFetch.mockResolvedValue({ status: 200 });

    const res = await request(app).get('/v1/health/detailed');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.services.database).toBe('error');
  });

  test('redis not_configured when REDIS_URL absent', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }]);
    delete process.env.REDIS_URL;
    mockFetch.mockResolvedValue({ status: 200 });

    const res = await request(app).get('/v1/health/detailed');
    expect(res.body.services.redis).toBe('not_configured');
  });

  test('response includes version, uptime, timestamp', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }]);
    delete process.env.REDIS_URL;
    mockFetch.mockResolvedValue({ status: 200 });

    const res = await request(app).get('/v1/health/detailed');
    expect(res.body.version).toBeDefined();
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.uptime).toBeGreaterThan(0);
    expect(() => new Date(res.body.timestamp)).not.toThrow();
  });

  test('openclaw ok when control port returns non-500 status', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }]);
    delete process.env.REDIS_URL;
    mockFetch.mockResolvedValue({ status: 404 });

    const res = await request(app).get('/v1/health/detailed');
    expect(res.body.services.openclaw).toBe('ok');
  });

  test('503 degraded when database and openclaw both down', async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('DB error'));
    delete process.env.REDIS_URL;
    mockFetch.mockRejectedValue(new Error('timeout'));

    const res = await request(app).get('/v1/health/detailed');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.services.database).toBe('error');
    expect(res.body.services.openclaw).toBe('error');
  });
});
