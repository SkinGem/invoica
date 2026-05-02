#!/usr/bin/env -S npx tsx
/**
 * ceo-refines-pending-sprint.ts
 *
 * Final link in the autonomy loop:
 *
 *   watchdog → briefing-to-sprint.ts → sprints/week-N.json (needs_refinement=true)
 *   → THIS SCRIPT → sprints/week-N.json (needs_refinement=false, deliverables populated)
 *   → sprint-runner → MiniMax agents
 *
 * Without this step, auto-generated sprint tasks have empty `deliverables` arrays
 * and would abort on the orchestrator's pre-flight check (which refuses to write
 * files that aren't in the manifest). This script asks the CEO agent (Claude) to
 * translate the watchdog's WHAT into a concrete HOW: which files to create/modify,
 * which tests to write, which docs to update.
 *
 * Behavior per task with needs_refinement=true:
 *   1. Send the task description + context + Invoica codebase conventions to
 *      Claude Sonnet.
 *   2. Receive structured JSON: {deliverables, acceptance, agent_override?}.
 *   3. Update the task in-place, set needs_refinement=false, attach
 *      `refined_at` and `refined_by: "ceo-refines-pending-sprint.ts"`.
 *   4. Write the sprint file back.
 *
 * Skips tasks that already have populated deliverables (idempotent re-runs OK).
 *
 * Usage:
 *   ./scripts/ceo-refines-pending-sprint.ts                 # refine ALL sprints
 *   ./scripts/ceo-refines-pending-sprint.ts week-119.json   # one sprint only
 *   ./scripts/ceo-refines-pending-sprint.ts --dry-run       # show plan, don't call Claude
 *
 * Env required: ANTHROPIC_API_KEY
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const SPRINTS_DIR = 'sprints';
const MODEL = process.env.CEO_REFINER_MODEL || 'claude-sonnet-4-5-20250929';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

const REPO_CONVENTIONS = `
Invoica codebase conventions:
  - Backend: Node + TypeScript + Express, source under backend/src/
  - Routes:    backend/src/routes/<name>.ts                 (Express routers)
  - Services:  backend/src/services/<area>/<file>.ts        (e.g. tax/, settlement/, asterpay/, clinpay/)
  - Middleware: backend/src/middleware/<name>.ts            (e.g. auth.ts, rate-limiter.ts, quota.ts)
  - Lib utils: backend/src/lib/<name>.ts                    (e.g. logger.ts, prisma.ts, helixa.ts)
  - Tests:     <co-located-dir>/__tests__/<name>.test.ts
  - Migrations: supabase/migrations/NNN_<snake_name>.sql    (NNN = next number; current latest is 011)
  - Docs:      docs/<area>/<topic>.md  OR  docs-site/<topic>.md  for developer-facing
  - Config:    backend/src/config/<name>.ts                 (e.g. chains.ts)
  - Frontend (if needed): frontend/app/<route>/page.tsx     (Next.js)
Naming: PascalCase for Supabase tables ("Invoice", "ClinPaySession"), camelCase for code.
Files MUST stay <= 300 lines (FP-007). New file paths preferred over editing files >200 lines.
`;

interface Task {
  id: string;
  agent?: string;
  type?: string;
  priority?: string;
  description: string;
  context?: string;
  deliverables?: { code: string[]; tests: string[]; docs: string[] };
  needs_refinement?: boolean;
  acceptance?: string;
  refined_at?: string;
  refined_by?: string;
}

interface Sprint {
  week?: number | string;
  notes?: string;
  tasks: Task[];
}

interface RefinementResponse {
  deliverables: { code: string[]; tests: string[]; docs: string[] };
  acceptance: string;
  agent_override?: string;
  reasoning?: string;
}

async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json() as { content: Array<{ text: string }> };
  return data.content?.[0]?.text || '';
}

function buildSystemPrompt(): string {
  return `You are the CEO of Invoica — the strategic decision-maker who translates abstract task descriptions ` +
    `from external watchdogs into concrete, executable sprint-task specs that the swarm of MiniMax coding ` +
    `agents can actually ship.

Your job: given an auto-extracted task description and surrounding context, decide which files need to change ` +
    `(create or modify) to satisfy the task, and write a one-paragraph acceptance criterion.

${REPO_CONVENTIONS}

Output ONLY valid JSON matching this schema (no prose, no code fences):
{
  "deliverables": {
    "code":  [ "<path>", ... ],   // files to create or modify
    "tests": [ "<path>", ... ],   // test files (alongside code or in __tests__/)
    "docs":  [ "<path>", ... ]    // markdown docs (only if directly required)
  },
  "acceptance": "<one paragraph: what observable behavior proves the task is done>",
  "agent_override": "<optional: backend-core|backend-tax|backend-ledger|security|frontend|devops — only if different from existing>",
  "reasoning": "<one short sentence why these files>"
}

Rules:
- Prefer NEW files over editing files near or above 300 lines (FP-007).
- For tax/compliance tasks: deliverables go under backend/src/services/tax/ or backend/src/middleware/.
- For security tasks: backend/src/middleware/, backend/src/lib/, or backend/src/services/security/.
- For data-model changes: include a supabase/migrations/NNN_<name>.sql entry where NNN is the next available number after 011.
- Keep deliverables minimal (2-5 files). Don't over-scope. The swarm ships small.
- If the task as written is too vague to plan, return {"deliverables": {"code":[], "tests":[], "docs":[]}, "acceptance":"NEEDS_HUMAN_SCOPE: <why>", "reasoning":"too vague"} — that signals owner-action.`;
}

function parseClaudeJSON(text: string): RefinementResponse {
  // Strip code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  // Find first { ... last }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error(`No JSON object in response: ${text.slice(0, 200)}`);
  const obj = JSON.parse(cleaned.slice(start, end + 1)) as RefinementResponse;
  if (!obj.deliverables) throw new Error('Response missing deliverables');
  obj.deliverables.code = obj.deliverables.code || [];
  obj.deliverables.tests = obj.deliverables.tests || [];
  obj.deliverables.docs = obj.deliverables.docs || [];
  return obj;
}

async function refineTask(task: Task): Promise<Task> {
  const userPrompt = `Task ID: ${task.id}
Suggested agent: ${task.agent || 'backend-core'}
Type: ${task.type || 'feature'}
Priority: ${task.priority || 'medium'}

Description:
${task.description}

Full context from watchdog:
${task.context || '(no additional context)'}

Translate this into deliverables + acceptance criterion. Respond with ONLY the JSON object.`;

  const reply = await callClaude(buildSystemPrompt(), userPrompt);
  const refinement = parseClaudeJSON(reply);

  return {
    ...task,
    agent: refinement.agent_override || task.agent || 'backend-core',
    deliverables: refinement.deliverables,
    acceptance: refinement.acceptance,
    needs_refinement: false,
    refined_at: new Date().toISOString(),
    refined_by: 'ceo-refines-pending-sprint.ts',
  };
}

function tasksNeedingRefinement(sprint: Sprint): number {
  if (!Array.isArray(sprint.tasks)) return 0;
  return sprint.tasks.filter(t => t && t.needs_refinement === true).length;
}

async function refineSprintFile(file: string, dryRun: boolean): Promise<number> {
  const path = join(SPRINTS_DIR, file);
  let sprint: Sprint;
  try {
    sprint = JSON.parse(readFileSync(path, 'utf8')) as Sprint;
  } catch {
    return 0; // unparseable, ignore
  }
  if (!Array.isArray(sprint.tasks)) return 0;
  const pending = tasksNeedingRefinement(sprint);
  if (pending === 0) {
    console.log(`  ${file}: no tasks need refinement`);
    return 0;
  }

  console.log(`  ${file}: ${pending} task(s) to refine${dryRun ? ' (dry-run)' : ''}`);
  if (dryRun) return pending;

  let refined = 0;
  for (let i = 0; i < sprint.tasks.length; i++) {
    const t = sprint.tasks[i];
    if (t.needs_refinement !== true) continue;
    try {
      console.log(`    [${t.id}] refining via Claude…`);
      sprint.tasks[i] = await refineTask(t);
      const codeCount = sprint.tasks[i].deliverables?.code.length || 0;
      const acceptance = (sprint.tasks[i].acceptance || '').slice(0, 60);
      console.log(`    [${t.id}] → ${codeCount} code file(s), agent=${sprint.tasks[i].agent}, acceptance=${acceptance}…`);
      refined++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`    [${t.id}] ✗ refinement failed: ${msg.slice(0, 200)} (left needs_refinement=true)`);
    }
  }

  if (refined > 0) {
    writeFileSync(path, JSON.stringify(sprint, null, 2) + '\n');
    console.log(`  ${file}: wrote ${refined} refined task(s) back`);
  }
  return refined;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const explicitFile = args.find(a => a.endsWith('.json'));

  if (!existsSync(SPRINTS_DIR)) {
    console.error(`No sprints directory at ${SPRINTS_DIR}`);
    process.exit(1);
  }

  const files = explicitFile
    ? [explicitFile]
    : readdirSync(SPRINTS_DIR).filter(f => /^week-\d+\.json$/.test(f)).sort();

  let totalRefined = 0;
  for (const f of files) {
    if (!existsSync(join(SPRINTS_DIR, f))) {
      console.warn(`  ${f}: not found, skipping`);
      continue;
    }
    totalRefined += await refineSprintFile(f, dryRun);
  }

  console.log(`\n${dryRun ? 'Would refine' : '✓ Refined'} ${totalRefined} task(s) total.`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
