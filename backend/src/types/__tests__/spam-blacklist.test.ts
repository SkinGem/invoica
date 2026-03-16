import {
  SpamBlacklistConfig,
  DomainValidationResult,
  AddDomainResult,
  RemoveDomainResult,
} from '../spam-blacklist';

describe('SpamBlacklistConfig shape', () => {
  it('constructs with a redisKey string', () => {
    const config: SpamBlacklistConfig = { redisKey: 'spam:blacklist' };
    expect(config.redisKey).toBe('spam:blacklist');
  });
});

describe('DomainValidationResult shape', () => {
  it('isSpam true for a blacklisted domain', () => {
    const result: DomainValidationResult = { isSpam: true };
    expect(result.isSpam).toBe(true);
  });

  it('isSpam false for a clean domain', () => {
    const result: DomainValidationResult = { isSpam: false };
    expect(result.isSpam).toBe(false);
  });
});

describe('AddDomainResult type', () => {
  it('is void (undefined) on success', () => {
    const result: AddDomainResult = undefined;
    expect(result).toBeUndefined();
  });

  it('can be an error object on failure', () => {
    const err = new Error('Redis write failed');
    const result: AddDomainResult = { error: err };
    expect((result as { error: Error }).error.message).toBe('Redis write failed');
  });
});

describe('RemoveDomainResult type', () => {
  it('is void (undefined) on success', () => {
    const result: RemoveDomainResult = undefined;
    expect(result).toBeUndefined();
  });

  it('can be an error object on failure', () => {
    const err = new Error('Redis delete failed');
    const result: RemoveDomainResult = { error: err };
    expect((result as { error: Error }).error.message).toBe('Redis delete failed');
  });
});
