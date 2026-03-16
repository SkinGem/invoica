import { createApiKeySchema, apiKeyQuerySchema, rotateApiKeySchema } from '../api-key-schemas';

// Edge cases not covered by api-key-schemas.test.ts

describe('createApiKeySchema — edge cases', () => {
  it('accepts all 5 valid scopes simultaneously', () => {
    const result = createApiKeySchema.safeParse({
      name: 'full-access-key',
      scopes: [
        'invoices:read',
        'invoices:write',
        'settlements:read',
        'webhooks:manage',
        'api-keys:manage',
      ],
    });
    expect(result.success).toBe(true);
    expect(result.data?.scopes).toHaveLength(5);
  });

  it('rejects non-integer expiresInDays (e.g. 30.5)', () => {
    const result = createApiKeySchema.safeParse({ name: 'key', expiresInDays: 30.5 });
    expect(result.success).toBe(false);
  });
});

describe('apiKeyQuerySchema — edge cases', () => {
  it('rejects limit=0 (min is 1)', () => {
    const result = apiKeyQuerySchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects limit=101 (max is 100)', () => {
    const result = apiKeyQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('accepts status=revoked', () => {
    const result = apiKeyQuerySchema.safeParse({ status: 'revoked' });
    expect(result.success).toBe(true);
  });

  it('accepts status=expired', () => {
    const result = apiKeyQuerySchema.safeParse({ status: 'expired' });
    expect(result.success).toBe(true);
  });
});

describe('rotateApiKeySchema — edge cases', () => {
  it('rejects non-integer expiresInDays (e.g. 1.5)', () => {
    const result = rotateApiKeySchema.safeParse({ expiresInDays: 1.5 });
    expect(result.success).toBe(false);
  });

  it('rejects expiresInDays=0 (must be positive)', () => {
    const result = rotateApiKeySchema.safeParse({ expiresInDays: 0 });
    expect(result.success).toBe(false);
  });
});
