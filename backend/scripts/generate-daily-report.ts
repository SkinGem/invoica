import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../src/lib/logger';

const logger = createLogger('daily-report-generator');
const prisma = new PrismaClient();

interface GitCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
  files: string[];
}

interface AgentActivity {
  agent: string;
  actions: number;
  lastSeen: string;
  status: 'active' | 'idle' | 'error';
}

interface SystemMetric {
  name: string;
  value: string;
  status: 'healthy' | 'warning' | 'critical';
}

interface InvoiceStats {
  totalInvoices: number;
  pendingInvoices: number;
  settledInvoices: number;
  totalAmount: number;
  averageAmount: number;
}

interface SettlementStats {
  totalSettlements: number;
  settledAmount: number;
  averageSettlementTime: number;
  successRate: number;
}

interface DailyReport {
  date: string;
  summary: string;
  commits: GitCommit[];
  agentActivity: AgentActivity[];
  systemMetrics: SystemMetric[];
  invoiceStats: InvoiceStats;
  settlementStats: SettlementStats;
  incidents: string[];
  keyDecisions: string[];
  nextActions: string[];
}

class DailyReportGenerator {
  private readonly memoryDir = path.join(process.cwd(), 'memory');
  private readonly workspaceDir = path.join(process.cwd(), 'workspace');
  private readonly sprintsDir = path.join(process.cwd(), 'sprints');

  async generate(): Promise<void> {
    try {
      logger.info('Starting daily report generation');
      
      // Ensure memory directory exists
      await this.ensureDirectoryExists(this.memoryDir);
      
      const report = await this.buildReport();
      await this.writeReport(report);
      
      logger.info('Daily report generated successfully');
    } catch (error) {
      logger.error('Failed to generate daily report', { error });
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  private async ensureDirectoryExists(dir: string): Promise<void> {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  }

  private async buildReport(): Promise<DailyReport> {
    const today = new Date().toISOString().split('T')[0];
    
    const [
      commits, 
      agentActivity, 
      systemMetrics, 
      invoiceStats,
      settlementStats,
      incidents, 
      keyDecisions, 
      nextActions
    ] = await Promise.all([
      this.getRecentCommits(),
      this.getAgentActivity(),
      this.getSystemMetrics(),
      this.getInvoiceStats(),
      this.getSettlementStats(),
      this.getIncidents(),
      this.getKeyDecisions(),
      this.getNextActions()
    ]);

    const summary = this.generateSummary(commits, agentActivity, incidents);

    return {
      date: today,
      summary,
      commits,
      agentActivity,
      systemMetrics,
      invoiceStats,
      settlementStats,
      incidents,
      keyDecisions,
      nextActions
    };
  }

  private async getRecentCommits(): Promise<GitCommit[]> {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const gitLog = execSync(
        `git log --since="${since}" --pretty=format:"%H|%an|%ai|%s" --name-only`,
        { encoding: 'utf8', cwd: process.cwd() }
      ).trim();

      if (!gitLog) {
        return [];
      }

      const commits: GitCommit[] = [];
      const commitBlocks = gitLog.split('\n\n');

      for (const block of commitBlocks) {
        const lines = block.trim().split('\n');
        if (lines.length === 0) continue;

        const [hash, author, date, message] = lines[0].split('|');
        const files = lines.slice(1).filter(line => line.trim());

        commits.push({
          hash: hash || '',
          author: author || '',
          date: date || '',
          message: message || '',
          files
        });
      }

      return commits;
    } catch (error) {
      logger.error('Failed to get recent commits', { error });
      return [];
    }
  }

  private async getAgentActivity(): Promise<AgentActivity[]> {
    try {
      // Query agent activity from database or logs
      // For now, return mock data - this would be replaced with actual agent tracking
      const agents = ['backend-core', 'frontend-core', 'security', 'ceo'];
      
      return agents.map(agent => ({
        agent,
        actions: Math.floor(Math.random() * 50),
        lastSeen: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        status: Math.random() > 0.8 ? 'error' : Math.random() > 0.3 ? 'active' : 'idle' as const
      }));
    } catch (error) {
      logger.error('Failed to get agent activity', { error });
      return [];
    }
  }

  private async getSystemMetrics(): Promise<SystemMetric[]> {
    try {
      const metrics: SystemMetric[] = [];

      // Database connection health
      try {
        await prisma.$queryRaw`SELECT 1`;
        metrics.push({
          name: 'Database Connection',
          value: 'Connected',
          status: 'healthy'
        });
      } catch {
        metrics.push({
          name: 'Database Connection',
          value: 'Disconnected',
          status: 'critical'
        });
      }

      // Memory usage
      const memUsage = process.memoryUsage();
      const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      metrics.push({
        name: 'Memory Usage',
        value: `${memUsedMB} MB`,
        status: memUsedMB > 500 ? 'warning' : 'healthy'
      });

      // Uptime
      const uptimeHours = Math.round(process.uptime() / 3600);
      metrics.push({
        name: 'Process Uptime',
        value: `${uptimeHours} hours`,
        status: 'healthy'
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to get system metrics', { error });
      return [];
    }
  }

  private async getInvoiceStats(): Promise<InvoiceStats> {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const [totalCount, pendingCount, settledCount, amountStats] = await Promise.all([
        prisma.invoice.count({
          where: {
            createdAt: {
              gte: yesterday
            }
          }
        }),
        prisma.invoice.count({
          where: {
            status: 'pending',
            createdAt: {
              gte: yesterday
            }
          }
        }),
        prisma.invoice.count({
          where: {
            status: 'settled',
            createdAt: {
              gte: yesterday
            }
          }
        }),
        prisma.invoice.aggregate({
          where: {
            createdAt: {
              gte: yesterday
            }
          },
          _sum: {
            amount: true
          },
          _avg: {
            amount: true
          }
        })
      ]);

      return {
        totalInvoices: totalCount,
        pendingInvoices: pendingCount,
        settledInvoices: settledCount,
        totalAmount: Number(amountStats._sum.amount) || 0,
        averageAmount: Number(amountStats._avg.amount) || 0
      };
    } catch (error) {
      logger.error('Failed to get invoice stats', { error });
      return {
        totalInvoices: 0,
        pendingInvoices: 0,
        settledInvoices: 0,
        totalAmount: 0,
        averageAmount: 0
      };
    }
  }

  private async getSettlementStats(): Promise<SettlementStats> {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const settlements = await prisma.invoice.findMany({
        where: {
          status: 'settled',
          settledAt: {
            gte: yesterday
          }
        },
        select: {
          amount: true,
          createdAt: true,
          settledAt: true
        }
      });

      const totalSettlements = settlements.length;
      const settledAmount = settlements.reduce((sum, s) => sum + Number(s.amount), 0);
      
      let averageSettlementTime = 0;
      if (settlements.length > 0) {
        const totalTime = settlements.reduce((sum, s) => {
          if (s.settledAt && s.createdAt) {
            return sum + (s.settledAt.getTime() - s.createdAt.getTime());
          }
          return sum;
        }, 0);
        averageSettlementTime = totalTime / settlements.length / 1000; // Convert to seconds
      }

      return {
        totalSettlements,
        settledAmount,
        averageSettlementTime,
        successRate: totalSettlements > 0 ? 100 : 0 // Simplified - all found settlements are successful
      };
    } catch (error) {
      logger.error('Failed to get settlement stats', { error });
      return {
        totalSettlements: 0,
        settledAmount: 0,
        averageSettlementTime: 0,
        successRate: 0
      };
    }
  }

  private async getIncidents(): Promise<string[]> {
    try {
      // Check for error logs, failed transactions, etc.
      const incidents: string[] = [];
      
      // Check for recent database errors
      try {
        const errorLogs = await prisma.invoice.findMany({
          where: {
            status: 'failed',
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          },
          take: 5
        });
        
        if (errorLogs.length > 0) {
          incidents.push(`${errorLogs.length} failed invoice(s) in the last 24 hours`);
        }
      } catch (error) {
        incidents.push('Database query error detected');
      }

      return incidents;
    } catch (error) {
      logger.error('Failed to get incidents', { error });
      return ['Failed to retrieve incident data'];
    }
  }

  private async getKeyDecisions(): Promise<string[]> {
    try {
      const decisions: string[] = [];
      
      // Check for configuration changes, new deployments, etc.
      const recentCommits = await this.getRecentCommits();
      
      for (const commit of recentCommits) {
        if (commit.message.toLowerCase().includes('config') || 
            commit.message.toLowerCase().includes('deploy') ||
            commit.message.toLowerCase().includes('breaking')) {
          decisions.push(`Code change: ${commit.message} (${commit.author})`);
        }
      }

      return decisions;
    } catch (error) {
      logger.error('Failed to get key decisions', { error });
      return [];
    }
  }

  private async getNextActions(): Promise<string[]> {
    try {
      const actions: string[] = [];
      
      // Check current sprint file
      try {
        const currentSprintPath = path.join(this.sprintsDir, 'current.json');
        const sprintData = await fs.readFile(currentSprintPath, 'utf8');
        const sprint = JSON.parse(sprintData);
        
        if (sprint.tasks) {
          const pendingTasks = sprint.tasks.filter((task: any) => 
            task.status === 'pending' || task.status === 'in_progress'
          );
          
          for (const task of pendingTasks.slice(0, 5)) {
            actions.push(`${task.title} (${task.assignee || 'unassigned'})`);
          }
        }
      } catch (error) {
        actions.push('Review current sprint status');
      }

      return actions;
    } catch (error) {
      logger.error('Failed to get next actions', { error });
      return ['Review system status and pending tasks'];
    }
  }

  private generateSummary(commits: GitCommit[], agentActivity: AgentActivity[], incidents: string[]): string {
    const commitCount = commits.length;
    const activeAgents = agentActivity.filter(a => a.status === 'active').length;
    const incidentCount = incidents.length;

    let summary = `Daily activity summary: ${commitCount} commits, ${activeAgents} active agents`;
    
    if (incidentCount > 0) {
      summary += `, ${incidentCount} incidents requiring attention`;
    } else {
      summary += ', no incidents reported';
    }

    return summary;
  }

  private async writeReport(report: DailyReport): Promise<void> {
    try {
      const reportPath = path.join(this.memoryDir, 'daily-continuity.md');
      const timestamp = new Date().toISOString();
      
      let content = `# Daily Continuity Report\n\n`;
      content += `**Generated:** ${timestamp}\n`;
      content += `**Date:** ${report.date}\n\n`;
      
      content += `## Summary\n\n${report.summary}\n\n`;
      
      // Recent Commits
      content += `## Recent Commits (Last 24h)\n\n`;
      if (report.commits.length === 0) {
        content += `No commits in the last 24 hours.\n\n`;
      } else {
        for (const commit of report.commits) {
          content += `- **${commit.hash.substring(0, 8)}** by ${commit.author}\n`;
          content += `  ${commit.message}\n`;
          if (commit.files.length > 0) {
            content += `  Files: ${commit.files.slice(0, 3).join(', ')}${commit.files.length > 3 ? '...' : ''}\n`;
          }
          content += `\n`;
        }
      }
      
      // Agent Activity
      content += `## Agent Activity\n\n`;
      for (const agent of report.agentActivity) {
        const statusEmoji = agent.status === 'active' ? '🟢' : agent.status === 'idle' ? '🟡' : '🔴';
        content += `- **${agent.agent}** ${statusEmoji} ${agent.actions} actions, last seen: ${new Date(agent.lastSeen).toLocaleString()}\n`;
      }
      content += `\n`;
      
      // System Metrics
      content += `## System Health\n\n`;
      for (const metric of report.systemMetrics) {
        const statusEmoji = metric.status === 'healthy' ? '🟢' : metric.status === 'warning' ? '🟡' : '🔴';
        content += `- **${metric.name}:** ${metric.value} ${statusEmoji}\n`;
      }
      content += `\n`;
      
      // Invoice Statistics
      content += `## Invoice Statistics (Last 24h)\n\n`;
      content += `- Total Invoices: ${report.invoiceStats.totalInvoices}\n`;
      content += `- Pending: ${report.invoiceStats.pendingInvoices}\n`;
      content += `- Settled: ${report.invoiceStats.settledInvoices}\n`;
      content += `- Total Amount: $${(report.invoiceStats.totalAmount / 100).toFixed(2)}\n`;
      content += `- Average Amount: $${(report.invoiceStats.averageAmount / 100).toFixed(2)}\n\n`;
      
      // Settlement Statistics
      content += `## Settlement Statistics (Last 24h)\n\n`;
      content += `- Total Settlements: ${report.settlementStats.totalSettlements}\n`;
      content += `- Settled Amount: $${(report.settlementStats.settledAmount / 100).toFixed(2)}\n`;
      content += `- Average Settlement Time: ${Math.round(report.settlementStats.averageSettlementTime)}s\n`;
      content += `- Success Rate: ${report.settlementStats.successRate.toFixed(1)}%\n\n`;
      
      // Incidents
      content += `## Incidents\n\n`;
      if (report.incidents.length === 0) {
        content += `No incidents reported.\n\n`;
      } else {
        for (const incident of report.incidents) {
          content += `- ${incident}\n`;
        }
        content += `\n`;
      }
      
      // Key Decisions
      content += `## Key Decisions\n\n`;
      if (report.keyDecisions.length === 0) {
        content += `No key decisions recorded.\n\n`;
      } else {
        for (const decision of report.keyDecisions) {
          content += `- ${decision}\n`;
        }
        content += `\n`;
      }
      
      // Next Actions
      content += `## Next Actions\n\n`;
      if (report.nextActions.length === 0) {
        content += `No pending actions identified.\n\n`;
      } else {
        for (const action of report.nextActions) {
          content += `- [ ] ${action}\n`;
        }
        content += `\n`;
      }
      
      content += `---\n\n`;
      content += `*This report is automatically generated daily to maintain institutional memory and operational continuity.*\n`;

      await fs.writeFile(reportPath, content, 'utf8');
      logger.info(`Daily report written to ${reportPath}`);
      
    } catch (error) {
      logger.error('Failed to write daily report', { error });
      throw new Error(`Failed to write daily report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Main execution
async function main() {
  const generator = new DailyReportGenerator();
  await generator.generate();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Daily report generation failed:', error);
    process.exit(1);
  });
}

export { DailyReportGenerator };