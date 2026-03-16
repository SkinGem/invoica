jest.mock('express-rate-limit', () => jest.fn(() => jest.fn()));
jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

import {
  CustomerTier,
  tierConfigs,
  rateLimitOptionsSchema,
  generateRateLimitKey,
  getRateLimitStatus,
  resetCustomerRateLimit,
  closeRateLimitRedis,
  getRedisClient,
} from '../rate-limit';
import { Request } from 'express';

// ── CustomerTier enum ─────────────────────────────────────────────────────────

describe('CustomerTier enum', () => {
  it('has the correct string values for all four tiers', () => {
    expect(CustomerTier.FREE).toBe('free');
    expect(CustomerTier.BASIC).toBe('basic');
    expect(CustomerTier.PREMIUM).toBe('premium');
    expect(CustomerTier.ENTERPRISE).toBe('enterprise');
  });

  it('contains exactly four tiers', () => {
    const values = Object.values(CustomerTier);
    expect(values).toHaveLength(4);
  });
});

// ── tierConfigs ───────────────────────────────────────────────────────────────

describe('tierConfigs', () => {
  it('all four tiers use a 15-minute window (900000 ms)', () => {
    for (const tier of Object.values(CustomerTier)) {
      expect(tierConfigs[tier].windowMs).toBe(15 * 60 * 1000);
    }
  });

  it('FREE tier has max 100 requests', () => {
    expect(tierConfigs[CustomerTier.FREE].max).toBe(100);
  });

  it('BASIC tier has max 1000 requests', () => {
    expect(tierConfigs[CustomerTier.BASIC].max).toBe(1000);
  });

  it('PREMIUM tier has max 5000 requests', () => {
    expect(tierConfigs[CustomerTier.PREMIUM].max).toBe(5000);
  });

  it('ENTERPRISE tier has max 10000 requests', () => {
    expect(tierConfigs[CustomerTier.ENTERPRISE].max).toBe(10000);
  });
});

// ── rateLimitOptionsSchema ────────────────────────────────────────────────────

describe('rateLimitOptionsSchema', () => {
  it('accepts a valid configuration object', () => {
    const result = rateLimitOptionsSchema.safeParse({
      windowMs: 60000,
      max: 500,
      keyPrefix: 'test',
    });
    expect(result.success).toBe(true);
  });

  it('rejects windowMs below the 1000 ms minimum', () => {
    const result = rateLimitOptionsSchema.safeParse({ windowMs: 999 });
    expect(result.success).toBe(false);
  });

  it('rejects max above 100000', () => {
    const result = rateLimitOptionsSchema.safeParse({ max: 100001 });
    expect(result.success).toBe(false);
  });

  it('accepts an empty object (all fields optional)', () => {
    expect(rateLimitOptionsSchema.safeParse({}).success).toBe(true);
  });
});

// ── generateRateLimitKey ──────────────────────────────────────────────────────

function makeReq(ip?: string, remoteAddress?: string): Request {
  return {
    ip,
    socket: { remoteAddress },
  } as unknown as Request;
}

describe('generateRateLimitKey', () => {
  it('returns rate_limit:{customerId}:{ip} when customerId is provided', () => {
    const key = generateRateLimitKey(makeReq('10.0.0.1'), 'cust-123');
    expect(key).toBe('rate_limit:cust-123:10.0.0.1');
  });

  it('returns rate_limit:ip:{ip} when no customerId', () => {
    const key = generateRateLimitKey(makeReq('10.0.0.1'));
    expect(key).toBe('rate_limit:ip:10.0.0.1');
  });

  it('replaces colons in IPv6 addresses with underscores', () => {
    const key = generateRateLimitKey(makeReq('::1'), 'cust-abc');
    expect(key).toBe('rate_limit:cust-abc:__1');
  });

  it('falls back to socket.remoteAddress when req.ip is undefined', () => {
    const key = generateRateLimitKey(makeReq(undefined, '192.168.1.1'));
    expect(key).toBe('rate_limit:ip:192.168.1.1');
  });

  it('uses "unknown" when both req.ip and socket.remoteAddress are undefined', () => {
    const key = generateRateLimitKey(makeReq(undefined, undefined));
    expect(key).toBe('rate_limit:ip:unknown');
  });
});

// ── null-guard paths (no Redis client) ───────────────────────────────────────

describe('getRateLimitStatus with no Redis client', () => {
  it('returns { remaining: -1, limit: -1, reset: -1 } when Redis is not initialised', async () => {
    // Module starts with redisClient = null — no init needed
    const status = await getRateLimitStatus('cust-1', '10.0.0.1');
    expect(status).toEqual({ remaining: -1, limit: -1, reset: -1 });
  });
});

describe('resetCustomerRateLimit with no Redis client', () => {
  it('resolves without throwing when Redis is not initialised', async () => {
    await expect(resetCustomerRateLimit('cust-1')).resolves.toBeUndefined();
  });
});

describe('closeRateLimitRedis when client is null', () => {
  it('resolves without throwing (idempotent)', async () => {
    await expect(closeRateLimitRedis()).resolves.toBeUndefined();
  });
});

describe('getRedisClient', () => {
  it('returns null when Redis has not been initialised', () => {
    expect(getRedisClient()).toBeNull();
  });
});
