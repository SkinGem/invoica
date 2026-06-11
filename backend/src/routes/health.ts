import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import packageJson from '../../package.json';

const router = Router();

/**
 * Check if memory protocol daily report exists and is recent
 * @returns Object with status and last report date
 */
async function checkMemoryProtocol(): Promise<{
  status: 'ok' | 'degraded';
  last_report_date: string | null;
}> {
  try {
    const memoryPath = path.join(process.cwd(), 'memory', 'daily-continuity.md');
    const stats = await fs.stat(memoryPath);
    const lastModified = stats.mtime;
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60);
    
    return {
      status: hoursSinceUpdate <= 25 ? 'ok' : 'degraded',
      last_report_date: lastModified.toISOString(),
    };
  } catch {
    return {
      status: 'degraded',
      last_report_date: null,
    };
  }
}

/**
 * Check service health status
 * @returns Object with service statuses
 */
async function checkServices(): Promise<{
  database: 'ok' | 'error';
  redis: 'ok' | 'error' | 'not_configured';
  openclaw?: 'ok' | 'error';
  memory_protocol?: 'ok' | 'degraded';
}> {
  const services: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error' | 'not_configured';
    openclaw?: 'ok' | 'error';
    memory_protocol?: 'ok' | 'degraded';
  } = {
    database: 'error',
    redis: 'not_configured',
  };

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    services.database = 'ok';
  } catch {
    services.database = 'error';
  }

  // Check Redis connectivity if REDIS_URL is configured
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      await redis.ping();
      services.redis = 'ok';
    } catch {
      services.redis = 'error';
    }
  }

  return services;
}

router.get('/v1/health', async (_req: Request, res: Response) => {
  const services = await checkServices();
  const memoryCheck = await checkMemoryProtocol();
  
  services.memory_protocol = memoryCheck.status;

  const status: 'ok' | 'error' = services.database === 'ok' ? 'ok' : 'error';
  const statusCode = services.database === 'ok' ? 200 : 503;

  res.status(statusCode).json({
    status,
    version: packageJson.version,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services,
    last_report_date: memoryCheck.last_report_date,
  });
});

router.get('/v1/health/services', async (_req: Request, res: Response) => {
  const services = await checkServices();
  const memoryCheck = await checkMemoryProtocol();
  
  services.memory_protocol = memoryCheck.status;

  res.json({ 
    success: true, 
    data: { 
      ...services, 
      uptime: process.uptime(),
      last_report_date: memoryCheck.last_report_date,
    } 
  });
});

router.get('/v1/health/detailed', async (_req: Request, res: Response) => {
  const services = await checkServices();
  const memoryCheck = await checkMemoryProtocol();
  
  services.memory_protocol = memoryCheck.status;

  // Check OpenClaw service
  try {
    const ctrl = await fetch('http://127.0.0.1:18791/', {
      signal: AbortSignal.timeout(1000),
    });
    if (ctrl.status < 500) {
      services.openclaw = 'ok';
    } else {
      services.openclaw = 'error';
    }
  } catch {
    services.openclaw = 'error';
  }

  const dbDown = services.database === 'error';
  const anyDown = services.redis === 'error' || 
                  services.openclaw === 'error' || 
                  services.memory_protocol === 'degraded';
  const status: 'ok' | 'degraded' = dbDown || anyDown ? 'degraded' : 'ok';
  const statusCode = dbDown ? 503 : 200;

  res.status(statusCode).json({
    status,
    version: packageJson.version,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services,
    last_report_date: memoryCheck.last_report_date,
  });
});

export default router;