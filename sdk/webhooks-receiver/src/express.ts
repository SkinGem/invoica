/**
 * Express middleware helper. Optional — verifyWebhook works standalone for
 * partners on Fastify / Hono / Lambda / Cloudflare Workers.
 *
 * Usage:
 *
 *   import express from 'express';
 *   import { invoicaWebhookHandler } from '@invoica/webhooks-receiver';
 *
 *   const app = express();
 *
 *   // IMPORTANT: register the raw-body parser BEFORE the handler so we get
 *   // the bytes Invoica signed (re-serialising JSON would break HMAC).
 *   app.post(
 *     '/webhooks/invoica',
 *     express.raw({ type: 'application/json' }),
 *     invoicaWebhookHandler(process.env.INVOICA_WEBHOOK_SECRET!, {
 *       'mandate.signed_by_both': async (event) => { ... },
 *       'invoice.settled':        async (event) => { ... },
 *     }),
 *   );
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyWebhook } from './verify.js';
import { INVOICA_HEADERS } from './types.js';
import type {
  EventByType,
  InvoicaWebhookEvent,
  InvoicaWebhookEventType,
} from './types.js';

/**
 * Per-event-type handler. Return a Promise (or void) — the middleware awaits.
 * If your handler throws, the middleware returns 500 and forwards via next(err).
 */
export type EventHandler<T extends InvoicaWebhookEventType> = (
  event: EventByType<T>,
  req: Request,
  res: Response,
) => void | Promise<void>;

/**
 * Fallback handler for events whose `type` isn't in the union (e.g. a new
 * event Invoica added after you last upgraded). Optional — without one the
 * middleware just 200s and logs to the console.
 */
export type UnknownEventHandler = (
  rawType: string,
  body: unknown,
  req: Request,
  res: Response,
) => void | Promise<void>;

export interface InvoicaWebhookHandlerOptions {
  /**
   * Per-event-type handlers. Only the event types you register will be
   * dispatched; everything else hits `onUnknown` (or 200s silently).
   */
  handlers: Partial<{
    [K in InvoicaWebhookEventType]: EventHandler<K>;
  }>;
  /**
   * Called for any event whose `type` isn't in the typed union. Defaults to
   * console.warn + 200.
   */
  onUnknown?: UnknownEventHandler;
  /**
   * Called when the signature fails. Defaults to res.status(401).send().
   * Override to add metrics, alerts, or a custom response body.
   */
  onInvalid?: (error: string, req: Request, res: Response) => void | Promise<void>;
}

/**
 * Factory that returns an Express RequestHandler.
 *
 * Signature is `(secret, options)` so partners can't accidentally bind the
 * secret into a default value (it's required positionally on every call).
 */
export function invoicaWebhookHandler(
  secret: string,
  options: InvoicaWebhookHandlerOptions,
): RequestHandler;
/**
 * Shorthand: pass handlers directly instead of an options object.
 *
 *   invoicaWebhookHandler(secret, {
 *     'invoice.settled': async (event) => { ... },
 *   })
 */
export function invoicaWebhookHandler(
  secret: string,
  handlers: InvoicaWebhookHandlerOptions['handlers'],
): RequestHandler;
export function invoicaWebhookHandler(
  secret: string,
  handlersOrOptions:
    | InvoicaWebhookHandlerOptions
    | InvoicaWebhookHandlerOptions['handlers'],
): RequestHandler {
  if (!secret || typeof secret !== 'string') {
    throw new TypeError(
      'invoicaWebhookHandler: secret is required and must be a string. ' +
        'Do not bake it into a module-level default — pass it explicitly.',
    );
  }

  const options: InvoicaWebhookHandlerOptions =
    'handlers' in handlersOrOptions
      ? handlersOrOptions
      : { handlers: handlersOrOptions };

  return async function invoicaWebhookMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const signature = req.header(INVOICA_HEADERS.signature);

    // Express's `req.body` is whatever the body parser left. We accept Buffer
    // (from express.raw, recommended), string, or — as a fallback — an
    // already-parsed object that we re-stringify. Re-stringifying is the
    // canonicalisation hazard, so we warn loudly when it happens.
    let bodyForVerify: string | Buffer;
    if (Buffer.isBuffer(req.body)) {
      bodyForVerify = req.body;
    } else if (typeof req.body === 'string') {
      bodyForVerify = req.body;
    } else if (req.body && typeof req.body === 'object') {
      // eslint-disable-next-line no-console
      console.warn(
        '[invoica/webhooks-receiver] req.body is a parsed object, not raw bytes. ' +
          'Use express.raw({ type: "application/json" }) before this middleware ' +
          'to avoid JSON re-serialisation breaking the signature.',
      );
      bodyForVerify = JSON.stringify(req.body);
    } else {
      await onInvalid(options, 'missing_body', req, res);
      return;
    }

    const result = verifyWebhook(bodyForVerify, signature ?? null, secret);

    if (!result.valid) {
      // unknown_event_type is signature-valid but type-unknown — route to
      // the unknown-event handler so partners can still 200 it.
      if (result.error.startsWith('unknown_event_type:')) {
        const rawType = result.error.slice('unknown_event_type:'.length);
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(
            typeof bodyForVerify === 'string'
              ? bodyForVerify
              : bodyForVerify.toString('utf8'),
          );
        } catch {
          // unreachable: verifyWebhook already parsed it successfully.
        }
        if (options.onUnknown) {
          try {
            await options.onUnknown(rawType, parsed, req, res);
            if (!res.headersSent) res.status(200).send('ok');
          } catch (err) {
            next(err);
          }
        } else {
          // eslint-disable-next-line no-console
          console.warn(
            `[invoica/webhooks-receiver] received unknown event type "${rawType}" — ` +
              'upgrade @invoica/webhooks-receiver or supply onUnknown.',
          );
          if (!res.headersSent) res.status(200).send('ok');
        }
        return;
      }

      await onInvalid(options, result.error, req, res);
      return;
    }

    const event: InvoicaWebhookEvent = result.event;
    const handler = (
      options.handlers as Record<
        string,
        EventHandler<InvoicaWebhookEventType> | undefined
      >
    )[event.type];

    if (!handler) {
      // Signature good, event type known, but partner didn't register a
      // handler for it. Acknowledge so Invoica doesn't retry.
      if (!res.headersSent) res.status(200).send('ok');
      return;
    }

    try {
      // The discriminated union resolves through Extract at the type level;
      // we cast here because Object.lookup widens away the discriminator.
      await handler(event as unknown as never, req, res);
      if (!res.headersSent) res.status(200).send('ok');
    } catch (err) {
      next(err);
    }
  };
}

async function onInvalid(
  options: InvoicaWebhookHandlerOptions,
  error: string,
  req: Request,
  res: Response,
): Promise<void> {
  if (options.onInvalid) {
    await options.onInvalid(error, req, res);
    if (!res.headersSent) res.status(401).send('invalid signature');
    return;
  }
  if (!res.headersSent) res.status(401).send('invalid signature');
}
