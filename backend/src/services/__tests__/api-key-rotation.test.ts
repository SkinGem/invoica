import { ApiKeyRotationService, ApiKeyRotationError } from '../api-key-rotation';

// Chainable mock for select-based queries (terminal: .single() or .order())
function selectChain(result: any) {
  const c: any = {};
  const ret = jest.fn().mockReturnValue(c);
  c.select = ret;
  c.insert = ret;
  c.eq = ret;
  c.or = ret;
  c.order = jest.fn().mockResolvedValue(result);
  c.single = jest.fn().mockResolvedValue(result);
  return c;
}

// Mock for insert chains: insert().select().single()
function insertChain(result: any) {
  const inner: any = {};
  inner.select = jest.fn().mockReturnValue(inner);
  inner.single = jest.fn().mockResolvedValue(result);
  return { insert: jest.fn().mockReturnValue(inner) };
}

// Mock for update chains: update().eq() — eq is terminal/awaitable
function updateChain(result: any) {
  return { update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue(result) }) };
}

function makeService(mockFrom: jest.Mock) {
  return new ApiKeyRotationService({ from: mockFrom } as any);
}

const MOCK_KEY = {
  id: 'key-001',
  user_id: 'user-001',
  prefix: 'ik_live_',
  last_four: 'abcd',
  created_at: '2026-01-01T00:00:00Z',
  expires_at: null,
  is_active: true,
};

describe('ApiKeyRotationService.rotateKey', () => {
  it('returns newKey, newKeyId, and expiresOldKeyAt on success', async () => {
    const mockFrom = jest.fn()
      .mockReturnValueOnce(selectChain({ data: MOCK_KEY, error: null }))
      .mockReturnValueOnce(insertChain({ data: { id: 'new-001' }, error: null }))
      .mockReturnValueOnce(updateChain({ error: null }));

    const result = await makeService(mockFrom).rotateKey('key-001', 'user-001');

    expect(result.newKey).toMatch(/^ik_live_[a-f0-9]{64}$/);
    expect(result.newKeyId).toBe('new-001');
    expect(result.expiresOldKeyAt).toBeInstanceOf(Date);
    // Grace period: expires ~24h from now
    const inTwentyFourHours = Date.now() + 24 * 60 * 60 * 1000;
    expect(result.expiresOldKeyAt.getTime()).toBeLessThanOrEqual(inTwentyFourHours + 1000);
  });

  it('throws KEY_NOT_FOUND when key does not exist for user', async () => {
    const mockFrom = jest.fn()
      .mockReturnValueOnce(selectChain({ data: null, error: null }));

    await expect(makeService(mockFrom).rotateKey('key-999', 'user-001'))
      .rejects.toMatchObject({ code: 'KEY_NOT_FOUND', statusCode: 404 });
  });

  it('throws KEY_NOT_FOUND when Supabase fetch returns an error', async () => {
    const mockFrom = jest.fn()
      .mockReturnValueOnce(selectChain({ data: null, error: { message: 'DB error' } }));

    await expect(makeService(mockFrom).rotateKey('key-001', 'user-001'))
      .rejects.toBeInstanceOf(ApiKeyRotationError);
  });

  it('throws INSERT_FAILED when new key insert returns error', async () => {
    const mockFrom = jest.fn()
      .mockReturnValueOnce(selectChain({ data: MOCK_KEY, error: null }))
      .mockReturnValueOnce(insertChain({ data: null, error: { message: 'insert failed' } }));

    await expect(makeService(mockFrom).rotateKey('key-001', 'user-001'))
      .rejects.toMatchObject({ code: 'INSERT_FAILED', statusCode: 500 });
  });

  it('throws INVALID_KEY_ID for empty oldKeyId', async () => {
    await expect(makeService(jest.fn()).rotateKey('', 'user-001'))
      .rejects.toMatchObject({ code: 'INVALID_KEY_ID', statusCode: 400 });
  });

  it('throws INVALID_USER_ID for empty userId', async () => {
    await expect(makeService(jest.fn()).rotateKey('key-001', ''))
      .rejects.toMatchObject({ code: 'INVALID_USER_ID', statusCode: 400 });
  });
});

describe('ApiKeyRotationService.revokeKey', () => {
  it('resolves without error when key is active and owned by user', async () => {
    const mockFrom = jest.fn()
      .mockReturnValueOnce(selectChain({ data: MOCK_KEY, error: null }))
      .mockReturnValueOnce(updateChain({ error: null }));

    await expect(makeService(mockFrom).revokeKey('key-001', 'user-001'))
      .resolves.toBeUndefined();
  });

  it('throws KEY_NOT_FOUND when key does not exist', async () => {
    const mockFrom = jest.fn()
      .mockReturnValueOnce(selectChain({ data: null, error: null }));

    await expect(makeService(mockFrom).revokeKey('key-999', 'user-001'))
      .rejects.toMatchObject({ code: 'KEY_NOT_FOUND', statusCode: 404 });
  });

  it('throws KEY_ALREADY_REVOKED when key is already inactive', async () => {
    const mockFrom = jest.fn()
      .mockReturnValueOnce(selectChain({ data: { ...MOCK_KEY, is_active: false }, error: null }));

    await expect(makeService(mockFrom).revokeKey('key-001', 'user-001'))
      .rejects.toMatchObject({ code: 'KEY_ALREADY_REVOKED', statusCode: 400 });
  });

  it('throws REVOKE_FAILED when update returns a DB error', async () => {
    const mockFrom = jest.fn()
      .mockReturnValueOnce(selectChain({ data: MOCK_KEY, error: null }))
      .mockReturnValueOnce(updateChain({ error: { message: 'update failed' } }));

    await expect(makeService(mockFrom).revokeKey('key-001', 'user-001'))
      .rejects.toMatchObject({ code: 'REVOKE_FAILED', statusCode: 500 });
  });
});

describe('ApiKeyRotationService.listKeys', () => {
  it('returns sanitized ApiKey array with correctly mapped fields', async () => {
    const mockRow = {
      id: 'key-001',
      user_id: 'user-001',
      prefix: 'ik_live_',
      last_four: 'abcd',
      created_at: '2026-01-01T00:00:00Z',
      expires_at: null,
      is_active: true,
    };
    const mockFrom = jest.fn()
      .mockReturnValueOnce(selectChain({ data: [mockRow], error: null }));

    const result = await makeService(mockFrom).listKeys('user-001');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'key-001',
      userId: 'user-001',
      prefix: 'ik_live_',
      lastFour: 'abcd',
      isActive: true,
      expiresAt: null,
    });
    expect(result[0].createdAt).toBeInstanceOf(Date);
  });

  it('returns empty array when user has no keys', async () => {
    const mockFrom = jest.fn()
      .mockReturnValueOnce(selectChain({ data: [], error: null }));

    const result = await makeService(mockFrom).listKeys('user-empty');
    expect(result).toEqual([]);
  });

  it('throws INVALID_USER_ID for empty userId', async () => {
    await expect(makeService(jest.fn()).listKeys(''))
      .rejects.toMatchObject({ code: 'INVALID_USER_ID', statusCode: 400 });
  });
});
