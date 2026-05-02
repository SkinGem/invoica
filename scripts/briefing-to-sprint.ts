#!/usr/bin/env -S npx tsx
/**
 * briefing-to-sprint.ts
 *
 * Closes the autonomy loop between watchdog output and swarm execution:
 *   reports/cto-briefings/*.md  →  sprints/week-N.json (pending tasks)
 *
 * Without this script, the tax/CMO/security watchdogs write briefings that
 * nobody (and no agent) ever turns into work. Briefings accumulate, regulatory
 * deadlines pass, the swarm idles on stale week-N sprints. This bridges that gap.
 *
 * What it does each run:
 *   1. List reports/cto-briefings/*.md
 *   2. Skip files already processed (tracked in reports/cto-briefings/.processed.json
 *      by content hash — rerunning a watchdog with the same content = no new tasks)
 *   3. Extract the "Priority Actions for CTO" section from each new briefing
 *   4. Cap at 5 highest-priority items per briefing (avoids overwhelming the swarm)
 *   5. Map each to a task with id, agent, priority, type, status=pending
 *   6. Append to next-numbered week-N.json (or create it)
 *   7. Update state file
 *
 * Tasks are marked auto-extracted with `needs_refinement: true` — the CEO agent
 * should refine deliverables (file paths, acceptance criteria) before sprint-runner
 * dispatches. This is intentional: the briefings describe WHAT, not HOW.
 *
 * Usage:
 *   ./scripts/briefing-to-sprint.ts            # process new briefings, write sprint
 *   ./scripts/briefing-to-sprint.ts --dry-run  # parse only, print what would write
 *
 * Wire into PM2 ecosystem hourly via cron_restart for full autonomy.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const BRIEFINGS_DIR = 'reports/cto-briefings';
const SPRINTS_DIR = 'sprints';
const STATE_FILE = 'reports/cto-briefings/.processed.json';
const MAX_TASKS_PER_BRIEFING = 5;

interface ProcessedFile {
  hash: string;
  processedAt: string;
  sprintFile: string;
  taskIds: string[];
}
interface ProcessedState { files: Record<string, ProcessedFile>; }

interface SprintTask {
  id: string;
  agent: string;
  type: 'feature' | 'fix' | 'test' | 'refactor';
  priority: 'critical' | 'high' | 'medium' | 'low';
  dependencies: string[];
  status: 'pending';
  description: string;
  context: string;
  deliverables: { code: string[]; tests: string[]; docs: string[] };
  needs_refinement: boolean;
  source_briefing: string;
}

function hashFile(path: string): string {
  return createHash('sha256').update(readFileSync(path, 'utf8')).digest('hex').slice(0, 16);
}

function loadState(): ProcessedState {
  if (!existsSync(STATE_FILE)) return { files: {} };
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')); }
  catch { return { files: {} }; }
}
function saveState(state: ProcessedState): void {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

function nextSprintNumber(): number {
  if (!existsSync(SPRINTS_DIR)) return 1;
  const files = readdirSync(SPRINTS_DIR).filter(f => /^week-\d+\.json$/.test(f));
  let max = 0;
  for (const f of files) {
    const n = parseInt(f.match(/\d+/)?.[0] || '0', 10);
    if (n > max) max = n;
  }
  return max + 1;
}

function detectAgent(briefingFile: string): string {
  const f = briefingFile.toLowerCase();
  if (f.includes('us-tax') || f.includes('eu-japan-tax') || f.includes('vat')) return 'backend-tax';
  if (f.includes('security') || f.includes('audit') || f.includes('pentest')) return 'security';
  if (f.includes('cmo') || f.includes('marketing') || f.includes('positioning')) return 'cmo';
  if (f.includes('frontend') || f.includes('landing')) return 'frontend';
  if (f.includes('infra') || f.includes('devops') || f.includes('pm2')) return 'devops';
  return 'backend-core';
}

function detectPriority(line: string): SprintTask['priority'] {
  const upper = line.toUpperCase();
  if (/\b(URGENT|P0|CRITICAL)\b/.test(upper)) return 'critical';
  if (/\b(HIGH|P1)\b/.test(upper)) return 'high';
  if (/\b(MEDIUM|P2)\b/.test(upper)) return 'medium';
  if (/\b(LOW|P3)\b/.test(upper)) return 'low';
  return 'medium';
}

function detectType(line: string): SprintTask['type'] {
  const lower = line.toLowerCase();
  if (/\b(test|coverage|fixture|spec)\b/.test(lower)) return 'test';
  if (/\b(fix|bug|patch|harden)\b/.test(lower)) return 'fix';
  if (/\b(refactor|cleanup|consolidate|split|extract)\b/.test(lower)) return 'refactor';
  return 'feature';
}

function extractActionItems(content: string): string[] {
  // Find "## Priority Actions" section (any heading variant)
  const m = content.match(/##\s+Priority\s+Actions[^\n]*\n([\s\S]*?)(?=\n##\s+|$)/i);
  if (!m) return [];
  const section = m[1];

  // Skip if the watchdog explicitly said nothing actionable this cycle
  if (/^\s*(none\s+required|none\s+identified|no\s+actions?)\b/im.test(section)) return [];

  // Numbered items: "1. ", "1) ", possibly with severity prefix like "URGENT: "
  const items = section.split(/\n(?=\d+[.)]\s)/).map(s => s.trim()).filter(Boolean);
  return items
    .map(item => item.replace(/^\d+[.)]\s*/, '').trim())
    .filter(item => item.length >= 30);  // raise floor: skip "1. None this week" stubs
}

/**
 * Pick only the most recent briefing per "source" prefix (e.g. one us-tax + one
 * eu-japan-tax + one cmo + ...). Avoids drowning the swarm in a 30-briefing
 * historical backlog on first run; ongoing runs process new files naturally
 * via the state-file hash check.
 */
function latestPerSource(files: string[]): string[] {
  // Source key = filename minus the date prefix
  const bySource: Record<string, string> = {};
  for (const f of files.slice().sort()) { // sorted ascending = last write wins per source
    const key = f.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    bySource[key] = f;
  }
  return Object.values(bySource).sort();
}

function buildTask(action: string, briefingFile: string, briefingDate: string, agent: string, n: number): SprintTask {
  const firstLine = action.split('\n')[0].trim();
  const priority = detectPriority(firstLine);
  const type = detectType(firstLine);
  const dateCompact = briefingDate.replace(/-/g, '');
  const sourceTag = briefingFile.includes('us-tax') ? 'UST' :
                    briefingFile.includes('eu-japan-tax') ? 'EUT' :
                    briefingFile.replace(/[^A-Z0-9]/gi, '').slice(0, 4).toUpperCase();

  // Strip leading severity tag from the visible description
  const cleanFirst = firstLine.replace(/^(URGENT|HIGH|MEDIUM|LOW|P[0-3])\s*[:.-]?\s*/i, '');

  return {
    id: `WD-${sourceTag}-${dateCompact}-${String(n).padStart(2, '0')}`,
    agent,
    type,
    priority,
    dependencies: [],
    status: 'pending',
    description: cleanFirst.slice(0, 120),
    context: `Auto-extracted from watchdog briefing: ${briefingFile}\n\nFull action text:\n${action}\n\n` +
             `--- IMPORTANT ---\nThis task was auto-generated. The CEO agent must refine the \`deliverables\` ` +
             `(specific file paths + acceptance criteria) before sprint-runner dispatches. The watchdog ` +
             `describes WHAT to do; the swarm needs HOW. If deliverables remain empty, agents will ` +
             `abort on pre-flight.`,
    deliverables: { code: [], tests: [], docs: [] },
    needs_refinement: true,
    source_briefing: briefingFile,
  };
}

function main(): void {
  const dryRun = process.argv.includes('--dry-run');

  if (!existsSync(BRIEFINGS_DIR)) {
    console.error(`No briefings directory at ${BRIEFINGS_DIR}`);
    process.exit(0);
  }

  const state = loadState();
  const allBriefings = readdirSync(BRIEFINGS_DIR)
    .filter(f => f.endsWith('.md') && !f.startsWith('.'))
    .sort();

  // First run (state empty): only process the latest briefing per source — avoids
  // a 30-briefing historical avalanche. Subsequent runs see all NEW briefings via
  // the hash check below (state.files[file] won't match if hash differs).
  const isFirstRun = Object.keys(state.files).length === 0;
  const briefings = isFirstRun ? latestPerSource(allBriefings) : allBriefings;

  if (isFirstRun) {
    console.log(`First run: processing ${briefings.length} latest-per-source briefings (skipping ${allBriefings.length - briefings.length} historical).`);
  }

  const generated: { briefing: string; tasks: SprintTask[] }[] = [];

  for (const file of briefings) {
    const fullPath = join(BRIEFINGS_DIR, file);
    const hash = hashFile(fullPath);

    if (state.files[file]?.hash === hash) continue; // unchanged since last run

    const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : new Date().toISOString().slice(0, 10);
    const agent = detectAgent(file);
    const actions = extractActionItems(readFileSync(fullPath, 'utf8'));

    if (actions.length === 0) {
      console.log(`  [skip] ${file}: no Priority Actions section`);
      if (!dryRun) state.files[file] = { hash, processedAt: new Date().toISOString(), sprintFile: '', taskIds: [] };
      continue;
    }

    const tasks = actions
      .slice(0, MAX_TASKS_PER_BRIEFING)
      .map((a, i) => buildTask(a, file, date, agent, i + 1));

    generated.push({ briefing: file, tasks });
    console.log(`  [new]  ${file}: ${tasks.length} task(s) (capped at ${MAX_TASKS_PER_BRIEFING})`);
  }

  if (generated.length === 0) {
    console.log('No new briefings to convert.');
    if (!dryRun) saveState(state);
    return;
  }

  const sprintN = nextSprintNumber();
  const sprintFile = join(SPRINTS_DIR, `week-${sprintN}.json`);
  const allTasks = generated.flatMap(g => g.tasks);
  const sprint = {
    week: sprintN,
    created: new Date().toISOString().slice(0, 10),
    notes: `Auto-generated by briefing-to-sprint.ts from ${generated.length} watchdog briefing(s): ` +
           `${generated.map(g => g.briefing).join(', ')}. ` +
           `All tasks have needs_refinement=true — CEO agent must populate deliverables before swarm dispatch.`,
    tasks: allTasks,
  };

  if (dryRun) {
    console.log(`\nDRY RUN — would write ${allTasks.length} task(s) to ${sprintFile}\n`);
    console.log(JSON.stringify(sprint, null, 2));
    return;
  }

  writeFileSync(sprintFile, JSON.stringify(sprint, null, 2) + '\n');
  for (const g of generated) {
    state.files[g.briefing] = {
      hash: hashFile(join(BRIEFINGS_DIR, g.briefing)),
      processedAt: new Date().toISOString(),
      sprintFile,
      taskIds: g.tasks.map(t => t.id),
    };
  }
  saveState(state);

  console.log(`\n✓ Wrote ${allTasks.length} task(s) to ${sprintFile} from ${generated.length} briefing(s).`);
  console.log(`  Sprint-runner will pick this up on its next 30-min cycle.`);
}

main();
