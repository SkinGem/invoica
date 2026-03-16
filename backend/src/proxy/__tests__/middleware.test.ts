// Mocks must be declared before imports
jest.mock('http-proxy-middleware', () => ({
  createProxyMiddleware: jest.fn().mockReturnValue(jest.fn()),
}));
jest.mock('../headers', () => ({
  extractInvoiceHeaders: jest.fn().mockReturnValue({}),
  hasInvoiceHeaders: jest.fn().mockReturnValue(false),
}));
jest.mock('../../utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), error: jest.fn() },
}));
jest.mock('../../queue/invoice.queue', () => ({
  invoiceQueue: { add: jest.fn().mockResolvedValue({}) },
}));

import { createProxyMiddleware } from 'http-proxy-middleware';
import { hasInvoiceHeaders, extractInvoiceHeaders } from '../headers';
import { invoiceQueue } from '../../queue/invoice.queue';
import { createInvoiceProxyMiddleware, createInvoiceRouteHandler } from '../middleware';
import type { Request, Response, NextFunction } from 'express';

// Helper: captured proxy options after calling createInvoiceProxyMiddleware
function getCapturedOptions() {
  return (createProxyMiddleware as jest.Mock).mock.calls[
    (createProxyMiddleware as jest.Mock).mock.calls.length - 1
  ][0];
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    ip: '1.2.3.4',
    socket: { remoteAddress: '1.2.3.4' },
    method: 'GET',
    path: '/test',
    originalUrl: '/test',
    query: {},
    ...overrides,
  } as unknown as Request;
}

function makeRes(headersSent = false): any {
  const res: any = { headersSent };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.writeHead = jest.fn();
  return res;
}

function makeProxyRes(statusCode: number, headers: Record<string, string> = {}): any {
  return { statusCode, headers, pipe: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  (createProxyMiddleware as jest.Mock).mockReturnValue(jest.fn());
  (invoiceQueue.add as jest.Mock).mockResolvedValue({});
});

describe('createInvoiceProxyMiddleware', () => {
  it('calls createProxyMiddleware with the provided target', () => {
    createInvoiceProxyMiddleware({ target: 'http://merchant.example' });
    const opts = getCapturedOptions();
    expect(opts.target).toBe('http://merchant.example');
  });

  it('defaults changeOrigin to true when not specified', () => {
    createInvoiceProxyMiddleware({ target: 'http://merchant.example' });
    const opts = getCapturedOptions();
    expect(opts.changeOrigin).toBe(true);
  });

  it('respects an explicit changeOrigin: false', () => {
    createInvoiceProxyMiddleware({ target: 'http://merchant.example', changeOrigin: false });
    const opts = getCapturedOptions();
    expect(opts.changeOrigin).toBe(false);
  });

  it('onProxyReq sets X-Forwarded-For and X-Proxy-Type headers', () => {
    createInvoiceProxyMiddleware({ target: 'http://merchant.example' });
    const { onProxyReq } = getCapturedOptions();
    const proxyReq = { setHeader: jest.fn() };
    const req = makeReq();
    onProxyReq(proxyReq, req);
    expect(proxyReq.setHeader).toHaveBeenCalledWith('X-Forwarded-For', '1.2.3.4');
    expect(proxyReq.setHeader).toHaveBeenCalledWith('X-Proxy-Type', 'invoice-proxy');
  });

  it('onProxyRes with 402 adds payment-required job to queue', async () => {
    createInvoiceProxyMiddleware({ target: 'http://merchant.example' });
    const { onProxyRes } = getCapturedOptions();
    const req = makeReq({ headers: { 'x-request-id': 'req-123' } });
    const res = makeRes();
    const proxyRes = makeProxyRes(402);
    await onProxyRes(proxyRes, req, res);
    expect(invoiceQueue.add).toHaveBeenCalledWith(
      'payment-required',
      expect.objectContaining({ requestId: 'req-123', method: 'GET', path: '/test' }),
      expect.any(Object)
    );
  });

  it('onProxyRes with 402 calls writeHead(402) and pipes proxyRes to res', async () => {
    createInvoiceProxyMiddleware({ target: 'http://merchant.example' });
    const { onProxyRes } = getCapturedOptions();
    const req = makeReq();
    const res = makeRes();
    const proxyRes = makeProxyRes(402, { 'content-type': 'application/json' });
    await onProxyRes(proxyRes, req, res);
    expect(res.writeHead).toHaveBeenCalledWith(402, proxyRes.headers);
    expect(proxyRes.pipe).toHaveBeenCalledWith(res, { end: true });
  });

  it('onProxyRes with 200 + invoice headers adds success-with-invoice job', async () => {
    (hasInvoiceHeaders as jest.Mock).mockReturnValue(true);
    createInvoiceProxyMiddleware({ target: 'http://merchant.example' });
    const { onProxyRes } = getCapturedOptions();
    const req = makeReq({ headers: { 'x-request-id': 'req-200' } });
    const res = makeRes();
    const proxyRes = makeProxyRes(200);
    await onProxyRes(proxyRes, req, res);
    expect(invoiceQueue.add).toHaveBeenCalledWith(
      'success-with-invoice',
      expect.objectContaining({ requestId: 'req-200', status: 'success' }),
      expect.any(Object)
    );
  });

  it('onProxyRes with 200 and no invoice headers does NOT queue', async () => {
    (hasInvoiceHeaders as jest.Mock).mockReturnValue(false);
    createInvoiceProxyMiddleware({ target: 'http://merchant.example' });
    const { onProxyRes } = getCapturedOptions();
    const req = makeReq();
    const res = makeRes();
    await onProxyRes(makeProxyRes(200), req, res);
    expect(invoiceQueue.add).not.toHaveBeenCalled();
  });

  it('onError sends 502 JSON when headers not yet sent', () => {
    createInvoiceProxyMiddleware({ target: 'http://merchant.example' });
    const { onError } = getCapturedOptions();
    const res = makeRes(false);
    onError(new Error('upstream down'), makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Bad Gateway' }));
  });

  it('onError does not send response when headers already sent', () => {
    createInvoiceProxyMiddleware({ target: 'http://merchant.example' });
    const { onError } = getCapturedOptions();
    const res = makeRes(true);
    onError(new Error('upstream down'), makeReq(), res);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('createInvoiceRouteHandler', () => {
  it('calls next() when no invoice headers present', () => {
    (hasInvoiceHeaders as jest.Mock).mockReturnValue(false);
    const handler = createInvoiceRouteHandler('http://merchant.example');
    const req = makeReq();
    const res = makeRes();
    const next = jest.fn() as unknown as NextFunction;
    handler(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
