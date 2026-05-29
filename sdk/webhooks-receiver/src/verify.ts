/**
 * verifyWebhook — HMAC-SHA256 signature verification + typed-event parsing.
 *
 * Algorithm MUST match backend/src/services/webhook/signature.ts exactly:
 *   - Take the raw request body as a UTF-8 string (NOT JSON.parse-then-stringify;
 *     re-serialising can reorder keys and break the signature — this is the
 *     canonicalisation gotcha Helixa hit).
 *   - Compute HMAC-SHA256(secret, body) → hex digest.
 *   - Compare buffers in constant time via crypto.timingSafeEqual.
 *   - Length-mismatch is an immediate fail (not a throw).
 */
import { createHmac, timingSafeEqual } from 'crypto';
import type {
  InvoicaWebhookEvent,
  InvoicaWebhookEventType,
  VerifyResult,
} from './types.js';

const KNOWN_EVENT_TYPES: ReadonlySet<InvoicaWebhookEventType> = new Set([
  'mandate.proposed',
  'mandate.signed_by_proposer',
  'mandate.signed_by_both',
  'mandate.completed',
  'mandate.disputed',
  'invoice.created',
  'invoice.settled',
  'invoice.completed',
]);

/**
 * Convert request body to a UTF-8 string without re-serialising it.
 * Express's `express.raw()` (or `express.json({ verify })`) gives you a Buffer.
 * Hono/Fastify/edge runtimes give you a string. We accept both.
 */
function bodyToString(body: string | Buffer | Uint8Array): string {
  if (typeof body === 'string') return body;
  if (Buffer.isBuffer(body)) return body.toString('utf8');
  if (body instanceof Uint8Array) return Buffer.from(body).toString('utf8');
  // Defensive: cast to satisfy strict mode for the unreachable branch.
  throw new TypeError(
    'verifyWebhook: body must be a string, Buffer, or Uint8Array — got ' +
      typeof body,
  );
}

/**
 * Constant-time hex comparison. Returns false on length mismatch instead of
 * letting timingSafeEqual throw.
 */
function safeHexEqual(a: string, b: string): boolean {
  // Fast reject on obviously bad inputs.
  if (!/^[0-9a-fA-F]+$/.test(a) || !/^[0-9a-fA-F]+$/.test(b)) return false;
  const aBuf = Buffer.from(a, 'hex');
  const bBuf = Buffer.from(b, 'hex');
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Verify a webhook signature and parse the payload into a typed event.
 *
 * Returns `{ valid: true, event }` on success, `{ valid: false, error }` on
 * any failure. Never throws — partners want explicit failure modes for
 * logging / metrics / 401 vs 400 routing.
 *
 * @param body      Raw request body (string preferred; Buffer/Uint8Array also fine).
 *                  CRITICAL: this must be the bytes Invoica signed. If you
 *                  JSON.parse and re-stringify, the signature will fail because
 *                  key order may change.
 * @param signature The value of the `X-Invoica-Signature` header (hex string).
 * @param secret    The shared secret you registered with `POST /v1/webhooks`.
 */
export function verifyWebhook(
  body: string | Buffer | Uint8Array,
  signature: string | undefined | null,
  secret: string,
): VerifyResult {
  if (!secret || typeof secret !== 'string') {
    return { valid: false, error: 'missing_secret' };
  }
  if (!signature || typeof signature !== 'string') {
    return { valid: false, error: 'missing_signature' };
  }

  let bodyStr: string;
  try {
    bodyStr = bodyToString(body);
  } catch (e) {
    return { valid: false, error: (e as Error).message };
  }

  const expected = createHmac('sha256', secret).update(bodyStr).digest('hex');
  if (!safeHexEqual(expected, signature)) {
    return { valid: false, error: 'signature_mismatch' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyStr);
  } catch {
    return { valid: false, error: 'invalid_json' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'payload_not_object' };
  }

  const candidate = parsed as Record<string, unknown>;
  if (
    typeof candidate['id']        !== 'string' ||
    typeof candidate['type']      !== 'string' ||
    typeof candidate['createdAt'] !== 'string' ||
    !('data' in candidate)
  ) {
    return { valid: false, error: 'malformed_envelope' };
  }

  // Signature is valid + envelope shape matches. If the event type is unknown,
  // surface that to the caller as a distinct failure mode so they can either
  // 200-and-log (forward-compat) or 400-and-alert (strict mode).
  if (!KNOWN_EVENT_TYPES.has(candidate['type'] as InvoicaWebhookEventType)) {
    return { valid: false, error: `unknown_event_type:${candidate['type']}` };
  }

  return { valid: true, event: candidate as unknown as InvoicaWebhookEvent };
}

/**
 * Re-export of the type-guard predicate so partners can build their own
 * dispatcher tables without importing internals.
 */
export function isKnownEventType(t: string): t is InvoicaWebhookEventType {
  return KNOWN_EVENT_TYPES.has(t as InvoicaWebhookEventType);
}
