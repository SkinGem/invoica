import { validateTaskComplexity } from '../task-complexity-validator';

const validInput = {
  filePath: 'backend/src/api/invoices.ts',
  context: 'Add pagination to invoice list',
  agent: 'backend-core',
  type: 'feature',
  priority: 'medium',
  dependencies: [],
};

describe('validateTaskComplexity', () => {
  it('returns valid:true for a fully valid input', () => {
    const result = validateTaskComplexity(validInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid:false when context exceeds 600 characters', () => {
    const result = validateTaskComplexity({ ...validInput, context: 'x'.repeat(601) });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('context'))).toBe(true);
  });

  it('returns valid:false for invalid agent value', () => {
    const result = validateTaskComplexity({ ...validInput, agent: 'ceo-agent' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('accepts all valid agent values', () => {
    for (const agent of ['frontend-core', 'backend-core', 'fullstack-core']) {
      const result = validateTaskComplexity({ ...validInput, agent });
      expect(result.valid).toBe(true);
    }
  });

  it('returns valid:false for invalid type value', () => {
    const result = validateTaskComplexity({ ...validInput, type: 'hotfix' });
    expect(result.valid).toBe(false);
  });

  it('accepts all valid type values', () => {
    for (const type of ['feature', 'bug', 'refactor']) {
      const result = validateTaskComplexity({ ...validInput, type });
      expect(result.valid).toBe(true);
    }
  });

  it('returns valid:false for invalid priority value', () => {
    const result = validateTaskComplexity({ ...validInput, priority: 'critical' });
    expect(result.valid).toBe(false);
  });

  it('accepts all valid priority values', () => {
    for (const priority of ['low', 'medium', 'high']) {
      const result = validateTaskComplexity({ ...validInput, priority });
      expect(result.valid).toBe(true);
    }
  });

  it('returns valid:false when dependencies array is non-empty', () => {
    const result = validateTaskComplexity({ ...validInput, dependencies: ['other-task'] });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('dependencies'))).toBe(true);
  });

  it('returns errors array with path prefix for field errors', () => {
    const result = validateTaskComplexity({ ...validInput, context: 'x'.repeat(601) });
    expect(result.errors[0]).toMatch(/^context:/);
  });
});
