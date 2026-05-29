import { describe, it, expect, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import express from 'express';
import { invoicaWebhookHandler } from '../src/express';

const SECRET = 'this-is-a-16-plus-char-test-secret';

function sign(body: string, secret: string = SECRET): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

interface FakeReq {
  body: string | Buffer | object;
  headers: Record<string, string>;
  header(name: string): string | undefined;
}

interface FakeRes {
  statusCode: number;
  body: unknown;
  headersSent: boolean;
  status(code: number): FakeRes;
  send(body?: unknown): FakeRes;
}

function makeReq(body: string | Buffer | object, headers: Record<string, string> = {}): FakeReq {
  const lower: Record<string, string> = {};
  for (const k of Object.keys(headers)) lower[k.toLowerCase()] = headers[k]!;
  return {
    body,
    headers: lower,
    header(name: string) {
      return lower[name.toLowerCase()];
    },
  };
}

function makeRes(): FakeRes {
  const res: FakeRes = {
    statusCode: 0,
    body: undefined,
    headersSent: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(body?: unknown) {
      this.body = body;
      this.headersSent = true;
      return this;
    },
  };
  return res;
}

describe('invoicaWebhookHandler', () => {
  it('throws if secret is missing — partners can never accidentally bake it in', () => {
    expect(() => invoicaWebhookHandler('' as string, {})).toThrow(TypeError);
  });

  it('dispatches typed events to the matching handler', async () => {
    const payload = {
      id: 'evt_1',
      type: 'invoice.settled',
      data: { id: 'inv_42', invoiceNumber: 7, status: 'SETTLED' },
      createdAt: '2026-05-23T12:00:00.000Z',
    };
    const body = JSON.stringify(payload);

    const settled = vi.fn();
    const middleware = invoicaWebhookHandler(SECRET, {
      'invoice.settled': async (event) => {
        // TS check: event.type narrows; event.data is InvoicePayload.
        expect(event.type).toBe('invoice.settled');
        settled(event);
      },
    });

    const req = makeReq(Buffer.from(body, 'utf8'), {
      'X-Invoica-Signature': sign(body),
    });
    const res = makeRes();
    const next = vi.fn();

    await middleware(req as unknown as express.Request, res as unknown as express.Response, next);

    expect(settled).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 on signature mismatch', async () => {
    const body = JSON.stringify({
      id: 'evt_1',
      type: 'invoice.settled',
      data: {},
      createdAt: '2026-05-23T12:00:00.000Z',
    });

    const middleware = invoicaWebhookHandler(SECRET, {});
    const req = makeReq(Buffer.from(body, 'utf8'), {
      'X-Invoica-Signature': 'deadbeef',
    });
    const res = makeRes();
    const next = vi.fn();

    await middleware(req as unknown as express.Request, res as unknown as express.Response, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('routes unknown event types to onUnknown when supplied', async () => {
    const body = JSON.stringify({
      id: 'evt_x',
      type: 'mandate.escalated',
      data: { id: 'mnd_1' },
      createdAt: '2026-05-23T12:00:00.000Z',
    });

    const onUnknown = vi.fn();
    const middleware = invoicaWebhookHandler(SECRET, {
      handlers: {},
      onUnknown: async (rawType, parsed) => {
        expect(rawType).toBe('mandate.escalated');
        expect((parsed as { type: string }).type).toBe('mandate.escalated');
        onUnknown();
      },
    });

    const req = makeReq(Buffer.from(body, 'utf8'), {
      'X-Invoica-Signature': sign(body),
    });
    const res = makeRes();
    const next = vi.fn();

    await middleware(req as unknown as express.Request, res as unknown as express.Response, next);

    expect(onUnknown).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('200s known events with no registered handler (so Invoica does not retry)', async () => {
    const body = JSON.stringify({
      id: 'evt_z',
      type: 'mandate.proposed',
      data: { id: 'mnd_1' },
      createdAt: '2026-05-23T12:00:00.000Z',
    });

    const middleware = invoicaWebhookHandler(SECRET, {});

    const req = makeReq(Buffer.from(body, 'utf8'), {
      'X-Invoica-Signature': sign(body),
    });
    const res = makeRes();
    const next = vi.fn();

    await middleware(req as unknown as express.Request, res as unknown as express.Response, next);

    expect(res.statusCode).toBe(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards handler exceptions via next(err)', async () => {
    const body = JSON.stringify({
      id: 'evt_q',
      type: 'mandate.completed',
      data: { id: 'mnd_1' },
      createdAt: '2026-05-23T12:00:00.000Z',
    });

    const boom = new Error('partner db down');
    const middleware = invoicaWebhookHandler(SECRET, {
      'mandate.completed': async () => {
        throw boom;
      },
    });

    const req = makeReq(Buffer.from(body, 'utf8'), {
      'X-Invoica-Signature': sign(body),
    });
    const res = makeRes();
    const next = vi.fn();

    await middleware(req as unknown as express.Request, res as unknown as express.Response, next);

    expect(next).toHaveBeenCalledWith(boom);
  });

  it('warns + re-stringifies if body was already parsed (still verifies)', async () => {
    const payload = {
      id: 'evt_p',
      type: 'invoice.created',
      data: { id: 'inv_1' },
      createdAt: '2026-05-23T12:00:00.000Z',
    };
    const body = JSON.stringify(payload);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const handler = vi.fn();
    const middleware = invoicaWebhookHandler(SECRET, {
      'invoice.created': async () => { handler(); },
    });

    // Parsed object instead of a Buffer — express.json() case.
    const req = makeReq(payload, {
      'X-Invoica-Signature': sign(body),
    });
    const res = makeRes();
    const next = vi.fn();

    await middleware(req as unknown as express.Request, res as unknown as express.Response, next);

    expect(warnSpy).toHaveBeenCalled();
    expect(handler).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    warnSpy.mockRestore();
  });
});
