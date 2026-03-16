// Mock all handler modules before importing the router
jest.mock('../settlements', () => ({
  getSettlements: jest.fn((_req: unknown, res: { json: jest.Mock }) => res.json([])),
  getSettlement: jest.fn((_req: unknown, res: { json: jest.Mock }) => res.json({})),
}));
jest.mock('../invoices', () => ({
  listInvoices: jest.fn((_req: unknown, res: { json: jest.Mock }) => res.json([])),
  createInvoice: jest.fn((_req: unknown, res: { json: jest.Mock }) => res.json({})),
  getInvoice: jest.fn((_req: unknown, res: { json: jest.Mock }) => res.json({})),
  updateInvoice: jest.fn((_req: unknown, res: { json: jest.Mock }) => res.json({})),
}));
jest.mock('../merchants', () => ({
  listMerchants: jest.fn((_req: unknown, res: { json: jest.Mock }) => res.json([])),
  createMerchant: jest.fn((_req: unknown, res: { json: jest.Mock }) => res.json({})),
  getMerchant: jest.fn((_req: unknown, res: { json: jest.Mock }) => res.json({})),
}));
jest.mock('../payments', () => ({
  createPayment: jest.fn((_req: unknown, res: { json: jest.Mock }) => res.json({})),
  getPayment: jest.fn((_req: unknown, res: { json: jest.Mock }) => res.json({})),
}));
jest.mock('../dashboard-stats', () => ({
  getDashboardStats: jest.fn((_req: unknown, res: { json: jest.Mock }) => res.json({})),
}));
jest.mock('../dashboard-activity', () => ({
  getDashboardActivity: jest.fn((_req: unknown, res: { json: jest.Mock }) => res.json([])),
}));
jest.mock('../invoices-settlements', () => ({
  getInvoicesWithSettlements: jest.fn((_req: unknown, res: { json: jest.Mock }) => res.json([])),
}));
jest.mock('../api-keys-mock', () => ({
  listApiKeys: jest.fn((_req: unknown, res: { json: jest.Mock }) => res.json([])),
  createApiKey: jest.fn((_req: unknown, res: { json: jest.Mock }) => res.json({})),
}));
jest.mock('../webhooks-mock', () => ({
  listWebhooks: jest.fn((_req: unknown, res: { json: jest.Mock }) => res.json([])),
  registerWebhook: jest.fn((_req: unknown, res: { json: jest.Mock }) => res.json({})),
}));

import { router } from '../router';
import { ApiError } from '../../errors';
import type { Request, Response, NextFunction } from 'express';

// Extract registered route paths and methods from router.stack
interface RouteEntry { path: string; methods: string[] }

function getRoutes(): RouteEntry[] {
  const entries: RouteEntry[] = [];
  for (const layer of (router as any).stack) {
    if (layer.route) {
      entries.push({
        path: layer.route.path as string,
        methods: Object.keys(layer.route.methods).map((m) => m.toUpperCase()),
      });
    }
  }
  return entries;
}

function makeRes(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('router — route registration', () => {
  it('registers GET /health', () => {
    const routes = getRoutes();
    const found = routes.find((r) => r.path === '/health' && r.methods.includes('GET'));
    expect(found).toBeDefined();
  });

  it('registers GET /v1/settlements', () => {
    const routes = getRoutes();
    expect(routes.find((r) => r.path === '/v1/settlements' && r.methods.includes('GET'))).toBeDefined();
  });

  it('registers GET /v1/settlements/:invoiceId', () => {
    const routes = getRoutes();
    expect(routes.find((r) => r.path === '/v1/settlements/:invoiceId' && r.methods.includes('GET'))).toBeDefined();
  });

  it('registers GET and POST /v1/invoices', () => {
    const routes = getRoutes();
    const inv = routes.filter((r) => r.path === '/v1/invoices');
    const methods = inv.flatMap((r) => r.methods);
    expect(methods).toContain('GET');
    expect(methods).toContain('POST');
  });

  it('registers GET and PATCH /v1/invoices/:id', () => {
    const routes = getRoutes();
    const inv = routes.filter((r) => r.path === '/v1/invoices/:id');
    const methods = inv.flatMap((r) => r.methods);
    expect(methods).toContain('GET');
    expect(methods).toContain('PATCH');
  });

  it('registers GET /v1/dashboard/stats', () => {
    const routes = getRoutes();
    expect(routes.find((r) => r.path === '/v1/dashboard/stats' && r.methods.includes('GET'))).toBeDefined();
  });

  it('registers GET /v1/dashboard/activity', () => {
    const routes = getRoutes();
    expect(routes.find((r) => r.path === '/v1/dashboard/activity' && r.methods.includes('GET'))).toBeDefined();
  });

  it('registers GET and POST /v1/api-keys', () => {
    const routes = getRoutes();
    const ak = routes.filter((r) => r.path === '/v1/api-keys');
    const methods = ak.flatMap((r) => r.methods);
    expect(methods).toContain('GET');
    expect(methods).toContain('POST');
  });

  it('registers GET and POST /v1/webhooks', () => {
    const routes = getRoutes();
    const wh = routes.filter((r) => r.path === '/v1/webhooks');
    const methods = wh.flatMap((r) => r.methods);
    expect(methods).toContain('GET');
    expect(methods).toContain('POST');
  });
});

describe('router — error handler', () => {
  let errorHandler: (err: Error, req: Request, res: Response, next: NextFunction) => void;

  beforeAll(() => {
    // The error handler is the last 4-arity middleware in router.stack
    for (const layer of (router as any).stack) {
      if (layer.handle && layer.handle.length === 4) {
        errorHandler = layer.handle;
      }
    }
  });

  it('returns statusCode and code for ApiError', () => {
    const err = new ApiError('Unprocessable', 422, 'UNPROCESSABLE');
    const res = makeRes();
    errorHandler(err, {} as Request, res, jest.fn() as NextFunction);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unprocessable', code: 'UNPROCESSABLE' });
  });

  it('returns 500 for unknown errors', () => {
    const err = new Error('unexpected');
    const res = makeRes();
    errorHandler(err, {} as Request, res, jest.fn() as NextFunction);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});
