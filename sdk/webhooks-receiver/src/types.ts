/**
 * Discriminated-union types for every webhook event Invoica fires in production.
 *
 * Source of truth: backend/src/services/mandate/handler.ts (fires mandate.* events)
 *                  backend/src/services/webhook/events.ts   (envelope shape)
 *                  backend/src/services/webhook/dispatch.ts (headers + body framing)
 *                  backend/src/routes/webhooks.ts           (registered event types)
 *                  backend/src/services/mandate/repo.ts     (MandateRow payload shape)
 *
 * If you need an event that isn't in this union, the backend isn't dispatching it
 * yet — file an issue, don't fork the types.
 */
export type MandateState =
  | 'proposed'
  | 'signed_by_proposer'
  | 'signed_by_both'
  | 'in_progress'
  | 'completed'
  | 'disputed'
  | 'expired';

/**
 * Full mandate row as persisted in PostgreSQL and sent verbatim as `data` for
 * every `mandate.*` event.
 *
 * Note: `terms` is JSONB and free-form per PACT spec. `context` is opaque
 * per-partner metadata (e.g. {source: "helixa_synagent_tg_bot", chat_id: "..."}).
 */
export interface MandatePayload {
  id: string;
  proposer_agent_id: string;
  counterparty_agent_id: string;
  scope: string;
  terms: unknown;
  context: Record<string, unknown>;
  state: MandateState;
  pact_mandate_hash: string | null;
  pact_version: string;
  proposer_signature: string | null;
  counterparty_signature: string | null;
  signed_by_proposer_at: string | null;
  signed_by_counterparty_at: string | null;
  completed_at: string | null;
  disputed_at: string | null;
  dispute_reason: string | null;
  expires_at: string;
  drs_receipt_id: string | null;
  issuer_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Invoice payload — mirrors the Prisma Invoice row shape. Decimal fields arrive
 * as strings over the wire (Prisma.Decimal serializes that way).
 */
export interface InvoicePayload {
  id: string;
  invoiceNumber: number;
  status: 'PENDING' | 'SETTLED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  amount: string | number;
  currency: string;
  customerEmail: string;
  customerName: string;
  paymentDetails: Record<string, unknown> | null;
  settledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Base envelope every event shares (see backend/src/services/webhook/events.ts).
 */
export interface WebhookEventBase<TType extends string, TData> {
  /** UUID v4, assigned at dispatch time. */
  id: string;
  /** Discriminator. */
  type: TType;
  /** Event-specific payload. */
  data: TData;
  /** ISO 8601 timestamp at dispatch. */
  createdAt: string;
}

/**
 * Production-fired mandate events. State-machine knows `in_progress` and `expired`
 * too, but the v0.1 handler does NOT dispatch webhooks for those transitions yet
 * (`in_progress` happens implicitly inside `complete`; `expired` has no caller).
 * They will be added once the backend handler fires them.
 */
export type MandateProposedEvent          = WebhookEventBase<'mandate.proposed',          MandatePayload>;
export type MandateSignedByProposerEvent  = WebhookEventBase<'mandate.signed_by_proposer', MandatePayload>;
export type MandateSignedByBothEvent      = WebhookEventBase<'mandate.signed_by_both',    MandatePayload>;
export type MandateCompletedEvent         = WebhookEventBase<'mandate.completed',         MandatePayload>;
export type MandateDisputedEvent          = WebhookEventBase<'mandate.disputed',          MandatePayload>;

/**
 * Production-registered invoice events (see WEBHOOK_EVENT_TYPES in
 * backend/src/routes/webhooks.ts). `invoice.cancelled` and `invoice.refunded`
 * exist as Invoice statuses in the schema but the dispatcher does not yet
 * fire webhooks for those state changes.
 */
export type InvoiceCreatedEvent   = WebhookEventBase<'invoice.created',   InvoicePayload>;
export type InvoiceSettledEvent   = WebhookEventBase<'invoice.settled',   InvoicePayload>;
export type InvoiceCompletedEvent = WebhookEventBase<'invoice.completed', InvoicePayload>;

/**
 * Discriminated union of every event Invoica currently sends. Switch on `.type`
 * to narrow to a specific payload.
 */
export type InvoicaWebhookEvent =
  | MandateProposedEvent
  | MandateSignedByProposerEvent
  | MandateSignedByBothEvent
  | MandateCompletedEvent
  | MandateDisputedEvent
  | InvoiceCreatedEvent
  | InvoiceSettledEvent
  | InvoiceCompletedEvent;

export type InvoicaWebhookEventType = InvoicaWebhookEvent['type'];

/**
 * Map from event type string to its event object — useful for handler tables.
 */
export type EventByType<T extends InvoicaWebhookEventType> = Extract<
  InvoicaWebhookEvent,
  { type: T }
>;

/**
 * HTTP header names Invoica sets on every dispatched request.
 * Header lookup in Express is case-insensitive, but partners parsing raw
 * headers (Lambda, edge runtimes) need the canonical names.
 */
export const INVOICA_HEADERS = {
  signature: 'x-invoica-signature',
  event:     'x-invoica-event',
  timestamp: 'x-invoica-timestamp',
} as const;

/**
 * Result of verifyWebhook. Discriminated by `valid` so partners can branch
 * cleanly without try/catch.
 */
export type VerifyResult =
  | { valid: true;  event: InvoicaWebhookEvent }
  | { valid: false; error: string };
