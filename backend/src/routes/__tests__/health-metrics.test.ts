jest.mock('../../lib/prisma', () => ({
  prisma: { $queryRaw: jest.fn().mockResolvedValue([]) },
}));

jest.mock('../../lib/redis', () => ({
  redis: { ping: jest.fn().mockResolvedValue('PONG') },
}));

import express from 'express';
import request from 'supertest';
import healthRouter from '../health';

function buildApp() {
  const app = express();
  app.use(healthRouter);
  return app;
}

const app = buildApp();

describe('GET /v1/health/metrics', () => {
  test('200 returns-shape — response has success and data object', async () => {
    const res = await request(app).get('/v1/health/metrics');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data).toBe('object');
  });

  test('200 has-uptime — data contains uptimeSeconds number', async () => {
    const res = await request(app).get('/v1/health/metrics');
    expect(typeof res.body.data.uptimeSeconds).toBe('number');
    expect(res.body.data.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  test('200 has-memory — data contains memoryMB with rss, heapUsed, heapTotal', async () => {
    const res = await request(app).get('/v1/health/metrics');
    const mem = res.body.data.memoryMB;
    expect(mem).toBeDefined();
    expect(mem).toHaveProperty('rss');
    expect(mem).toHaveProperty('heapUsed');
    expect(mem).toHaveProperty('heapTotal');
  });

  test('200 memory-is-number — all memoryMB values are numbers', async () => {
    const res = await request(app).get('/v1/health/metrics');
    const mem = res.body.data.memoryMB;
    expect(typeof mem.rss).toBe('number');
    expect(typeof mem.heapUsed).toBe('number');
    expect(typeof mem.heapTotal).toBe('number');
  });

  test('200 has-node-version — data contains nodeVersion string', async () => {
    const res = await request(app).get('/v1/health/metrics');
    expect(typeof res.body.data.nodeVersion).toBe('string');
    expect(res.body.data.nodeVersion).toMatch(/^v\d+/);
  });
});
