jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

import { createClient } from '@supabase/supabase-js';
import { SupabaseApiKeyRepository } from '../api-key-repo-supabase';

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

// Build a chainable Supabase query mock with a configurable terminal resolution
function buildChain(result: any) {
  const c: any = {};
  const ret = jest.fn().mockReturnValue(c);
  c.select = ret;
  c.insert = ret;
  c.update = ret;
  c.delete = ret;
  c.eq = ret;
  c.limit = ret;
  c.order = ret;
  c.single = jest.fn().mockResolvedValue(result);
  return c;
}

function mockSb(chain: any) {
  (createClient as jest.Mock).mockReturnValue({ from: jest.fn(() => chain) });
}

const MOCK_ROW = {
  id: 'key-001',
  customerId: 'cust-001',
  customerEmail: 'agent@test.com',
  keyHash: 'hashval',
  keyPrefix: 'sk_abcd',
  name: 'Test Key',
  tier: 'gold',
  plan: 'pro',
  permissions: ['read', 'write'],
  isActive: true,
  expiresAt: null,
  lastUsedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('SupabaseApiKeyRepository.findById', () => {
  it('returns null when row not found', async () => {
    mockSb(buildChain({ data: null, error: null }));
    const repo = new SupabaseApiKeyRepository();
    expect(await repo.findById('key-999')).toBeNull();
  });

  it('returns mapped ApiKey with correct field names', async () => {
    mockSb(buildChain({ data: MOCK_ROW, error: null }));
    const repo = new SupabaseApiKeyRepository();
    const result = await repo.findById('key-001');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('key-001');
    expect(result!.customerId).toBe('cust-001');
    expect(result!.keyHash).toBe('hashval');
    expect(result!.isActive).toBe(true);
    expect(result!.createdAt).toBeInstanceOf(Date);
  });
});

describe('SupabaseApiKeyRepository.findByCustomerId', () => {
  it('returns array of mapped keys', async () => {
    const chain = buildChain(null);
    chain.eq = jest.fn().mockResolvedValue({ data: [MOCK_ROW], error: null });
    (createClient as jest.Mock).mockReturnValue({ from: jest.fn(() => chain) });

    const repo = new SupabaseApiKeyRepository();
    const result = await repo.findByCustomerId('cust-001');
    expect(result).toHaveLength(1);
    expect(result[0].customerId).toBe('cust-001');
  });

  it('returns empty array when no rows found', async () => {
    const chain = buildChain(null);
    chain.eq = jest.fn().mockResolvedValue({ data: null, error: null });
    (createClient as jest.Mock).mockReturnValue({ from: jest.fn(() => chain) });

    const repo = new SupabaseApiKeyRepository();
    expect(await repo.findByCustomerId('cust-empty')).toEqual([]);
  });
});

describe('SupabaseApiKeyRepository.findByKeyPrefix', () => {
  it('returns null when not found', async () => {
    mockSb(buildChain({ data: null, error: null }));
    const repo = new SupabaseApiKeyRepository();
    expect(await repo.findByKeyPrefix('sk_xxxx')).toBeNull();
  });

  it('returns mapped key when found', async () => {
    mockSb(buildChain({ data: MOCK_ROW, error: null }));
    const repo = new SupabaseApiKeyRepository();
    const result = await repo.findByKeyPrefix('sk_abcd');
    expect(result!.keyPrefix).toBe('sk_abcd');
  });
});

describe('SupabaseApiKeyRepository.create', () => {
  it('throws when Supabase insert returns error', async () => {
    mockSb(buildChain({ data: null, error: { message: 'insert failed' } }));
    const repo = new SupabaseApiKeyRepository();
    const input = { ...MOCK_ROW, expiresAt: null, lastUsedAt: null, createdAt: new Date(), updatedAt: new Date() };
    const { id, createdAt, updatedAt, ...createInput } = input;
    await expect(repo.create(createInput)).rejects.toThrow('Failed to create API key');
  });

  it('returns mapped ApiKey on success', async () => {
    mockSb(buildChain({ data: MOCK_ROW, error: null }));
    const repo = new SupabaseApiKeyRepository();
    const input = { ...MOCK_ROW, expiresAt: null, lastUsedAt: null, createdAt: new Date(), updatedAt: new Date() };
    const { id, createdAt, updatedAt, ...createInput } = input;
    const result = await repo.create(createInput);
    expect(result.id).toBe('key-001');
  });
});

describe('SupabaseApiKeyRepository.update', () => {
  it('throws when Supabase update returns error', async () => {
    mockSb(buildChain({ data: null, error: { message: 'update failed' } }));
    const repo = new SupabaseApiKeyRepository();
    await expect(repo.update('key-001', { name: 'New Name' })).rejects.toThrow('Failed to update API key');
  });

  it('returns mapped ApiKey with updated fields on success', async () => {
    const updatedRow = { ...MOCK_ROW, name: 'Updated Name' };
    mockSb(buildChain({ data: updatedRow, error: null }));
    const repo = new SupabaseApiKeyRepository();
    const result = await repo.update('key-001', { name: 'Updated Name' });
    expect(result.name).toBe('Updated Name');
  });
});

describe('SupabaseApiKeyRepository.delete', () => {
  it('returns true when delete succeeds (no error)', async () => {
    const chain = buildChain(null);
    chain.eq = jest.fn().mockResolvedValue({ error: null });
    (createClient as jest.Mock).mockReturnValue({ from: jest.fn(() => chain) });

    const repo = new SupabaseApiKeyRepository();
    expect(await repo.delete('key-001')).toBe(true);
  });

  it('returns false when delete returns error', async () => {
    const chain = buildChain(null);
    chain.eq = jest.fn().mockResolvedValue({ error: { message: 'delete failed' } });
    (createClient as jest.Mock).mockReturnValue({ from: jest.fn(() => chain) });

    const repo = new SupabaseApiKeyRepository();
    expect(await repo.delete('key-001')).toBe(false);
  });
});

describe('SupabaseApiKeyRepository.rotate', () => {
  it('throws when key not found', async () => {
    mockSb(buildChain({ data: null, error: null }));
    const repo = new SupabaseApiKeyRepository();
    await expect(repo.rotate('key-999')).rejects.toThrow('API key not found');
  });
});

describe('rowToApiKey mapping', () => {
  it('uses default email when customerEmail is null', async () => {
    const rowWithNullEmail = { ...MOCK_ROW, customerEmail: null };
    mockSb(buildChain({ data: rowWithNullEmail, error: null }));
    const repo = new SupabaseApiKeyRepository();
    const result = await repo.findById('key-001');
    expect(result!.customerEmail).toBe('cust-001@agents.invoica.ai');
  });
});
