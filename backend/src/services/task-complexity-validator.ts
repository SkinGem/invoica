/**
 * task-complexity-validator.ts
 *
 * Emergency killswitch module for the sprint pipeline.
 * Created manually on 2026-03-06 to unblock sprint-runner (see EMERGENCY-001).
 *
 * EMERGENCY_SUSPEND_ORCHESTRATION=true blocks ORCH-* and AGENT-034-* cascade tasks
 * that caused a 36-hour pipeline stall (CEO escalation 2026-03-06).
 *
 * Additionally validates task complexity and can skip validation for
 * auto-decomposed subtasks via the isAutoDecomposed flag.
 */

export const EMERGENCY_SUSPEND_ORCHESTRATION = true;

export interface TaskValidationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Input interface for task validation.
 * Includes the isAutoDecomposed flag to skip complexity validation
 * for auto-decomposed subtasks (which are already smaller than their parent).
 */
export interface TaskInput {
  type?: string;
  description?: string;
  id?: string;
  /** Flag indicating this is an auto-decomposed subtask. When true, complexity validation is skipped. */
  isAutoDecomposed?: boolean;
}

/**
 * Validates whether a task should proceed through the pipeline.
 * Returns allowed=false for tasks matching emergency killswitch criteria.
 * Skips complexity validation for auto-decomposed subtasks when isAutoDecomposed is true.
 *
 * @param task - The task input containing type, description, id, and optional isAutoDecomposed flag
 * @returns TaskValidationResult indicating whether the task is allowed to proceed
 */
export function validateTask(task: TaskInput): TaskValidationResult {
  // Skip complexity validation for auto-decomposed subtasks
  // These are already smaller than their parent task and don't need further validation
  if (task.isAutoDecomposed === true) {
    return {
      allowed: true,
      reason: 'Complexity validation skipped for auto-decomposed subtask',
    };
  }

  if (EMERGENCY_SUSPEND_ORCHESTRATION) {
    const desc = (task.description ?? '').toLowerCase();
    const id = (task.id ?? '').toUpperCase();

    // Block: feature tasks about orchestration (prevents ORCH-001 child spawning)
    if (task.type === 'feature' && (desc.includes('orchestrat') || desc.includes('orch-'))) {
      return {
        allowed: false,
        reason: 'Emergency killswitch: feature task with orchestration keywords blocked',
      };
    }

    // Block: any task with ORCH-* ID
    if (id.startsWith('ORCH-')) {
      return {
        allowed: false,
        reason: 'Emergency killswitch: ORCH-* task ID blocked',
      };
    }

    // Block: stale AGENT-034-* cascade tasks
    if (/^AGENT-034-/.test(id)) {
      return {
        allowed: false,
        reason: 'Emergency killswitch: AGENT-034-* cascade task blocked',
      };
    }
  }

  return { allowed: true };
}

export default { validateTask, EMERGENCY_SUSPEND_ORCHESTRATION };