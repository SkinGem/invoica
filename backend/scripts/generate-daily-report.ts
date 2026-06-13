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
      );

      const commits: GitCommit[] = [];
      const entries = gitLog.split('\n\n').filter(entry => entry.trim());

      for (const entry of entries) {
        const lines = entry.split('\n');
        const [hash, author, date, message] = lines[0].split('|');
        const files = lines.slice(1).filter(line => line.trim());

        if (hash && author && date && message) {
          commits.push({
            hash: hash.substring(0, 8),
            author,
            date,
            message,
            files
          });
        }
      }

      return commits;
    } catch (error) {
      logger.error('Failed to get recent commits', { error });
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
        totalAmount: amountStats._sum.amount || 0,
        averageAmount: amountStats._avg.amount || 0
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
      const settledAmount = settlements.reduce((sum, s) => sum + s.amount, 0);
      
      const settlementTimes = settlements
        .filter(s => s.settledAt)
        .map(s => s.settledAt!.getTime() - s.createdAt.getTime());
      
      const averageSettlementTime = settlementTimes.length > 0 
        ? settlementTimes.reduce((sum, time) => sum + time, 0) / settlementTimes.length / 1000 / 60 // minutes
        : 0;

      const totalInvoices = await prisma.invoice.count({
        where: {
          createdAt: {
            gte: yesterday
          }
        }
      });

      const successRate = totalInvoices > 0 ? (totalSettlements / totalInvoices) * 100 : 0;

      return {
        totalSettlements,
        settledAmount,
        averageSettlementTime,
        successRate
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

  private async getAgentActivity(): Promise<AgentActivity[]> {
    try {
      // Check for agent log files or activity indicators
      const agentLogPath = path.join(this.workspaceDir, 'logs', 'agent-activity.json');
      
      if (await this.fileExists(agentLogPath)) {
        const content = await fs.readFile(agentLogPath, 'utf8');
        const activities = JSON.parse(content);
        return Array.isArray(activities) ? activities : [];
      }

      // Fallback: infer from git commits
      const commits = await this.getRecentCommits();
      const agentMap = new Map<string, AgentActivity>();

      for (const commit of commits) {
        const agent = commit.author;
        if (!agentMap.has(agent)) {
          agentMap.set(agent, {
            agent,
            actions: 0,
            lastSeen: commit.date,
            status: 'active' as const
          });
        }
        const activity = agentMap.get(agent)!;
        activity.actions++;
        if (new Date(commit.date) > new Date(activity.lastSeen)) {
          activity.lastSeen = commit.date;
        }
      }

      return Array.from(agentMap.values());
    } catch (error) {
      logger.error('Failed to get agent activity', { error });
      return [];
    }
  }

  private async getSystemMetrics(): Promise<SystemMetric[]> {
    try {
      const metrics: SystemMetric[] = [];

      // Database connection check
      try {
        await prisma.$queryRaw`SELECT 1`;
        metrics.push({
          name: 'Database',
          value: 'Connected',
          status: 'healthy'
        });
      } catch {
        metrics.push({
          name: 'Database',
          value: 'Disconnected',
          status: 'critical'
        });
      }

      // Check Redis connection (if available)
      try {
        const Redis = require('ioredis');
        const redis = new Redis(process.env.REDIS_URL);
        await redis.ping();
        metrics.push({
          name: 'Redis',
          value: 'Connected',
          status: 'healthy'
        });
        redis.disconnect();
      } catch {
        metrics.push({
          name: 'Redis',
          value: 'Disconnected',
          status: 'warning'
        });
      }

      // Disk space check
      try {
        const stats = await fs.stat(process.cwd());
        metrics.push({
          name: 'Disk Space',
          value: 'Available',
          status: 'healthy'
        });
      } catch {
        metrics.push({
          name: 'Disk Space',
          value: 'Check Failed',
          status: 'warning'
        });
      }

      return metrics;
    } catch (error) {
      logger.error('Failed to get system metrics', { error });
      return [];
    }
  }

  private async getIncidents(): Promise<string[]> {
    try {
      const incidentsPath = path.join(this.memoryDir, 'incidents.md');
      
      if (await this.fileExists(incidentsPath)) {
        const content = await fs.readFile(incidentsPath, 'utf8');
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // Extract incidents from the last 24 hours
        const lines = content.split('\n');
        const recentIncidents = lines.filter(line => 
          line.includes(yesterday) && line.trim().startsWith('-')
        );
        
        return recentIncidents.map(line => line.replace(/^-\s*/, '').trim());
      }

      return [];
    } catch (error) {
      logger.error('Failed to get incidents', { error });
      return [];
    }
  }

  private async getKeyDecisions(): Promise<string[]> {
    try {
      const decisionsPath = path.join(this.memoryDir, 'long-term-memory.md');
      
      if (await this.fileExists(decisionsPath)) {
        const content = await fs.readFile(decisionsPath, 'utf8');
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // Extract recent decisions
        const lines = content.split('\n');
        const recentDecisions = lines.filter(line => 
          line.includes(yesterday) && (line.includes('DECISION:') || line.includes('RESOLVED:'))
        );
        
        return recentDecisions.map(line => line.trim());
      }

      return [];
    } catch (error) {
      logger.error('Failed to get key decisions', { error });
      return [];
    }
  }

  private async getNextActions(): Promise<string[]> {
    try {
      const sprintPath = path.join(this.sprintsDir, 'current.json');
      
      if (await this.fileExists(sprintPath)) {
        const content = await fs.readFile(sprintPath, 'utf8');
        const sprint = JSON.parse(content);
        
        if (sprint.tasks && Array.isArray(sprint.tasks)) {
          return sprint.tasks
            .filter((task: any) => task.status === 'pending' || task.status === 'in_progress')
            .map((task: any) => `${task.title} (${task.status})`)
            .slice(0, 10); // Limit to top 10
        }
      }

      return ['Review pending invoices', 'Monitor settlement pipeline', 'Check system health'];
    } catch (error) {
      logger.error('Failed to get next actions', { error });
      return ['Review system status', 'Check for pending tasks'];
    }
  }

  private generateSummary(commits: GitCommit[], agentActivity: AgentActivity[], incidents: string[]): string {
    const commitCount = commits.length;
    const activeAgents = agentActivity.filter(a => a.status === 'active').length;
    const incidentCount = incidents.length;

    let summary = `Daily summary for ${new Date().toISOString().split('T')[0]}: `;
    
    if (commitCount > 0) {
      summary += `${commitCount} commits pushed by ${activeAgents} active agents. `;
    } else {
      summary += 'No commits today. ';
    }

    if (incidentCount > 0) {
      summary += `${incidentCount} incidents reported. `;
    } else {
      summary += 'No incidents reported. ';
    }

    summary += 'System operational.';

    return summary;
  }

  private async writeReport(report: DailyReport): Promise<void> {
    try {
      const reportPath = path.join(this.memoryDir, 'daily-continuity.md');
      const markdown = this.formatReportAsMarkdown(report);
      
      await fs.writeFile(reportPath, markdown, 'utf8');
      logger.info('Report written to daily-continuity.md');
    } catch (error) {
      logger.error('Failed to write report', { error });
      throw error;
    }
  }

  private formatReportAsMarkdown(report: DailyReport): string {
    const lines: string[] = [];
    
    lines.push(`# Daily Continuity Report - ${report.date}`);
    lines.push('');
    lines.push(`## Summary`);
    lines.push(report.summary);
    lines.push('');

    // Invoice Statistics
    lines.push('## Invoice Statistics');
    lines.push(`- Total Invoices: ${report.invoiceStats.totalInvoices}`);
    lines.push(`- Pending: ${report.invoiceStats.pendingInvoices}`);
    lines.push(`- Settled: ${report.invoiceStats.settledInvoices}`);
    lines.push(`- Total Amount: $${report.invoiceStats.totalAmount.toFixed(2)}`);
    lines.push(`- Average Amount: $${report.invoiceStats.averageAmount.toFixed(2)}`);
    lines.push('');

    // Settlement Statistics
    lines.push('## Settlement Statistics');
    lines.push(`- Total Settlements: ${report.settlementStats.totalSettlements}`);
    lines.push(`- Settled Amount: $${report.settlementStats.settledAmount.toFixed(2)}`);
    lines.push(`- Average Settlement Time: ${report.settlementStats.averageSettlementTime.toFixed(1)} minutes`);
    lines.push(`- Success Rate: ${report.settlementStats.successRate.toFixed(1)}%`);
    lines.push('');

    // Recent Commits
    if (report.commits.length > 0) {
      lines.push('## Recent Commits');
      for (const commit of report.commits) {
        lines.push(`- **${commit.hash}** by ${commit.author}: ${commit.message}`);
        if (commit.files.length > 0) {
          lines.push(`  - Files: ${commit.files.slice(0, 3).join(', ')}${commit.files.length > 3 ? '...' : ''}`);
        }
      }
      lines.push('');
    }

    // Agent Activity
    if (report.agentActivity.length > 0) {
      lines.push('## Agent Activity');
      for (const activity of report.agentActivity) {
        lines.push(`- **${activity.agent}**: ${activity.actions} actions, last seen ${activity.lastSeen} (${activity.status})`);
      }
      lines.push('');
    }

    // System Metrics
    if (report.systemMetrics.length > 0) {
      lines.push('## System Metrics');
      for (const metric of report.systemMetrics) {
        const statusIcon = metric.status === 'healthy' ? '✅' : metric.status === 'warning' ? '⚠️' : '❌';
        lines.push(`- ${statusIcon} **${metric.name}**: ${metric.value}`);
      }
      lines.push('');
    }

    // Incidents
    if (report.incidents.length > 0) {
      lines.push('## Incidents');
      for (const incident of report.incidents) {
        lines.push(`- ${incident}`);
      }
      lines.push('');
    }

    // Key Decisions
    if (report.keyDecisions.length > 0) {
      lines.push('## Key Decisions');
      for (const decision of report.keyDecisions) {
        lines.push(`- ${decision}`);
      }
      lines.push('');
    }

    // Next Actions
    if (report.nextActions.length > 0) {
      lines.push('## Next Actions');
      for (const action of report.nextActions) {
        lines.push(`- ${action}`);
      }
      lines.push('');
    }

    lines.push(`---`);
    lines.push(`*Generated at ${new Date().toISOString()}*`);

    return lines.join('\n');
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// CLI interface
async function main() {
  const generator = new DailyReportGenerator();
  
  try {
    await generator.generate();
    console.log('Daily report generated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Failed to generate daily report:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DailyReportGenerator };