jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../lib/redis', () => ({ redis: {} }));

import { Orchestrator } from '../orchestrator';

// ---------------------------------------------------------------------------
// Shared mock redis
// ---------------------------------------------------------------------------

const mockRedis: any = { exists: jest.fn() };

function makeOrchestrator() {
  return new Orchestrator(mockRedis);
}

function makeResult(overrides: Partial<{
  agentId: string; taskId: string; status: 'completed' | 'rejected' | 'failed'; error?: string;
}> = {}) {
  return {
    agentId: 'agent-001',
    taskId: 'task-001',
    status: 'completed' as const,
    timestamp: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// normalizeAgentName
// ---------------------------------------------------------------------------

describe('normalizeAgentName', () => {
  const o = makeOrchestrator();

  it('converts kebab-case to camelCase', () => {
    const result = o.normalizeAgentName('my-agent-name');
    expect(result.camelCase).toBe('myAgentName');
    expect(result.kebabCase).toBe('my-agent-name');
  });

  it('converts camelCase to kebab-case', () => {
    const result = o.normalizeAgentName('myAgentName');
    expect(result.camelCase).toBe('myAgentName');
    expect(result.kebabCase).toBe('my-agent-name');
  });

  it('returns single word unchanged in both formats', () => {
    const result = o.normalizeAgentName('agent');
    expect(result.camelCase).toBe('agent');
    expect(result.kebabCase).toBe('agent');
  });
});

// ---------------------------------------------------------------------------
// processTaskResult — events
// ---------------------------------------------------------------------------

describe('processTaskResult — event emission', () => {
  it('emits taskResult event for completed status', async () => {
    const o = makeOrchestrator();
    const result = makeResult({ status: 'completed' });
    const emitted: any[] = [];
    o.on('taskResult', (r) => emitted.push(r));
    await o.processTaskResult(result);
    expect(emitted).toHaveLength(1);
    expect(emitted[0].status).toBe('completed');
  });

  it('emits taskResult event for rejected status', async () => {
    const o = makeOrchestrator();
    const result = makeResult({ status: 'rejected' });
    const emitted: any[] = [];
    o.on('taskResult', (r) => emitted.push(r));
    await o.processTaskResult(result);
    expect(emitted).toHaveLength(1);
    expect(emitted[0].status).toBe('rejected');
  });
});

// ---------------------------------------------------------------------------
// processTaskResult — rejection cascade prevention
// ---------------------------------------------------------------------------

describe('processTaskResult — rejection handling', () => {
  it('first rejection sets consecutiveFailures to 1 and does not pause agent', async () => {
    const o = makeOrchestrator();
    await o.processTaskResult(makeResult({ status: 'rejected' }));
    const state = o.getAgentRejectionState('agent-001');
    expect(state?.consecutiveFailures).toBe(1);
    expect(state?.isPaused).toBe(false);
  });

  it('second rejection pauses agent and emits agentPaused', async () => {
    const o = makeOrchestrator();
    const pauseEvents: any[] = [];
    o.on('agentPaused', (e) => pauseEvents.push(e));
    await o.processTaskResult(makeResult({ status: 'rejected' }));
    await o.processTaskResult(makeResult({ status: 'rejected' }));
    const state = o.getAgentRejectionState('agent-001');
    expect(state?.isPaused).toBe(true);
    expect(state?.pausedUntil).toBeDefined();
    expect(pauseEvents).toHaveLength(1);
    expect(pauseEvents[0].agentId).toBe('agent-001');
  });

  it('success after failures resets consecutiveFailures to 0', async () => {
    const o = makeOrchestrator();
    await o.processTaskResult(makeResult({ status: 'rejected' }));
    await o.processTaskResult(makeResult({ status: 'completed' }));
    const state = o.getAgentRejectionState('agent-001');
    expect(state?.consecutiveFailures).toBe(0);
    expect(state?.isPaused).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateTaskQuality
// ---------------------------------------------------------------------------

describe('validateTaskQuality', () => {
  it('returns passed: false for task with null content', async () => {
    const o = makeOrchestrator();
    const results = await o.validateTaskQuality([{ taskId: 't1', agentId: 'a1', content: null }]);
    expect(results[0].passed).toBe(false);
    expect(results[0].reason).toContain('missing or invalid');
  });

  it('returns passed: true for task with valid content and active agent', async () => {
    const o = makeOrchestrator();
    const results = await o.validateTaskQuality([{ taskId: 't1', agentId: 'a1', content: { output: 'done' } }]);
    expect(results[0].passed).toBe(true);
  });

  it('returns passed: false for paused agent', async () => {
    const o = makeOrchestrator();
    // Trigger pause (2 rejections)
    await o.processTaskResult(makeResult({ agentId: 'paused-agent', status: 'rejected' }));
    await o.processTaskResult(makeResult({ agentId: 'paused-agent', status: 'rejected' }));
    const results = await o.validateTaskQuality([{ taskId: 't1', agentId: 'paused-agent', content: { x: 1 } }]);
    expect(results[0].passed).toBe(false);
    expect(results[0].reason).toContain('paused');
  });
});

// ---------------------------------------------------------------------------
// validateTask
// ---------------------------------------------------------------------------

describe('validateTask', () => {
  it('returns false when agentName is missing', async () => {
    const o = makeOrchestrator();
    const result = await o.validateTask({ agentName: '' });
    expect(result).toBe(false);
  });

  it('returns true when agent exists in redis', async () => {
    mockRedis.exists.mockResolvedValue(1);
    const o = makeOrchestrator();
    const result = await o.validateTask({ agentName: 'my-agent' });
    expect(result).toBe(true);
  });

  it('returns false when agent not found in redis', async () => {
    mockRedis.exists.mockResolvedValue(0);
    const o = makeOrchestrator();
    const result = await o.validateTask({ agentName: 'ghost-agent' });
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getAgentRejectionState / resetAgentState
// ---------------------------------------------------------------------------

describe('getAgentRejectionState', () => {
  it('returns undefined for unknown agent', () => {
    const o = makeOrchestrator();
    expect(o.getAgentRejectionState('nobody')).toBeUndefined();
  });
});

describe('resetAgentState', () => {
  it('removes the agent state', async () => {
    const o = makeOrchestrator();
    await o.processTaskResult(makeResult({ status: 'rejected' }));
    expect(o.getAgentRejectionState('agent-001')).toBeDefined();
    o.resetAgentState('agent-001');
    expect(o.getAgentRejectionState('agent-001')).toBeUndefined();
  });
});
