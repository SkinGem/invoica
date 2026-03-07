import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { RedisService } from './redis';

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

/**
 * Orchestrates task execution and manages agent health monitoring
 * Prevents cascade failures by pausing agents with consecutive rejections
 */
export class Orchestrator extends EventEmitter {
  private readonly logger = Logger.getInstance();
  private readonly redis: RedisService;
  private readonly rejectionStates = new Map<string, AgentRejectionState>();
  private readonly REJECTION_THRESHOLD = 2;
  private readonly PAUSE_DURATION_MS = 60 * 60 * 1000; // 1 hour

  constructor(redisService: RedisService) {
    super();
    this.redis = redisService;
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
   * Handles rejection by tracking consecutive failures and pausing if threshold exceeded
   */
  private async handleRejection(result: TaskResult): Promise<void> {
    const agentId = result.agentId;
    const currentState = this.rejectionStates.get(agentId) || {
      consecutiveFailures: 0,
      lastFailureTime: new Date(),
      isPaused: false
    };

    currentState.consecutiveFailures += 1;
    currentState.lastFailureTime = result.timestamp;

    this.rejectionStates.set(agentId, currentState);

    this.logger.warn('Agent rejection detected', {
      agentId,
      consecutiveFailures: currentState.consecutiveFailures,
      threshold: this.REJECTION_THRESHOLD
    });

    if (currentState.consecutiveFailures >= this.REJECTION_THRESHOLD) {
      await this.pauseAgent(agentId, currentState);
    }
  }

  /**
   * Pauses agent queue and schedules automatic resume
   */
  private async pauseAgent(agentId: string, state: AgentRejectionState): Promise<void> {
    const pausedUntil = new Date(Date.now() + this.PAUSE_DURATION_MS);
    
    state.isPaused = true;
    state.pausedUntil = pausedUntil;
    this.rejectionStates.set(agentId, state);

    // Pause the agent's queue in Redis
    await this.redis.pauseQueue(`agent:${agentId}:queue`, this.PAUSE_DURATION_MS);

    this.logger.warn('Agent paused due to consecutive rejections', {
      agentId,
      consecutiveFailures: state.consecutiveFailures,
      pausedUntil: pausedUntil.toISOString(),
      duration: '1 hour'
    });

    // Emit warning for monitoring systems
    this.emit('agentPaused', {
      agentId,
      reason: 'consecutive_rejections',
      consecutiveFailures: state.consecutiveFailures,
      pausedUntil
    });

    // Schedule automatic resume
    setTimeout(() => {
      this.resumeAgent(agentId).catch(error => {
        this.logger.error('Failed to auto-resume agent', {
          agentId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      });
    }, this.PAUSE_DURATION_MS);
  }

  /**
   * Resumes paused agent and clears rejection state
   */
  private async resumeAgent(agentId: string): Promise<void> {
    const state = this.rejectionStates.get(agentId);
    if (!state || !state.isPaused) {
      return;
    }

    // Resume the agent's queue in Redis
    await this.redis.resumeQueue(`agent:${agentId}:queue`);

    // Clear rejection state
    this.rejectionStates.delete(agentId);

    this.logger.info('Agent automatically resumed', { agentId });

    this.emit('agentResumed', {
      agentId,
      reason: 'automatic_timeout'
    });
  }

  /**
   * Handles successful task completion by resetting consecutive failures
   */
  private async handleSuccess(agentId: string): Promise<void> {
    const state = this.rejectionStates.get(agentId);
    if (state && state.consecutiveFailures > 0) {
      state.consecutiveFailures = 0;
      this.rejectionStates.set(agentId, state);
      
      this.logger.info('Agent consecutive failures reset after success', { agentId });
    }
  }

  /**
   * Manually clears rejection state for an agent
   * Used for administrative recovery operations
   */
  clearRejectionState(agentId?: string): void {
    if (agentId) {
      this.rejectionStates.delete(agentId);
      this.logger.info('Rejection state cleared for agent', { agentId });
    } else {
      this.rejectionStates.clear();
      this.logger.info('All rejection states cleared');
    }
  }

  /**
   * Checks if the pipeline is healthy (no agents paused due to rejections)
   */
  isPipelineHealthy(): boolean {
    for (const [agentId, state] of this.rejectionStates.entries()) {
      if (state.isPaused) {
        this.logger.debug('Pipeline unhealthy due to paused agent', { agentId });
        return false;
      }
    }
    return true;
  }

  /**
   * Gets current rejection state for an agent
   */
  getAgentState(agentId: string): AgentRejectionState | undefined {
    return this.rejectionStates.get(agentId);
  }

  /**
   * Gets all agents currently paused due to rejections
   */
  getPausedAgents(): Array<{ agentId: string; state: AgentRejectionState }> {
    const paused: Array<{ agentId: string; state: AgentRejectionState }> = [];
    
    for (const [agentId, state] of this.rejectionStates.entries()) {
      if (state.isPaused) {
        paused.push({ agentId, state });
      }
    }
    
    return paused;
  }
}

export default Orchestrator;