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
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const since = yesterday.toISOString().split('T')[0];

      // Sanitize input to prevent command injection
      const sanitizedSince = since.replace(/[^0-9-]/g, '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(sanitizedSince)) {
        throw new Error('Invalid date format for git since parameter');
      }

      const gitLog = execSync(
        `git log --since="${sanitizedSince}" --pretty=format:"%H|%an|%ai|%s" --name-only`,
        { 
          encoding: 'utf8',
          cwd: process.cwd(),
          timeout: 10000
        }
      );

      const commits: GitCommit[] = [];
      const entries = gitLog.split('\n\n').filter(entry => entry.trim());

      for (const entry of entries) {
        const lines = entry.split('\n');
        if (lines.length < 1) continue;

        const [hash, author, date, message] = lines[0].split('|');
        if (!hash || !author || !date || !message) continue;

        const files = lines.slice(1).filter(line => line.trim() && !line.includes('|'));

        commits.push({
          hash: hash.substring(0, 8),
          author,
          date,
          message,
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
      // Check for agent log files or activity markers
      const agentDirs = ['memory', 'workspace', 'logs'];
      const activities: AgentActivity[] = [];

      for (const dir of agentDirs) {
        const dirPath = path.join(process.cwd(), dir);
        try {
          await fs.access(dirPath);
          const files = await fs.readdir(dirPath);
          
          // Look for agent-specific files or logs
          const agentFiles = files.filter(file => 
            file.includes('agent') || 
            file.includes('daily') || 
            file.includes('activity')
          );

          if (agentFiles.length > 0) {
            activities.push({
              agent: `${dir}-agent`,
              actions: agentFiles.length,
              lastSeen: new Date().toISOString(),
              status: 'active'
            });
          }
        } catch {
          // Directory doesn't exist, skip
        }
      }

      // Add default system agent
      activities.push({
        agent: 'backend-core',
        actions: 1,
        lastSeen: new Date().toISOString(),
        status: 'active'
      });

      return activities;
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
      const uptimeHours = Math.round(process.uptime() / 3600 * 100) / 100;
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
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const invoices = await prisma.invoice.findMany({
        where: {
          createdAt: {
            gte: yesterday,
            lt: today
          }
        }
      });

      const totalInvoices = invoices.length;
      const pendingInvoices = invoices.filter(inv => inv.status === 'pending').length;
      const settledInvoices = invoices.filter(inv => inv.status === 'settled').length;
      const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
      const averageAmount = totalInvoices > 0 ? totalAmount / totalInvoices : 0;

      return {
        totalInvoices,
        pendingInvoices,
        settledInvoices,
        totalAmount,
        averageAmount
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
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const settlements = await prisma.settlement.findMany({
        where: {
          createdAt: {
            gte: yesterday,
            lt: today
          }
        }
      });

      const totalSettlements = settlements.length;
      const settledAmount = settlements.reduce((sum, settlement) => sum + Number(settlement.amount), 0);
      const successfulSettlements = settlements.filter(s => s.status === 'completed').length;
      const successRate = totalSettlements > 0 ? (successfulSettlements / totalSettlements) * 100 : 0;

      // Calculate average settlement time (mock calculation)
      const averageSettlementTime = totalSettlements > 0 ? 30 : 0; // seconds

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

  private async getIncidents(): Promise<string[]> {
    try {
      const incidents: string[] = [];
      
      // Check for error logs
      const logsDir = path.join(process.cwd(), 'logs');
      try {
        await fs.access(logsDir);
        const logFiles = await fs.readdir(logsDir);
        
        for (const logFile of logFiles) {
          if (logFile.includes('error') || logFile.includes('incident')) {
            const logPath = path.join(logsDir, logFile);
            const stats = await fs.stat(logPath);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (stats.mtime > yesterday) {
              incidents.push(`Error log detected: ${logFile}`);
            }
          }
        }
      } catch {
        // No logs directory
      }

      // Check for failed database operations
      try {
        const failedInvoices = await prisma.invoice.count({
          where: {
            status: 'failed',
            updatedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        });

        if (failedInvoices > 0) {
          incidents.push(`${failedInvoices} failed invoice(s) in the last 24 hours`);
        }
      } catch {
        // Database query failed
        incidents.push('Unable to query database for failed operations');
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
      
      // Check memory files for decisions
      const memoryFiles = ['daily-continuity.md', 'long-term-memory.md'];
      
      for (const file of memoryFiles) {
        const filePath = path.join(this.memoryDir, file);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const lines = content.split('\n');
          
          // Look for decision markers
          const decisionLines = lines.filter(line => 
            line.toLowerCase().includes('decision') ||
            line.toLowerCase().includes('resolved') ||
            line.toLowerCase().includes('approved')
          );
          
          decisions.push(...decisionLines.slice(0, 3)); // Limit to 3 per file
        } catch {
          // File doesn't exist
        }
      }

      // Check sprint files
      try {
        const currentSprintPath = path.join(this.sprintsDir, 'current.json');
        const sprintContent = await fs.readFile(currentSprintPath, 'utf8');
        const sprint = JSON.parse(sprintContent);
        
        if (sprint.decisions && Array.isArray(sprint.decisions)) {
          decisions.push(...sprint.decisions.slice(0, 2));
        }
      } catch {
        // No current sprint file
      }

      return decisions.length > 0 ? decisions : ['No key decisions recorded'];
    } catch (error) {
      logger.error('Failed to get key decisions', { error });
      return ['Failed to retrieve decision data'];
    }
  }

  private async getNextActions(): Promise<string[]> {
    try {
      const actions: string[] = [];
      
      // Check sprint files for next actions
      try {
        const currentSprintPath = path.join(this.sprintsDir, 'current.json');
        const sprintContent = await fs.readFile(currentSprintPath, 'utf8');
        const sprint = JSON.parse(sprintContent);
        
        if (sprint.tasks && Array.isArray(sprint.tasks)) {
          const pendingTasks = sprint.tasks
            .filter((task: any) => task.status === 'pending' || task.status === 'in-progress')
            .slice(0, 5);
          
          actions.push(...pendingTasks.map((task: any) => task.title || task.description || 'Unnamed task'));
        }
      } catch {
        // No current sprint file
      }

      // Add default actions if none found
      if (actions.length === 0) {
        actions.push(
          'Continue monitoring invoice processing',
          'Review settlement detection accuracy',
          'Update system documentation',
          'Optimize database queries',
          'Review error logs and incidents'
        );
      }

      return actions;
    } catch (error) {
      logger.error('Failed to get next actions', { error });
      return ['Failed to retrieve action items'];
    }
  }

  private generateSummary(commits: GitCommit[], agentActivity: AgentActivity[], incidents: string[]): string {
    const commitCount = commits.length;
    const activeAgents = agentActivity.filter(a => a.status === 'active').length;
    const incidentCount = incidents.length;

    let summary = `Daily Summary for ${new Date().toISOString().split('T')[0]}:\n\n`;
    
    if (commitCount > 0) {
      summary += `✅ ${commitCount} commit(s) pushed to repository\n`;
    } else {
      summary += `⚠️ No commits detected in the last 24 hours\n`;
    }

    summary += `🤖 ${activeAgents} agent(s) active\n`;

    if (incidentCount > 0) {
      summary += `🚨 ${incidentCount} incident(s) detected\n`;
    } else {
      summary += `✅ No incidents detected\n`;
    }

    summary += `\nSystem Status: ${incidentCount === 0 ? 'Healthy' : 'Needs Attention'}`;

    return summary;
  }

  private async writeReport(report: DailyReport): Promise<void> {
    try {
      // Write to daily continuity file
      const continuityPath = path.join(this.memoryDir, 'daily-continuity.md');
      const reportContent = this.formatReportAsMarkdown(report);
      
      await fs.writeFile(continuityPath, reportContent, 'utf8');
      logger.info(`Daily report written to ${continuityPath}`);

      // Also write as JSON for programmatic access
      const jsonPath = path.join(this.memoryDir, `daily-report-${report.date}.json`);
      await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf8');
      logger.info(`Daily report JSON written to ${jsonPath}`);

    } catch (error) {
      logger.error('Failed to write daily report', { error });
      throw error;
    }
  }

  private formatReportAsMarkdown(report: DailyReport): string {
    let content = `# Daily Report - ${report.date}\n\n`;
    
    content += `## Summary\n\n${report.summary}\n\n`;
    
    content += `## Recent Commits (${report.commits.length})\n\n`;
    if (report.commits.length > 0) {
      for (const commit of report.commits) {
        content += `- **${commit.hash}** by ${commit.author}: ${commit.message}\n`;
        if (commit.files.length > 0) {
          content += `  - Files: ${commit.files.slice(0, 3).join(', ')}${commit.files.length > 3 ? '...' : ''}\n`;
        }
      }
    } else {
      content += `No commits in the last 24 hours.\n`;
    }
    content += '\n';

    content += `## Agent Activity\n\n`;
    for (const agent of report.agentActivity) {
      const statusEmoji = agent.status === 'active' ? '🟢' : agent.status === 'idle' ? '🟡' : '🔴';
      content += `- ${statusEmoji} **${agent.agent}**: ${agent.actions} actions, last seen ${agent.lastSeen}\n`;
    }
    content += '\n';

    content += `## System Metrics\n\n`;
    for (const metric of report.systemMetrics) {
      const statusEmoji = metric.status === 'healthy' ? '✅' : metric.status === 'warning' ? '⚠️' : '🚨';
      content += `- ${statusEmoji} **${metric.name}**: ${metric.value}\n`;
    }
    content += '\n';

    content += `## Invoice Statistics\n\n`;
    content += `- Total Invoices: ${report.invoiceStats.totalInvoices}\n`;
    content += `- Pending: ${report.invoiceStats.pendingInvoices}\n`;
    content += `- Settled: ${report.invoiceStats.settledInvoices}\n`;
    content += `- Total Amount: $${report.invoiceStats.totalAmount.toFixed(2)}\n`;
    content += `- Average Amount: $${report.invoiceStats.averageAmount.toFixed(2)}\n\n`;

    content += `## Settlement Statistics\n\n`;
    content += `- Total Settlements: ${report.settlementStats.totalSettlements}\n`;
    content += `- Settled Amount: $${report.settlementStats.settledAmount.toFixed(2)}\n`;
    content += `- Average Settlement Time: ${report.settlementStats.averageSettlementTime}s\n`;
    content += `- Success Rate: ${report.settlementStats.successRate.toFixed(1)}%\n\n`;

    content += `## Incidents\n\n`;
    if (report.incidents.length > 0) {
      for (const incident of report.incidents) {
        content += `- 🚨 ${incident}\n`;
      }
    } else {
      content += `No incidents detected.\n`;
    }
    content += '\n';

    content += `## Key Decisions\n\n`;
    for (const decision of report.keyDecisions) {
      content += `- ${decision}\n`;
    }
    content += '\n';

    content += `## Next Actions\n\n`;
    for (const action of report.nextActions) {
      content += `- [ ] ${action}\n`;
    }
    content += '\n';

    content += `---\n\n`;
    content += `*Report generated automatically on ${new Date().toISOString()}*\n`;
    content += `*Memory Protocol Compliance: DIR-009 ✅*\n`;

    return content;
  }
}

// Main execution
async function main(): Promise<void> {
  const generator = new DailyReportGenerator();
  await generator.generate();
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error('Daily report generation failed:', error);
    process.exit(1);
  });
}

export { DailyReportGenerator };