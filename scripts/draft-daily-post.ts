// Grounded CMO runner — drafts a daily X post from REAL inputs only.
//
// Inputs:
//   1. reports/cmo/communication-plan.md     (voice + rules)
//   2. reports/cmo/content-calendar.md       (founder-curated items)
//   3. reports/ceo/priorities-*.md           (last 3 reports — what shipped)
//   4. git log --since="48 hours ago"        (fresh ships not yet in CEO reports)
//   5. recent reports/cmo/drafts/            (avoid repeating ourselves)
//
// Guardrail: if grounded sources don't contain enough material for today's
// post type, output `NO POST TODAY` — never confabulate.
//
// Output: stdout + reports/cmo/drafts/<ts>-<type>.md
//
// Run on Hetzner:
//   cd ~/apps/Invoica && npx tsx scripts/draft-daily-post.ts [--type ...]
//
// Modes:
//   --type spotlight|qt|article|educational|comment   single draft of a type
//   --triage                                          scan ships, recommend yes/no per item
//   (default)                                         rotate by day-of-week

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const XAI_API_KEY = process.env.XAI_API_KEY;
if (!XAI_API_KEY) { console.error('Missing XAI_API_KEY'); process.exit(1); }
const XAI_BASE = (process.env.XAI_BASE_URL || 'https://api.x.ai/v1').replace(/\/$/, '');

type PostType = 'comment' | 'spotlight' | 'qt' | 'article' | 'educational';
const POST_TYPES: PostType[] = ['comment', 'spotlight', 'qt', 'article', 'educational'];

function argFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
function argValue(name: string): string | undefined {
  const eq = process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  if (eq) return eq;
  const idx = process.argv.indexOf(`--${name}`);
  return idx > -1 ? process.argv[idx + 1] : undefined;
}

function pickType(): PostType {
  const arg = argValue('type') as PostType | undefined;
  if (arg && POST_TYPES.includes(arg)) return arg;
  const rotation: Record<number, PostType> = {
    0: 'qt', 1: 'comment', 2: 'spotlight', 3: 'qt', 4: 'article', 5: 'educational', 6: 'spotlight',
  };
  return rotation[new Date().getUTCDay()] || 'spotlight';
}

const TYPE_BRIEFS: Record<PostType, string> = {
  comment:     "QT an article URL from the calendar with ONE substantive insight, not a hot take.",
  spotlight:   "Highlight a project from the calendar that has SHIPPED. Generous, builder-respectful, never territorial.",
  qt:          "Quote-tweet a real tweet URL from the calendar. Builder-mode reaction. Never sycophantic.",
  article:     "Link an article URL from the calendar with one paragraph on why it matters in the agent-economy lens.",
  educational: "Lead tweet of a 4-6 tweet educational thread teaching a calendar concept. Just the lead.",
};

function readFile(rel: string): string {
  try { return fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf-8'); }
  catch { return ''; }
}

function loadCeoReports(n = 3): string {
  const dir = path.resolve(__dirname, '..', 'reports/ceo');
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir)
      .filter(f => f.startsWith('priorities-') && f.endsWith('.md'))
      .sort()
      .slice(-n);
  } catch { return ''; }
  return files.map(f => {
    const content = readFile(`reports/ceo/${f}`);
    return `## ${f}\n\n${content.slice(0, 4000)}`;
  }).join('\n\n---\n\n');
}

function recentGitLog(): string {
  try {
    const log = execSync('git log --since="48 hours ago" --pretty=format:"%h · %ad · %s" --date=short', {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf-8',
      timeout: 5000,
    });
    return log || '(no commits in last 48h)';
  } catch { return '(git log unavailable)'; }
}

function recentDrafts(): string {
  const dir = path.resolve(__dirname, '..', 'reports/cmo/drafts');
  try {
    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith('draft-'))
      .sort()
      .slice(-5);
    return files.map(f => `### ${f}\n${readFile(`reports/cmo/drafts/${f}`).slice(0, 800)}`).join('\n\n');
  } catch { return '(no recent drafts)'; }
}

async function callGrok(messages: Array<{role: string; content: string}>): Promise<string> {
  const res = await fetch(`${XAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${XAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'grok-4-latest', messages, temperature: 0.6, max_tokens: 1200 }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Grok HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = await res.json() as any;
  return json.choices?.[0]?.message?.content || '(empty)';
}

async function runDraft() {
  const type = pickType();
  const plan = readFile('reports/cmo/communication-plan.md');
  const calendar = readFile('reports/cmo/content-calendar.md');
  const ceoReports = loadCeoReports();
  const gitLog = recentGitLog();
  const drafts = recentDrafts();

  const system = `You are the Invoica CMO running on Grok-4. You manage @invoica_ai per the communication plan below.

CRITICAL GUARDRAIL:
- You may ONLY post about real events that appear in: the content calendar, the CEO reports, or the recent git log below.
- You may NOT invent partner integrations, attribute work to wrong parties, fabricate URLs, or make up technical detail.
- If the inputs don't contain enough real material for today's post type, your output MUST start with the exact text \`NO POST TODAY\` and explain in one sentence what was missing.

You are required to cite which input you drew from (calendar item URL, CEO report filename, or git commit hash) in the RATIONALE section.

COMMUNICATION PLAN
==================
${plan}`;

  const user = `# Today's draft

**Type**: ${type}
**Brief**: ${TYPE_BRIEFS[type]}
**Date**: ${new Date().toISOString().slice(0, 10)}

# Available inputs (your ONLY allowed source material)

## Content calendar (founder-curated)
${calendar}

## Recent CEO reports (what shipped per CTO/CEO record)
${ceoReports}

## Git log — last 48 hours
\`\`\`
${gitLog}
\`\`\`

## Recent drafts (do NOT repeat these)
${drafts || '(none)'}

# Output format

If you can draft, respond as:

POST DRAFT
----------
<the tweet text, ready to copy-paste, under 280 chars unless it's an educational thread lead>

CITATION
--------
<which input you used — calendar item URL, CEO report filename, or git commit hash>

RATIONALE
---------
<2-3 sentences: why this post, why now, what comms-plan goal it serves>

REVIEW NOTES
------------
<anything risky the founder should sanity-check — partner names to confirm, links to verify>

If you cannot draft because inputs are insufficient, respond with:

NO POST TODAY
-------------
<one sentence on what was missing: e.g. "Calendar has zero spotlight items today; CEO reports don't mention any communicable ships in the last 48h.">`;

  console.log(`\n=== Drafting daily post (type: ${type}) ===\n`);
  const draft = await callGrok([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
  console.log(draft);

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const draftsDir = path.resolve(__dirname, '..', 'reports/cmo/drafts');
  fs.mkdirSync(draftsDir, { recursive: true });
  const outFile = path.join(draftsDir, `draft-${ts}-${type}.md`);
  fs.writeFileSync(outFile, `# Daily post draft · ${type} · ${ts}\n\n${draft}\n`);
  console.log(`\nSaved: ${outFile}\n`);
}

async function runTriage() {
  const plan = readFile('reports/cmo/communication-plan.md');
  const ceoReports = loadCeoReports();
  const gitLog = recentGitLog();

  const system = `You are the Invoica CMO triage step running on Grok-4. You scan recent shipping activity and recommend which ones deserve external comms.

For each material ship, output a row with:
  - what shipped (one line, factual, citing source)
  - communicate? (COMMUNICATE / SKIP / FOUNDER-DECIDE)
  - reasoning (one sentence)

COMMUNICATE = external-facing, builder-relevant, partner-relevant, or strategic
SKIP        = internal infra, refactor, bug fix that doesn't affect partners
FOUNDER-DECIDE = ambiguous (security fix that helps partners, mixed scope, etc.)

Be strict. The default should be SKIP unless there's a clear external story.

You may ONLY reference events that appear in the inputs below.`;

  const user = `# CEO reports (last 3)
${ceoReports}

# Git log — last 48 hours
\`\`\`
${gitLog}
\`\`\`

# Communication plan (for context on what's worth communicating)
${plan.slice(0, 3000)}

Output:

SHIP TRIAGE
-----------
| What shipped | Communicate? | Why |
|---|---|---|
| ... | ... | ... |

NEXT POSTING ACTIONS
--------------------
<a short list of which ships should generate a ship-day post combo, with suggested timing>`;

  console.log(`\n=== Ship triage ===\n`);
  const out = await callGrok([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
  console.log(out);

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const triageDir = path.resolve(__dirname, '..', 'reports/cmo/triage');
  fs.mkdirSync(triageDir, { recursive: true });
  fs.writeFileSync(path.join(triageDir, `triage-${ts}.md`), `# Ship triage · ${ts}\n\n${out}\n`);
}

async function runCycle() {
  console.log(`\n=== CMO daily cycle · ${new Date().toISOString()} ===\n`);
  console.log('[1/2] Running ship triage…\n');
  await runTriage();
  console.log('\n[2/2] Drafting today\'s rotation post…\n');
  await runDraft();
  console.log('\n=== Cycle complete ===\n');
}

(async () => {
  if (argFlag('cycle')) await runCycle();
  else if (argFlag('triage')) await runTriage();
  else await runDraft();
})();
