# @invoica/webhooks-receiver

Typed Invoica webhook receiver. HMAC verification, discriminated-union event types, optional Express middleware. Production payload shapes ported directly from `backend/src/services/mandate/handler.ts` and `backend/src/services/webhook/dispatch.ts` — no guesswork.

## Install

```bash
npm install @invoica/webhooks-receiver
```

## 10-line example

```ts
import express from 'express';
import { invoicaWebhookHandler } from '@invoica/webhooks-receiver';

const app = express();

app.post(
  '/webhooks/invoica',
  express.raw({ type: 'application/json' }), // keep the bytes Invoica signed
  invoicaWebhookHandler(process.env.INVOICA_WEBHOOK_SECRET!, {
    'mandate.signed_by_both': async (event) => {
      console.log('PACT mandate fully signed:', event.data.id, event.data.scope);
    },
    'invoice.settled': async (event) => {
      console.log('Invoice paid:', event.data.id, event.data.amount, event.data.currency);
    },
  }),
);

app.listen(3000);
```

That's it. The middleware verifies the `X-Invoica-Signature` header, narrows the event by `type`, and dispatches to your handler. Handler errors flow to Express's error pipeline via `next(err)`. Unknown event types and unhandled known events both auto-200 so Invoica doesn't retry.

## Why use this

Today, every partner re-implements HMAC verification + payload typing themselves. We absorbed it once for Helixa and hit the JSON canonicalisation gotcha. This package is the answer:

- Signature algorithm matches `backend/src/services/webhook/signature.ts` byte-for-byte
- Discriminated-union types for every event currently dispatched in production
- Express middleware optional — `verifyWebhook` works standalone on Fastify, Hono, Lambda, Cloudflare Workers, etc.
- Zero runtime dependencies (Express is a peer dep, optional)
- Apache-2.0

## API reference

### `verifyWebhook(body, signature, secret) → VerifyResult`

```ts
import { verifyWebhook } from '@invoica/webhooks-receiver';

const result = verifyWebhook(rawBody, req.headers['x-invoica-signature'], SECRET);

if (!result.valid) {
  console.error('webhook rejected:', result.error);
  return new Response('invalid', { status: 401 });
}

// result.event is typed; switch on .type to narrow .data.
switch (result.event.type) {
  case 'mandate.signed_by_both':
    /* result.event.data: MandatePayload */
    break;
  case 'invoice.settled':
    /* result.event.data: InvoicePayload */
    break;
  // ...
}
```

**`body`** — raw request bytes. Pass `Buffer`, `Uint8Array`, or the verbatim UTF-8 string. **Do not** `JSON.parse(body); JSON.stringify(parsed)` before verifying — key order may change and HMAC will fail. Use `express.raw({ type: 'application/json' })` (or your framework's equivalent) to keep the bytes.

**`signature`** — value of the `X-Invoica-Signature` header (hex string).

**`secret`** — the secret you registered with `POST /v1/webhooks`. Required positional argument; never has a default.

**Returns:**

```ts
type VerifyResult =
  | { valid: true;  event: InvoicaWebhookEvent }
  | { valid: false; error:
      | 'missing_secret'
      | 'missing_signature'
      | 'signature_mismatch'
      | 'invalid_json'
      | 'malformed_envelope'
      | `unknown_event_type:${string}` };
```

Never throws.

### `invoicaWebhookHandler(secret, handlers) → RequestHandler`

Express middleware. Pass either a flat handlers map or an options object:

```ts
invoicaWebhookHandler(secret, {
  'invoice.settled': async (event, req, res) => { /* ... */ },
});

// or, with custom error/unknown-event behaviour:
invoicaWebhookHandler(secret, {
  handlers: {
    'mandate.completed': async (event) => { /* ... */ },
  },
  onUnknown: async (rawType, parsedBody, req, res) => {
    // forward-compat: log & queue for later.
  },
  onInvalid: async (error, req, res) => {
    metrics.increment('invoica.webhook.invalid', { error });
  },
});
```

Behaviour:

- Signature invalid → 401, `onInvalid` called if supplied.
- Signature valid, event known, handler registered → handler awaited, then 200.
- Signature valid, event known, no handler → 200 (so Invoica doesn't retry).
- Signature valid, event type unknown → `onUnknown` called (or `console.warn`), then 200.
- Handler throws → `next(err)` so Express's error middleware handles it.

### Event types

Production-fired today (each is a `WebhookEventBase<type, payload>`):

| Type                            | Payload          | Fired by                                   |
| ------------------------------- | ---------------- | ------------------------------------------ |
| `mandate.proposed`              | `MandatePayload` | `mandate.propose()`                        |
| `mandate.signed_by_proposer`    | `MandatePayload` | `mandate.sign({signer: 'proposer'})`       |
| `mandate.signed_by_both`        | `MandatePayload` | `mandate.sign({signer: 'counterparty'})`   |
| `mandate.completed`             | `MandatePayload` | `mandate.complete()`                       |
| `mandate.disputed`              | `MandatePayload` | `mandate.dispute()`                        |
| `invoice.created`               | `InvoicePayload` | invoice creation hook                      |
| `invoice.settled`               | `InvoicePayload` | settlement detection                       |
| `invoice.completed`             | `InvoicePayload` | settlement confirmation                    |

Not currently dispatched (states exist on the schema, but no webhook fires yet — will be added when the backend handler does):

- `mandate.in_progress` — handler advances implicitly inside `complete()`.
- `mandate.expired` — no caller fires the `expire` action yet.
- `invoice.cancelled`, `invoice.refunded` — schema-only.

If you need one of these, file an issue against the backend, not against this SDK.

### Headers

```ts
import { INVOICA_HEADERS } from '@invoica/webhooks-receiver';
// {
//   signature: 'x-invoica-signature',
//   event:     'x-invoica-event',
//   timestamp: 'x-invoica-timestamp',
// }
```

### Forward-compat: unknown events

When Invoica ships a new event type before you upgrade, `verifyWebhook` returns `{ valid: false, error: 'unknown_event_type:foo.bar' }` so you can decide: 200-and-log, 400-and-alert, or queue for later. The Express middleware routes these to `onUnknown` if you supply it, otherwise 200s with a `console.warn`.

## License

Apache-2.0 — matches the `@godman-protocols` family.
