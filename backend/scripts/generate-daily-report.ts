import { promises as fs } from 'fs';
import path from 'path';
import { createLogger } from '../src/lib/logger';

const logger = createLogger('daily-report-generator');

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

interface DailyReport {
  date: string;
  summary: string;
  commits: GitCommit[];
  agentActivity: AgentActivity[];
  systemMetrics: SystemMetric[];
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
    }
  }

  private async buildReport(): Promise<DailyReport> {
    const today = new Date().toISOString().split('T')[0];
    
    const [commits, agentActivity, systemMetrics, incidents, keyDecisions, nextActions] = await Promise.all([
      this.getRecentCommits(),
      this.getAgentActivity(),
      this.getSystemMetrics(),
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
      incidents,
      keyDecisions,
      nextActions
    };
  }

  private async getRecentCommits(): Promise<GitCommit[]> {
    try {
      const { execSync } = require('child_process');
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
      logger.warn('Failed to get git commits', { error });
      return [];
    }
  }

  private async getAgentActivity(): Promise<AgentActivity[]> {
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      const agents = ['ceo', 'devops', 'security', 'frontend', 'backend'];
      const activity: AgentActivity[] = [];

      for (const agent of agents) {
        try {
          const logFile = path.join(logsDir, `${agent}.log`);
          const stats = await fs.stat(logFile);
          const content = await fs.readFile(logFile, 'utf8');
          
          const lines = content.split('\n').filter(line => line.trim());
          const recentLines = lines.filter(line => {
            const match = line.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            if (!match) return false;
            const logDate = new Date(match[0]);
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return logDate > yesterday;
          });

          const errorLines = recentLines.filter(line => line.includes('ERROR'));
          const status = errorLines.length > 0 ? 'error' : 
                        recentLines.length > 0 ? 'active' : 'idle';

          activity.push({
            agent,
            actions: recentLines.length,
            lastSeen: stats.mtime.toISOString(),
            status
          });
        } catch {
          activity.push({
            agent,
            actions: 0,
            lastSeen: 'unknown',
            status: 'idle'
          });
        }
      }

      return activity;
    } catch (error) {
      logger.warn('Failed to get agent activity', { error });
      return [];
    }
  }

  private async getSystemMetrics(): Promise<SystemMetric[]> {
    const metrics: SystemMetric[] = [];

    try {
      // Check disk usage
      const { execSync } = require('child_process');
      const diskUsage = execSync('df -h /', { encoding: 'utf8' });
      const usage = diskUsage.split('\n')[1].split(/\s+/)[4];
      const usagePercent = parseInt(usage.replace('%', ''));
      
      metrics.push({
        name: 'Disk Usage',
        value: usage,
        status: usagePercent > 90 ? 'critical' : usagePercent > 80 ? 'warning' : 'healthy'
      });

      // Check memory usage
      const memInfo = execSync('free -m', { encoding: 'utf8' });
      const memLines = memInfo.split('\n');
      const memData = memLines[1].split(/\s+/);
      const memUsed = parseInt(memData[2]);
      const memTotal = parseInt(memData[1]);
      const memPercent = Math.round((memUsed / memTotal) * 100);

      metrics.push({
        name: 'Memory Usage',
        value: `${memPercent}%`,
        status: memPercent > 90 ? 'critical' : memPercent > 80 ? 'warning' : 'healthy'
      });

      // Check load average
      const loadAvg = execSync('uptime', { encoding: 'utf8' });
      const loadMatch = loadAvg.match(/load average: ([\d.]+)/);
      if (loadMatch) {
        const load = parseFloat(loadMatch[1]);
        metrics.push({
          name: 'Load Average',
          value: load.toString(),
          status: load > 2 ? 'critical' : load > 1 ? 'warning' : 'healthy'
        });
      }
    } catch (error) {
      logger.warn('Failed to get system metrics', { error });
      metrics.push({
        name: 'System Metrics',
        value: 'unavailable',
        status: 'warning'
      });
    }

    return metrics;
  }

  private async getIncidents(): Promise<string[]> {
    try {
      const incidentsFile = path.join(this.memoryDir, 'incidents.md');
      const content = await fs.readFile(incidentsFile, 'utf8');
      
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const lines = content.split('\n');
      const recentIncidents: string[] = [];

      for (const line of lines) {
        if (line.startsWith('## ') && line.includes(yesterday.toISOString().split('T')[0])) {
          recentIncidents.push(line.replace('## ', ''));
        }
      }

      return recentIncidents;
    } catch (error) {
      logger.warn('Failed to read incidents', { error });
      return [];
    }
  }

  private async getKeyDecisions(): Promise<string[]> {
    try {
      const decisionsFile = path.join(this.memoryDir, 'long-term-memory.md');
      const content = await fs.readFile(decisionsFile, 'utf8');
      
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dateStr = yesterday.toISOString().split('T')[0];
      
      const lines = content.split('\n');
      const recentDecisions: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(dateStr) && lines[i].includes('DECISION:')) {
          recentDecisions.push(lines[i].replace(/.*DECISION:\s*/, ''));
        }
      }

      return recentDecisions;
    } catch (error) {
      logger.warn('Failed to read key decisions', { error });
      return [];
    }
  }

  private async getNextActions(): Promise<string[]> {
    try {
      const sprintFile = path.join(this.sprintsDir, 'current.json');
      const content = await fs.readFile(sprintFile, 'utf8');
      const sprint = JSON.parse(content);
      
      const nextActions: string[] = [];
      
      if (sprint.tasks) {
        for (const task of sprint.tasks) {
          if (task.status === 'todo' || task.status === 'in_progress') {
            nextActions.push(`${task.title} (${task.assignee || 'unassigned'})`);
          }
        }
      }

      return nextActions.slice(0, 5); // Limit to top 5
    } catch (error) {
      logger.warn('Failed to read next actions', { error });
      return ['Review sprint planning', 'Update task assignments'];
    }
  }

  private generateSummary(commits: GitCommit[], agentActivity: AgentActivity[], incidents: string[]): string {
    const commitCount = commits.length;
    const activeAgents = agentActivity.filter(a => a.status === 'active').length;
    const errorAgents = agentActivity.filter(a => a.status === 'error').length;
    const incidentCount = incidents.length;

    let summary = `Daily operational summary: ${commitCount} commits, ${activeAgents} active agents`;
    
    if (errorAgents > 0) {
      summary += `, ${errorAgents} agents with errors`;
    }
    
    if (incidentCount > 0) {
      summary += `, ${incidentCount} incidents reported`;
    }

    if (commitCount === 0 && activeAgents === 0) {
      summary += '. Low activity day - system appears idle.';
    } else if (errorAgents > 0 || incidentCount > 0) {
      summary += '. Attention required for system health.';
    } else {
      summary += '. Normal operational status.';
    }

    return summary;
  }

  private async writeReport(report: DailyReport): Promise<void> {
    await fs.mkdir(this.memoryDir, { recursive: true });
    
    const reportPath = path.join(this.memoryDir, 'daily-continuity.md');
    const content = this.formatReport(report);
    
    await fs.writeFile(reportPath, content, 'utf8');
    logger.info('Daily continuity report written', { path: reportPath });
  }

  private formatReport(report: DailyReport): string {
    const lines: string[] = [];
    
    lines.push(`# Daily Continuity Report — ${report.date}`);
    lines.push('');
    lines.push(`**Summary:** ${report.summary}`);
    lines.push('');
    
    // Commits section
    lines.push('## Recent Commits (24h)');
    lines.push('');
    if (report.commits.length === 0) {
      lines.push('No commits in the last 24 hours.');
    } else {
      for (const commit of report.commits) {
        lines.push(`- **${commit.hash}** by ${commit.author}: ${commit.message}`);
        if (commit.files.length > 0) {
          lines.push(`  Files: ${commit.files.slice(0, 3).join(', ')}${commit.files.length > 3 ? '...' : ''}`);
        }
      }
    }
    lines.push('');
    
    // Agent activity section
    lines.push('## Agent Activity');
    lines.push('');
    for (const agent of report.agentActivity) {
      const statusIcon = agent.status === 'active' ? '🟢' : 
                        agent.status === 'error' ? '🔴' : '⚪';
      lines.push(`- **${agent.agent}** ${statusIcon} ${agent.actions} actions, last seen: ${agent.lastSeen}`);
    }
    lines.push('');
    
    // System metrics section
    lines.push('## System Health');
    lines.push('');
    for (const metric of report.systemMetrics) {
      const statusIcon = metric.status === 'healthy' ? '🟢' : 
                        metric.status === 'warning' ? '🟡' : '🔴';
      lines.push(`- **${metric.name}:** ${metric.value} ${statusIcon}`);
    }
    lines.push('');
    
    // Incidents section
    if (report.incidents.length > 0) {
      lines.push('## Incidents (24h)');
      lines.push('');
      for (const incident of report.incidents) {
        lines.push(`- ${incident}`);
      }
      lines.push('');
    }
    
    // Key decisions section
    if (report.keyDecisions.length > 0) {
      lines.push('## Key Decisions');
      lines.push('');
      for (const decision of report.keyDecisions) {
        lines.push(`- ${decision}`);
      }
      lines.push('');
    }
    
    // Next actions section
    lines.push('## Next Actions');
    lines.push('');
    if (report.nextActions.length === 0) {
      lines.push('No specific actions identified. Review sprint planning.');
    } else {
      for (const action of report.nextActions) {
        lines.push(`- ${action}`);
      }
    }
    lines.push('');
    
    lines.push('---');
    lines.push(`*Generated at ${new Date().toISOString()} by daily-report-generator*`);
    
    return lines.join('\n');
  }
}

async function main(): Promise<void> {
  const generator = new DailyReportGenerator();
  await generator.generate();
}

if (require.main === module) {
  main().catch(error => {
    console.error('Daily report generation failed:', error);
    process.exit(1);
  });
}

export { DailyReportGenerator };