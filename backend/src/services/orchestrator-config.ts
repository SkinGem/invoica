// orchestrator-config.ts
// Configuration for CEO sprint generation — meta-task blacklist and task type registry.
// Status: COMPLETE. Implemented 2026-03-07 by CTO pre-flight fix.

/**
 * Meta-task IDs that are permanently excluded from sprint generation.
 * These are self-referential orchestrator management tasks that cause
 * cascade failures when they appear in agent sprints.
 */
export const META_TASK_BLACKLIST: string[] = [
  'ORCH-001',
  'QUALITY-001',
];

/**
 * Valid task types for agent sprint generation.
 * (ORCH-001 and QUALITY-001 removed — they are meta-tasks, not real work items)
 */
export const validTaskTypes: string[] = [
  'feature',
  'bugfix',
  'ops',
  'agent_creation',
  'refactor',
];

/**
 * Sprint capacity limits (tasks per sprint).
 * CEO generates 5–9 tasks per sprint for optimal throughput.
 */
export const SPRINT_CAPACITY = { min: 5, max: 9 };

/**
 * Returns true if the task ID should be excluded from generation.
 */
export const isBlacklistedTaskId = (taskId: string): boolean =>
  META_TASK_BLACKLIST.some(b => taskId.toUpperCase().startsWith(b));

/**
 * Filters out blacklisted task IDs from a list.
 */
export const filterBlacklistedTaskIds = (taskIds: string[]): string[] =>
  taskIds.filter(id => !isBlacklistedTaskId(id));

export default {
  validTaskTypes,
  META_TASK_BLACKLIST,
  SPRINT_CAPACITY,
  isBlacklistedTaskId,
  filterBlacklistedTaskIds,
};
