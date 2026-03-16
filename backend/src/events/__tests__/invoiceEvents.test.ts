const mockPublish = jest.fn();

jest.mock('../../lib/redis', () => ({
  redis: { publish: (...args: unknown[]) => mockPublish(...args) },
}));

import { createInvoiceEvent } from '../invoiceEvents';

describe('createInvoiceEvent', () => {
  beforeEach(() => {
    mockPublish.mockClear();
  });

  it('publishes to the invoice-events channel', async () => {
    mockPublish.mockResolvedValueOnce(undefined);
    await createInvoiceEvent('invoice.created', { invoiceId: 'inv-001' });
    expect(mockPublish).toHaveBeenCalledWith('invoice-events', expect.any(String));
  });

  it('publishes a valid JSON string containing the event type', async () => {
    mockPublish.mockResolvedValueOnce(undefined);
    await createInvoiceEvent('invoice.paid', { invoiceId: 'inv-002', amount: 500 });
    const published = mockPublish.mock.calls[0][1] as string;
    const parsed = JSON.parse(published);
    expect(parsed.type).toBe('invoice.paid');
    expect(parsed.payload.invoiceId).toBe('inv-002');
    expect(parsed.payload.amount).toBe(500);
  });

  it('includes a timestamp in the published event', async () => {
    mockPublish.mockResolvedValueOnce(undefined);
    await createInvoiceEvent('invoice.settled', { invoiceId: 'inv-003' });
    const published = JSON.parse(mockPublish.mock.calls[0][1] as string);
    expect(published.timestamp).toBeDefined();
    expect(new Date(published.timestamp).toISOString()).toBe(published.timestamp);
  });

  it('does not throw when Redis publish throws (graceful degradation)', async () => {
    mockPublish.mockRejectedValueOnce(new Error('Redis not configured'));
    await expect(
      createInvoiceEvent('invoice.cancelled', { invoiceId: 'inv-004' })
    ).resolves.toBeUndefined();
  });

  it('works with all standard InvoiceEventType values', async () => {
    mockPublish.mockResolvedValue(undefined);
    const types = ['invoice.created', 'invoice.updated', 'invoice.paid', 'invoice.settled', 'invoice.cancelled'] as const;
    for (const type of types) {
      await expect(createInvoiceEvent(type, { invoiceId: 'test' })).resolves.toBeUndefined();
    }
    expect(mockPublish).toHaveBeenCalledTimes(types.length);
  });
});
