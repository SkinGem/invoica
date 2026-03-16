import { createInvoiceSchema, updateInvoiceSchema, invoiceQuerySchema } from '../invoice-schemas';

// Edge cases not covered by invoice-schemas.test.ts

describe('updateInvoiceSchema — edge cases', () => {
  it('valid: metadata-only update', () => {
    const result = updateInvoiceSchema.safeParse({ metadata: { key: 'value' } });
    expect(result.success).toBe(true);
  });

  it('valid: description + status together', () => {
    const result = updateInvoiceSchema.safeParse({ description: 'Updated', status: 'processing' });
    expect(result.success).toBe(true);
  });

  it('valid: all three fields at once', () => {
    const result = updateInvoiceSchema.safeParse({
      status: 'completed',
      description: 'Done',
      metadata: { invoiceRef: 'INV-001' },
    });
    expect(result.success).toBe(true);
  });

  it('valid: status=pending', () => {
    expect(updateInvoiceSchema.safeParse({ status: 'pending' }).success).toBe(true);
  });

  it('valid: status=processing', () => {
    expect(updateInvoiceSchema.safeParse({ status: 'processing' }).success).toBe(true);
  });

  it('valid: status=failed', () => {
    expect(updateInvoiceSchema.safeParse({ status: 'failed' }).success).toBe(true);
  });

  it('invalid: description too long (>500 chars)', () => {
    const result = updateInvoiceSchema.safeParse({ description: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });
});

describe('invoiceQuerySchema — status filter', () => {
  it('accepts status=pending', () => {
    expect(invoiceQuerySchema.safeParse({ status: 'pending' }).success).toBe(true);
  });

  it('accepts status=processing', () => {
    expect(invoiceQuerySchema.safeParse({ status: 'processing' }).success).toBe(true);
  });

  it('accepts status=completed', () => {
    expect(invoiceQuerySchema.safeParse({ status: 'completed' }).success).toBe(true);
  });

  it('accepts status=failed', () => {
    expect(invoiceQuerySchema.safeParse({ status: 'failed' }).success).toBe(true);
  });

  it('rejects invalid status value', () => {
    expect(invoiceQuerySchema.safeParse({ status: 'cancelled' }).success).toBe(false);
  });
});

describe('createInvoiceSchema — edge cases', () => {
  it('rejects invalid UUID for customerId', () => {
    const result = createInvoiceSchema.safeParse({ amount: 100, currency: 'USD', customerId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects description over 500 chars', () => {
    const result = createInvoiceSchema.safeParse({ amount: 100, currency: 'USD', description: 'x'.repeat(501) });
    expect(result.success).toBe(false);
  });
});
