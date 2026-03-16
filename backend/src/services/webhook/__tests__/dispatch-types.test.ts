import {
  DEFAULT_RETRY_CONFIG,
  RetryConfig,
  RetryResult,
  WebhookPayload,
} from '../dispatch.types';

// ---------------------------------------------------------------------------
// DEFAULT_RETRY_CONFIG constant
// ---------------------------------------------------------------------------
describe('DEFAULT_RETRY_CONFIG', () => {
  it('has maxRetries of 3', () => {
    expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
  });

  it('has exactly 3 delay values', () => {
    expect(DEFAULT_RETRY_CONFIG.delays).toHaveLength(3);
  });

  it('delays are [1000, 5000, 15000]', () => {
    expect(DEFAULT_RETRY_CONFIG.delays).toEqual([1000, 5000, 15000]);
  });

  it('delays increase progressively', () => {
    const d = DEFAULT_RETRY_CONFIG.delays;
    expect(d[0]).toBeLessThan(d[1]);
    expect(d[1]).toBeLessThan(d[2]);
  });

  it('satisfies RetryConfig interface shape', () => {
    const config: RetryConfig = DEFAULT_RETRY_CONFIG;
    expect(typeof config.maxRetries).toBe('number');
    expect(Array.isArray(config.delays)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// RetryResult interface
// ---------------------------------------------------------------------------
describe('RetryResult shape', () => {
  it('constructs a successful result with null error', () => {
    const result: RetryResult = {
      success: true,
      attempts: 1,
      error: null,
      lastResponse: { status: 200 },
    };
    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.attempts).toBe(1);
  });

  it('constructs a failed result with an Error', () => {
    const err = new Error('Network error');
    const result: RetryResult = {
      success: false,
      attempts: 3,
      error: err,
      lastResponse: null,
    };
    expect(result.success).toBe(false);
    expect(result.error).toBe(err);
    expect(result.attempts).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// WebhookPayload interface
// ---------------------------------------------------------------------------
describe('WebhookPayload shape', () => {
  it('constructs a valid payload with all required fields', () => {
    const payload: WebhookPayload = {
      event: 'invoice.settled',
      data: { invoiceId: 'inv-001', amount: 100 },
      timestamp: new Date().toISOString(),
      deliveryId: 'del-abc123',
    };
    expect(payload.event).toBe('invoice.settled');
    expect(payload.data.invoiceId).toBe('inv-001');
    expect(typeof payload.timestamp).toBe('string');
    expect(payload.deliveryId).toBe('del-abc123');
  });

  it('accepts nested data objects', () => {
    const payload: WebhookPayload = {
      event: 'payment.received',
      data: { nested: { deep: { value: 42 } } },
      timestamp: '2026-03-16T00:00:00Z',
      deliveryId: 'del-xyz',
    };
    expect((payload.data.nested as any).deep.value).toBe(42);
  });
});
