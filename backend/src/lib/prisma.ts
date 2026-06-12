import { PrismaClient } from '@prisma/client';

// Singleton pattern — prevents multiple PrismaClient instances in development/ts-node
const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Enhanced Prisma client with retry logic and health checks for cron jobs
 */
class EnhancedPrismaClient extends PrismaClient {
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second base delay

  constructor(options?: any) {
    super({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      ...options,
    });
  }

  /**
   * Execute a database operation with retry logic
   */
  async withRetry<T>(operation: () => Promise<T>, context = 'database operation'): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.maxRetries) {
          throw new Error(`${context} failed after ${this.maxRetries} attempts: ${lastError.message}`);
        }

        // Exponential backoff with jitter
        const delay = this.retryDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.withRetry(async () => {
        await this.$queryRaw`SELECT 1`;
      }, 'health check');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Graceful shutdown with connection cleanup
   */
  async gracefulShutdown(): Promise<void> {
    try {
      await this.$disconnect();
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
    }
  }
}

export const prisma =
  globalForPrisma.prisma ||
  new EnhancedPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  await prisma.gracefulShutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.gracefulShutdown();
  process.exit(0);
});

export default prisma;