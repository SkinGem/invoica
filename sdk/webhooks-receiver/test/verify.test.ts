import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyWebhook, isKnownEventType } from '../src/verify';
import type { InvoicaWebhookEvent } from '../src/types';

const SECRET = 'this-is-a-16-plus-char-test-secret';

function sign(body: string, secret: string = SECRET): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

function envelope<T extends string, D>(type: T, data: D): { id: string; type: T; data: D; createdAt: string } {
  return {
    id: 'evt_00000000-0000-4000-8000-000000000000',
    type,
    data,
    createdAt: '2026-05-23T12:00:00.000Z',
  };
}

const MANDATE_DATA = {
  id: 'mnd_abc',
  proposer_agent_id: 'agent_a',
  counterparty_agent_id: 'agent_b',
  scope: 'demo scope',
  terms: { foo: 'bar' },
  context: { source: 'helixa_synagent_tg_bot' },
  state: 'signed_by_both' as const,
  pact_mandate_hash: '0xdeadbeef',
  pact_version: 'v0.3.2',
  proposer_signature: 'sig_a',
  counterparty_signature: 'sig_b',
  signed_by_proposer_at: '2026-05-23T11:00:00.000Z',
  signed_by_counterparty_at: '2026-05-23T11:30:00.000Z',
  completed_at: null,
  disputed_at: null,
  dispute_reason: null,
  expires_at: '2026-06-23T00:00:00.000Z',
  drs_receipt_id: null,
  issuer_customer_id: 'cus_helixa',
  created_at: '2026-05-23T10:00:00.000Z',
  updated_at: '2026-05-23T11:30:00.000Z',
};

describe('verifyWebhook', () => {
  it('returns the typed event for a valid signature', () => {
    const body = JSON.stringify(envelope('mandate.signed_by_both', MANDATE_DATA));
    const result = verifyWebhook(body, sign(body), SECRET);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.event.type).toBe('mandate.signed_by_both');
      // Type-narrowing: data is MandatePayload, so .scope is typed.
      expect(result.event.data.scope).toBe('demo scope');
      // Discriminator works for all event variants in the union.
      const ev: InvoicaWebhookEvent = result.event;
      if (ev.type === 'mandate.signed_by_both') {
        expect(ev.data.state).toBe('signed_by_both');
      }
    }
  });

  it('returns valid:false with signature_mismatch for a bad signature', () => {
    const body = JSON.stringify(envelope('invoice.settled', { id: 'inv_1' }));
    const result = verifyWebhook(body, sign(body, 'wrong-secret-padded-long'), SECRET);
    expect(result).toEqual({ valid: false, error: 'signature_mismatch' });
  });

  it('returns valid:false on length-mismatched signature (no throw)', () => {
    const body = JSON.stringify(envelope('invoice.settled', { id: 'inv_1' }));
    const result = verifyWebhook(body, 'deadbeef', SECRET);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe('signature_mismatch');
  });

  it('returns valid:false on non-hex signature', () => {
    const body = JSON.stringify(envelope('invoice.settled', { id: 'inv_1' }));
    const result = verifyWebhook(body, 'not-a-hex-string!!', SECRET);
    expect(result).toEqual({ valid: false, error: 'signature_mismatch' });
  });

  it('returns valid:false on missing signature', () => {
    const body = JSON.stringify(envelope('invoice.settled', { id: 'inv_1' }));
    const result = verifyWebhook(body, null, SECRET);
    expect(result).toEqual({ valid: false, error: 'missing_signature' });
  });

  it('returns valid:false on missing secret', () => {
    const body = JSON.stringify(envelope('invoice.settled', { id: 'inv_1' }));
    const result = verifyWebhook(body, sign(body), '');
    expect(result).toEqual({ valid: false, error: 'missing_secret' });
  });

  it('returns valid:false on malformed JSON body even if signature matches', () => {
    const body = 'not json {{{';
    const result = verifyWebhook(body, sign(body), SECRET);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe('invalid_json');
  });

  it('returns valid:false on a JSON body missing envelope fields', () => {
    const body = JSON.stringify({ foo: 'bar' });
    const result = verifyWebhook(body, sign(body), SECRET);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe('malformed_envelope');
  });

  it('flags unknown event types distinctly (signature-valid but unrecognised)', () => {
    const body = JSON.stringify(envelope('mandate.escalated', MANDATE_DATA));
    const result = verifyWebhook(body, sign(body), SECRET);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe('unknown_event_type:mandate.escalated');
    }
  });

  it('accepts Buffer body (Express express.raw case)', () => {
    const bodyStr = JSON.stringify(envelope('invoice.created', { id: 'inv_1' }));
    const buf = Buffer.from(bodyStr, 'utf8');
    const result = verifyWebhook(buf, sign(bodyStr), SECRET);
    expect(result.valid).toBe(true);
  });

  it('accepts Uint8Array body (edge runtime case)', () => {
    const bodyStr = JSON.stringify(envelope('invoice.created', { id: 'inv_1' }));
    const arr = new Uint8Array(Buffer.from(bodyStr, 'utf8'));
    const result = verifyWebhook(arr, sign(bodyStr), SECRET);
    expect(result.valid).toBe(true);
  });

  it('does not throw on any pathological input', () => {
    expect(() => verifyWebhook('', '', '')).not.toThrow();
    expect(() => verifyWebhook('x', 'y', 'z')).not.toThrow();
  });
});

describe('isKnownEventType', () => {
  it('returns true for every event in the production union', () => {
    const all = [
      'mandate.proposed',
      'mandate.signed_by_proposer',
      'mandate.signed_by_both',
      'mandate.completed',
      'mandate.disputed',
      'invoice.created',
      'invoice.settled',
      'invoice.completed',
    ];
    for (const t of all) expect(isKnownEventType(t)).toBe(true);
  });

  it('returns false for unregistered events', () => {
    expect(isKnownEventType('mandate.expired')).toBe(false);
    expect(isKnownEventType('invoice.cancelled')).toBe(false);
    expect(isKnownEventType('something.else')).toBe(false);
  });
});
