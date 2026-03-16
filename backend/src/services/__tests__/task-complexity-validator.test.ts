import { validateTask, EMERGENCY_SUSPEND_ORCHESTRATION } from '../task-complexity-validator';

describe('EMERGENCY_SUSPEND_ORCHESTRATION', () => {
  it('is a boolean', () => {
    expect(typeof EMERGENCY_SUSPEND_ORCHESTRATION).toBe('boolean');
  });

  it('is currently set to true (killswitch active)', () => {
    expect(EMERGENCY_SUSPEND_ORCHESTRATION).toBe(true);
  });
});

describe('validateTask — auto-decomposed bypass', () => {
  it('allows auto-decomposed subtasks regardless of id or description', () => {
    const result = validateTask({ id: 'ORCH-001', type: 'feature', description: 'orchestrate everything', isAutoDecomposed: true });
    expect(result.allowed).toBe(true);
    expect(result.reason).toMatch(/auto-decomposed/i);
  });

  it('does not bypass when isAutoDecomposed is false', () => {
    const result = validateTask({ id: 'ORCH-001', type: 'feature', description: 'orchestrate', isAutoDecomposed: false });
    expect(result.allowed).toBe(false);
  });
});

describe('validateTask — ORCH-* ID blocking', () => {
  it('blocks task with ORCH- prefixed id', () => {
    const result = validateTask({ id: 'ORCH-007', type: 'test', description: 'normal test' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/ORCH-\*/);
  });

  it('blocks task with lowercase orch- id (case-insensitive check)', () => {
    const result = validateTask({ id: 'orch-123', type: 'test', description: 'test' });
    expect(result.allowed).toBe(false);
  });
});

describe('validateTask — AGENT-034-* cascade blocking', () => {
  it('blocks AGENT-034-* cascade tasks', () => {
    const result = validateTask({ id: 'AGENT-034-CASCADE-001', type: 'feature', description: 'some work' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/AGENT-034/);
  });

  it('does not block AGENT-035-* tasks (different agent)', () => {
    const result = validateTask({ id: 'AGENT-035-001', type: 'feature', description: 'some work' });
    expect(result.allowed).toBe(true);
  });
});

describe('validateTask — orchestration keyword blocking', () => {
  it('blocks feature task with "orchestrat" in description', () => {
    const result = validateTask({ id: 'FEAT-001', type: 'feature', description: 'Orchestrate the agent pipeline' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/orchestration keywords/);
  });

  it('blocks feature task with "orch-" in description', () => {
    const result = validateTask({ id: 'FEAT-002', type: 'feature', description: 'run the orch- subsystem' });
    expect(result.allowed).toBe(false);
  });

  it('does NOT block non-feature task with orchestration keywords', () => {
    const result = validateTask({ id: 'TEST-001', type: 'test', description: 'test the orchestration module' });
    expect(result.allowed).toBe(true);
  });
});

describe('validateTask — normal tasks allowed', () => {
  it('allows a normal feature task with clean description', () => {
    const result = validateTask({ id: 'INVOICE-010', type: 'feature', description: 'Add pagination to invoices' });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('allows task with no fields set (empty object)', () => {
    const result = validateTask({});
    expect(result.allowed).toBe(true);
  });

  it('allows task with undefined id and description', () => {
    const result = validateTask({ type: 'test', id: undefined, description: undefined });
    expect(result.allowed).toBe(true);
  });
});
