import {
  META_TASK_BLACKLIST,
  validTaskTypes,
  SPRINT_CAPACITY,
  isBlacklistedTaskId,
  filterBlacklistedTaskIds,
} from '../orchestrator-config';

describe('META_TASK_BLACKLIST', () => {
  it('contains exactly ORCH-001 and QUALITY-001', () => {
    expect(META_TASK_BLACKLIST).toEqual(['ORCH-001', 'QUALITY-001']);
  });
});

describe('validTaskTypes', () => {
  it('contains all 5 expected task types', () => {
    expect(validTaskTypes).toEqual(
      expect.arrayContaining(['feature', 'bugfix', 'ops', 'agent_creation', 'refactor'])
    );
    expect(validTaskTypes).toHaveLength(5);
  });
});

describe('SPRINT_CAPACITY', () => {
  it('has min of 5', () => {
    expect(SPRINT_CAPACITY.min).toBe(5);
  });

  it('has max of 9', () => {
    expect(SPRINT_CAPACITY.max).toBe(9);
  });
});

describe('isBlacklistedTaskId', () => {
  it('returns true for exact match ORCH-001', () => {
    expect(isBlacklistedTaskId('ORCH-001')).toBe(true);
  });

  it('returns true for exact match QUALITY-001', () => {
    expect(isBlacklistedTaskId('QUALITY-001')).toBe(true);
  });

  it('returns true for task ID starting with ORCH-001 (sub-task)', () => {
    expect(isBlacklistedTaskId('ORCH-001-SUB-TASK')).toBe(true);
  });

  it('returns true for lowercase orch-001 (case-insensitive via toUpperCase)', () => {
    expect(isBlacklistedTaskId('orch-001')).toBe(true);
  });

  it('returns false for unrelated task ID', () => {
    expect(isBlacklistedTaskId('FEATURE-001')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isBlacklistedTaskId('')).toBe(false);
  });

  it('returns false for partial prefix that does not match blacklist', () => {
    expect(isBlacklistedTaskId('ORCH-002')).toBe(false);
  });
});

describe('filterBlacklistedTaskIds', () => {
  it('removes blacklisted IDs from mixed array', () => {
    const input = ['ORCH-001', 'FEATURE-001', 'QUALITY-001-X'];
    expect(filterBlacklistedTaskIds(input)).toEqual(['FEATURE-001']);
  });

  it('returns empty array when input is empty', () => {
    expect(filterBlacklistedTaskIds([])).toEqual([]);
  });

  it('returns array unchanged when no blacklisted IDs present', () => {
    const input = ['FEATURE-001', 'BUGFIX-002', 'OPS-003'];
    expect(filterBlacklistedTaskIds(input)).toEqual(input);
  });

  it('removes all entries when all are blacklisted', () => {
    expect(filterBlacklistedTaskIds(['ORCH-001', 'QUALITY-001'])).toEqual([]);
  });
});
