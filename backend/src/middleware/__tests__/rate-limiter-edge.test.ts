import { Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '../rate-limiter';

const mockReq = (opts: {
  auth?: string;
  apiKey?: string;
  ip?: string;
  remoteAddress?: string;
} = {}): Request => ({
  headers: {
    ...(opts.auth !== undefined && { authorization: opts.auth }),
    ...(opts.apiKey !== undefined && { 'x-api-key': opts.apiKey }),
  },
  ip: opts.ip,
  socket: { remoteAddress: opts.remoteAddress ?? '192.168.1.1' },
} as unknown as Request);

const mockRes = (): Response => {
  const res: any = {};
  res.setHeader = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('createRateLimiter — edge cases', () => {
  let next: NextFunction;

  beforeEach(() => { next = jest.fn(); });

  it('non-Bearer Authorization header is used as API key directly', () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 1 });
    const req = mockReq({ auth: 'token-no-bearer-prefix' });
    // Two calls with same non-Bearer token exhaust the limit
    limiter(req, mockRes(), next);
    const res2 = mockRes();
    limiter(req, res2, next);
    expect(res2.status).toHaveBeenCalledWith(429);
  });

  it('socket.remoteAddress is used as key when req.ip is undefined', () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 1 });
    const req = mockReq({ remoteAddress: '10.20.30.40' }); // ip is undefined
    limiter(req, mockRes(), next);
    const res2 = mockRes();
    limiter(req, res2, next);
    expect(res2.status).toHaveBeenCalledWith(429);
  });

  it('different clients have independent rate limits', () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 1 });
    // Client A exhausts its limit
    const reqA = mockReq({ auth: 'Bearer client-a' });
    limiter(reqA, mockRes(), next);
    const resA2 = mockRes();
    limiter(reqA, resA2, next);
    expect(resA2.status).toHaveBeenCalledWith(429);
    // Client B still has fresh limit
    const reqB = mockReq({ auth: 'Bearer client-b' });
    const resB = mockRes();
    limiter(reqB, resB, jest.fn());
    expect(resB.status).not.toHaveBeenCalledWith(429);
  });

  it('auth header is preferred over x-api-key when both present', () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 1 });
    const req = mockReq({ auth: 'Bearer auth-key', apiKey: 'header-key' });
    // Exhaust using both headers — should be keyed by auth, not apiKey
    limiter(req, mockRes(), next);
    // A request with only x-api-key=header-key should NOT be affected
    const reqApiKeyOnly = mockReq({ apiKey: 'header-key' });
    const resApiKeyOnly = mockRes();
    limiter(reqApiKeyOnly, resApiKeyOnly, jest.fn());
    expect(resApiKeyOnly.status).not.toHaveBeenCalledWith(429);
  });

  it('X-RateLimit-Remaining is set to 0, not negative, when limit exceeded', () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 1 });
    const req = mockReq({ auth: 'Bearer neg-test' });
    limiter(req, mockRes(), next); // count=1, remaining=0
    const res2 = mockRes();
    limiter(req, res2, next); // count=2, remaining should be max(0,1-2)=0 not -1
    expect(res2.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
  });

  it('X-RateLimit-Reset header is a future Unix timestamp', () => {
    const before = Math.floor(Date.now() / 1000);
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 10 });
    const req = mockReq({ auth: 'Bearer reset-ts' });
    const res = mockRes();
    limiter(req, res, next);
    const calls = (res.setHeader as jest.Mock).mock.calls;
    const resetCall = calls.find(([h]: [string]) => h === 'X-RateLimit-Reset');
    expect(resetCall).toBeDefined();
    const resetTs = resetCall![1] as number;
    expect(resetTs).toBeGreaterThanOrEqual(before + 59); // at least 59s in the future
    expect(resetTs).toBeLessThanOrEqual(before + 61);
  });

  it('window expiry resets count (fake timer)', () => {
    jest.useFakeTimers();
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 1 });
    const req = mockReq({ auth: 'Bearer window-reset' });
    limiter(req, mockRes(), next); // count=1 — at limit
    const resOverLimit = mockRes();
    limiter(req, resOverLimit, next); // count=2 — 429
    expect(resOverLimit.status).toHaveBeenCalledWith(429);
    // Advance past the window
    jest.advanceTimersByTime(1100);
    const resAfterReset = mockRes();
    const nextAfterReset = jest.fn();
    limiter(req, resAfterReset, nextAfterReset);
    expect(nextAfterReset).toHaveBeenCalled();
    expect(resAfterReset.status).not.toHaveBeenCalledWith(429);
    jest.useRealTimers();
  });

  it('fallback key is "unknown" when both ip and remoteAddress are undefined', () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 1 });
    const req = { headers: {}, ip: undefined, socket: {} } as unknown as Request;
    const res1 = mockRes();
    limiter(req, res1, next);
    expect(next).toHaveBeenCalledTimes(1);
    const res2 = mockRes();
    limiter(req, res2, jest.fn());
    expect(res2.status).toHaveBeenCalledWith(429); // "unknown" key exhausted
  });
});
