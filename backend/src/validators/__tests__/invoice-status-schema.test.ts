import { updateInvoiceStatusSchema } from '../invoice-schemas';

describe('updateInvoiceStatusSchema', () => {
  test('accepts PENDING', () => {
    expect(updateInvoiceStatusSchema.safeParse({ status: 'PENDING' }).success).toBe(true);
  });

  test('accepts PROCESSING', () => {
    expect(updateInvoiceStatusSchema.safeParse({ status: 'PROCESSING' }).success).toBe(true);
  });

  test('accepts SETTLED', () => {
    expect(updateInvoiceStatusSchema.safeParse({ status: 'SETTLED' }).success).toBe(true);
  });

  test('accepts COMPLETED', () => {
    expect(updateInvoiceStatusSchema.safeParse({ status: 'COMPLETED' }).success).toBe(true);
  });

  test('rejects lowercase status', () => {
    expect(updateInvoiceStatusSchema.safeParse({ status: 'pending' }).success).toBe(false);
  });

  test('rejects unknown status value', () => {
    expect(updateInvoiceStatusSchema.safeParse({ status: 'CANCELLED' }).success).toBe(false);
  });

  test('rejects missing status field', () => {
    expect(updateInvoiceStatusSchema.safeParse({}).success).toBe(false);
  });
});
