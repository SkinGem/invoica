import { generateApiKey, hashApiKey, isTestKey, TEST_KEY_PREFIX, API_KEY_PREFIX } from '../api-key-generator';

describe('api-key-generator', () => {
  const livePrefix = API_KEY_PREFIX;
  const testPrefix = TEST_KEY_PREFIX;

  it('generateApiKey() produces key starting with inv_live_', () => {
    const { key } = generateApiKey(false);
    expect(key.startsWith(livePrefix)).toBe(true);
  });

  it('generateApiKey(true) produces key starting with inv_test_', () => {
    const { key } = generateApiKey(true);
    expect(key.startsWith(testPrefix)).toBe(true);
  });

  it('generated key hash matches hashApiKey(key)', () => {
    const { key, hash } = generateApiKey();
    expect(hashApiKey(key)).toBe(hash);
  });

  it('each call generates unique keys', () => {
    const { key: key1 } = generateApiKey();
    const { key: key2 } = generateApiKey();
    expect(key1).not.toBe(key2);
  });

  it('hashApiKey is deterministic', () => {
    const key = generateApiKey().key;
    const hash1 = hashApiKey(key);
    const hash2 = hashApiKey(key);
    expect(hash1).toBe(hash2);
  });

  it('isTestKey returns true for test keys and false for live keys', () => {
    const liveKey = generateApiKey(false).key;
    const testKey = generateApiKey(true).key;
    expect(isTestKey(testKey)).toBe(true);
    expect(isTestKey(liveKey)).toBe(false);
  });

  it('key format includes random hex characters after prefix', () => {
    const { key } = generateApiKey();
    const suffix = key.slice(livePrefix.length);
    expect(suffix.length).toBeGreaterThan(0);
    expect(/^[a-f0-9]+$/.test(suffix)).toBe(true);
  });

  it('generateApiKey() default parameter (no args) produces live key', () => {
    const { key } = generateApiKey();
    expect(key.startsWith(livePrefix)).toBe(true);
  });

  it('generateApiKey throws TypeError when isTest is not a boolean', () => {
    expect(() => generateApiKey('true' as any)).toThrow(TypeError);
    expect(() => generateApiKey('true' as any)).toThrow('isTest parameter must be a boolean');
  });

  it('hashApiKey returns a 64-character hex string (SHA256)', () => {
    const hash = hashApiKey('inv_live_testinput');
    expect(hash).toHaveLength(64);
    expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
  });

  it('hashApiKey throws TypeError for empty string', () => {
    expect(() => hashApiKey('')).toThrow(TypeError);
    expect(() => hashApiKey('')).toThrow('key parameter must be a non-empty string');
  });

  it('hashApiKey throws TypeError for non-string input', () => {
    expect(() => hashApiKey(null as any)).toThrow(TypeError);
  });

  it('isTestKey throws TypeError for non-string input', () => {
    expect(() => isTestKey(42 as any)).toThrow(TypeError);
    expect(() => isTestKey(42 as any)).toThrow('key parameter must be a string');
  });

  it('API_KEY_PREFIX and TEST_KEY_PREFIX have correct values', () => {
    expect(API_KEY_PREFIX).toBe('inv_live_');
    expect(TEST_KEY_PREFIX).toBe('inv_test_');
  });
});