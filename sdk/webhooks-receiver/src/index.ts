/**
 * @invoica/webhooks-receiver — typed Invoica webhook verification + dispatch.
 *
 * Three entry points:
 *   - `verifyWebhook(body, signature, secret)` — raw HMAC + payload typing.
 *   - `invoicaWebhookHandler(secret, handlers)` — Express middleware sugar.
 *   - The full event-type union, for partners building custom routing layers.
 */
export { verifyWebhook, isKnownEventType } from './verify.js';
export { invoicaWebhookHandler } from './express.js';

export type {
  EventHandler,
  UnknownEventHandler,
  InvoicaWebhookHandlerOptions,
} from './express.js';

export type {
  InvoicaWebhookEvent,
  InvoicaWebhookEventType,
  EventByType,
  MandatePayload,
  MandateState,
  InvoicePayload,
  WebhookEventBase,
  VerifyResult,
  MandateProposedEvent,
  MandateSignedByProposerEvent,
  MandateSignedByBothEvent,
  MandateCompletedEvent,
  MandateDisputedEvent,
  InvoiceCreatedEvent,
  InvoiceSettledEvent,
  InvoiceCompletedEvent,
} from './types.js';

export { INVOICA_HEADERS } from './types.js';
