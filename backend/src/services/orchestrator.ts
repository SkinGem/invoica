import { EventEmitter } from 'events';
import { Logger, logger } from '../utils/logger';
import { redis } from '../lib/redis';
type RedisService = typeof redis;

interface TaskInput {
  description?: string;
  context?: string;
  agentName: string;
  deliverableFiles?: string[];
}

interface TaskResult {
  agentId: string;
  taskId: string;
  status: 'completed' | 'rejected' | 'failed';
  timestamp: Date;
  error?: string;
}

interface AgentRejectionState {
  consecutiveFailures: number;
  lastFailureTime: Date;
  isPaused: boolean;
  pausedUntil?: Date;
}

interface QualityCheckResult {
  taskId: string;
  passed: boolean;
  reason?: string;
}

interface NormalizedAgentName {
  camelCase: string;
  kebabCase: string;
}

/**
 * Orchestrates task execution and manages agent health monitoring
 * Prevents cascade failures by pausing agents with consecutive rejections
 */
export class Orchestrator extends EventEmitter {
  private readonly logger: Logger = logger;
  private readonly redis: RedisService;
  private readonly rejectionStates = new Map<string, AgentRejectionState>();
  private readonly REJECTION_THRESHOLD = 2;
  private readonly PAUSE_DURATION_MS = 60 * 60 * 1000; // 1 hour

  constructor(redisService: RedisService) {
    super();
    this.redis = redisService;
  }

  /**
   * Normalizes agent names between camelCase and kebab-case formats
   * Detects input format and returns both versions
   * @param agentName - Agent name in either camelCase or kebab-case format
   * @returns Object containing both camelCase and kebab-case versions
   */
  normalizeAgentName(agentName: string): NormalizedAgentName {
    const isKebabCase = agentName.includes('-');
    
    if (isKebabCase) {
      const camelCase = agentName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      return {
        camelCase,
        kebabCase: agentName
      };
    } else {
      const kebabCase = agentName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
      return {
        camelCase: agentName,
        kebabCase
      };
    }
  }

  /**
   * Validates task input to prevent DIR-011 violations
   * Rejects tasks with suffix-split deliverable file paths
   * @param taskInput - Task input to validate
   * @throws Error if task contains multi-file patterns
   */
  validateTaskInput(taskInput: TaskInput): void {
    if (!taskInput.deliverableFiles || taskInput.deliverableFiles.length === 0) {
      return; // No deliverable files specified, validation passes
    }

    // Check for suffix-split patterns in deliverable file paths
    const suffixSplitPattern = /-\d{3,}\.(ts|js|tsx|jsx|json|md|mdx|py|go|rs|java|cpp|c|h)$/i;
    
    for (const filePath of taskInput.deliverableFiles) {
      if (suffixSplitPattern.test(filePath)) {
        const error = new Error(
          `Task rejected: Deliverable file path '${filePath}' contains suffix split pattern. ` +
          `Single deliverable = single commit. Multi-file patterns violate DIR-011.`
        );
        this.logger.error('Task validation failed - suffix split detected', {
          filePath,
          agentName: taskInput.agentName,
          deliverableFiles: taskInput.deliverableFiles
        });
        throw error;
      }
    }

    // Additional check for multiple files with similar base names
    const basePaths = new Set<string>();
    for (const filePath of taskInput.deliverableFiles) {
      const basePath = filePath.replace(/-\d{3,}\.(ts|js|tsx|jsx|json|md|mdx|py|go|rs|java|cpp|c|h)$/i, '');
      if (basePaths.has(basePath) && basePath !== filePath.replace(/\.[^.]+$/, '')) {
        const error = new Error(
          `Task rejected: Multiple deliverable files detected with similar base paths. ` +
          `This suggests a multi-file pattern that violates DIR-011.`
        );
        this.logger.error('Task validation failed - multi-file pattern detected', {
          basePath,
          agentName: taskInput.agentName,
          deliverableFiles: taskInput.deliverableFiles
        });
        throw error;
      }
      basePaths.add(basePath);
    }
  }

  /**
   * Processes task result and checks for rejection patterns
   * Emits warnings and pauses agents that exceed failure threshold
   */
  async processTaskResult(result: TaskResult): Promise<void> {
    try {
      this.logger.info('Processing task result', {
        agentId: result.agentId,
        taskId: result.taskId,
        status: result.status
      });

      if (result.status === 'rejected') {
        await this.handleRejection(result);
      } else if (result.status === 'completed') {
        await this.handleSuccess(result.agentId);
      }

      // Emit result for other services to consume
      this.emit('taskResult', result);
    } catch (error) {
      this.logger.error('Failed to process task result', {
        error: error instanceof Error ? error.message : 'Unknown error',
        result
      });
      throw error;
    }
  }

  /**
   * Handles agent rejection by tracking consecutive failures
   * Pauses agent if threshold exceeded
   */
  private async handleRejection(result: TaskResult): Promise<void> {
    const agentId = result.agentId;
    const currentState = this.rejectionStates.get(agentId) || {
      consecutiveFailures: 0,
      lastFailureTime: new Date(),
      isPaused: false
    };

    currentState.consecutiveFailures += 1;
    currentState.lastFailureTime = new Date();

    if (currentState.consecutiveFailures >= this.REJECTION_THRESHOLD) {
      currentState.isPaused = true;
      currentState.pausedUntil = new Date(Date.now() + this.PAUSE_DURATION_MS);
      
      this.logger.warn('Agent paused due to consecutive rejections', {
        agentId,
        consecutiveFailures: currentState.consecutiveFailures,
        pausedUntil: currentState.pausedUntil
      });

      this.emit('agentPaused', {
        agentId,
        reason: 'consecutive_rejections',
        pausedUntil: currentState.pausedUntil
      });
    }

    this.rejectionStates.set(agentId, currentState);
  }

  /**
   * Handles successful task completion by resetting rejection state
   */
  private async handleSuccess(agentId: string): Promise<void> {
    const currentState = this.rejectionStates.get(agentId);
    if (currentState) {
      // Reset consecutive failures on success
      currentState.consecutiveFailures = 0;
      currentState.isPaused = false;
      currentState.pausedUntil = undefined;
      
      this.rejectionStates.set(agentId, currentState);
      
      this.logger.info('Agent rejection state reset after successful task', {
        agentId
      });
    }
  }

  /**
   * Validates task quality without causing cascade rejections
   * Marks only the specific failing task as rejected
   */
  async validateTaskQuality(taskId: string, agentId: string): Promise<QualityCheckResult> {
    try {
      // Check if agent is currently paused
      const rejectionState = this.rejectionStates.get(agentId);
      if (rejectionState?.isPaused && rejectionState.pausedUntil && new Date() < rejectionState.pausedUntil) {
        return {
          taskId,
          passed: false,
          reason: `Agent ${agentId} is paused until ${rejectionState.pausedUntil.toISOString()}`
        };
      }

      // Perform quality validation logic here
      // This is a placeholder for actual quality checks
      const qualityScore = await this.calculateQualityScore(taskId);
      
      if (qualityScore < 70) {
        return {
          taskId,
          passed: false,
          reason: `Quality score ${qualityScore} below threshold of 70`
        };
      }

      return {
        taskId,
        passed: true
      };
    } catch (error) {
      this.logger.error('Quality validation failed', {
        taskId,
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        taskId,
        passed: false,
        reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Calculates quality score for a task
   * Placeholder implementation - should be replaced with actual quality metrics
   */
  private async calculateQualityScore(taskId: string): Promise<number> {
    // Placeholder implementation
    // In a real system, this would analyze code quality, test coverage, etc.
    return Math.floor(Math.random() * 100);
  }

  /**
   * Checks if an agent is currently paused
   */
  isAgentPaused(agentId: string): boolean {
    const state = this.rejectionStates.get(agentId);
    if (!state?.isPaused || !state.pausedUntil) {
      return false;
    }
    
    // Check if pause period has expired
    if (new Date() >= state.pausedUntil) {
      state.isPaused = false;
      state.pausedUntil = undefined;
      this.rejectionStates.set(agentId, state);
      return false;
    }
    
    return true;
  }

  /**
   * Gets rejection state for an agent
   */
  getAgentRejectionState(agentId: string): AgentRejectionState | undefined {
    return this.rejectionStates.get(agentId);
  }

  /**
   * Manually unpause an agent (for administrative purposes)
   */
  unpauseAgent(agentId: string): void {
    const state = this.rejectionStates.get(agentId);
    if (state) {
      state.isPaused = false;
      state.pausedUntil = undefined;
      this.rejectionStates.set(agentId, state);
      
      this.logger.info('Agent manually unpaused', { agentId });
      this.emit('agentUnpaused', { agentId, reason: 'manual' });
    }
  }
}