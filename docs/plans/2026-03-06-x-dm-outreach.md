# X DM Outreach Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `scripts/x-dm-outreach.ts` — a standalone script that finds X accounts tweeting about AI agent payments/x402/Base and sends them personalized DMs from @invoica_ai.

**Architecture:** Single TypeScript script with four phases: (1) search recent tweets for target accounts using Bearer token, (2) filter candidates against state file, (3) generate personalized DMs via Claude claude-haiku-4-5, (4) send via `POST /2/dm_conversations` with OAuth 1.0a. State persisted in `reports/x-admin/dm-outreach-state.json`.

**Tech Stack:** TypeScript / ts-node, Node.js built-ins only (https, crypto), dotenv, Anthropic API (claude-haiku-4-5), Twitter API v2

---

### Task 1: Scaffold script + Twitter search function

**Files:**
- Create: `scripts/x-dm-outreach.ts`

**Context:** The existing `x-post-utility.ts` has the OAuth 1.0a implementation already — copy the `httpsRequest`, `buildAuthorizationHeader`, `pct`, and credential-loading patterns exactly. Bearer token calls (search) use `Authorization: Bearer ${token}`. OAuth 1.0a (DM sends) use the signature builder.

**Step 1: Create the file with imports, credential loader, and httpsRequest helper**

```typescript
/**
 * x-dm-outreach.ts
 *
 * Discovers X accounts building on x402/AI agents/Base and sends personalized DMs.
 *
 * CLI:
 *   ts-node scripts/x-dm-outreach.ts --run        # full cycle
 *   ts-node scripts/x-dm-outreach.ts --dry-run    # discover + preview, no sending
 *   ts-node scripts/x-dm-outreach.ts --status     # show state
 */

import * as https from 'https';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

try { require('dotenv/config'); } catch {}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MAX_CANDIDATES = 20;
const MAX_DMS_PER_RUN = 5;
const DM_DELAY_MS = 30_000; // 30s between DMs

const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(ROOT, 'reports', 'x-admin');
const STATE_FILE = path.join(REPORTS_DIR, 'dm-outreach-state.json');

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------
interface XCredentials {
  apiKey: string; apiSecret: string;
  accessToken: string; accessTokenSecret: string;
  bearerToken: string;
}

function loadCredentials(): XCredentials {
  // Remap INVOICA_X_* → X_* (same pattern as run-x-admin.ts)
  if (process.env.INVOICA_X_API_KEY)             process.env.X_API_KEY             = process.env.INVOICA_X_API_KEY;
  if (process.env.INVOICA_X_API_SECRET)          process.env.X_API_SECRET          = process.env.INVOICA_X_API_SECRET;
  if (process.env.INVOICA_X_ACCESS_TOKEN)        process.env.X_ACCESS_TOKEN        = process.env.INVOICA_X_ACCESS_TOKEN;
  if (process.env.INVOICA_X_ACCESS_TOKEN_SECRET) process.env.X_ACCESS_TOKEN_SECRET = process.env.INVOICA_X_ACCESS_TOKEN_SECRET;
  if (process.env.INVOICA_X_BEARER_TOKEN)        process.env.X_BEARER_TOKEN        = process.env.INVOICA_X_BEARER_TOKEN;

  const missing = ['X_API_KEY','X_API_SECRET','X_ACCESS_TOKEN','X_ACCESS_TOKEN_SECRET','X_BEARER_TOKEN']
    .filter(k => !process.env[k]);
  if (missing.length) throw new Error(`Missing env vars: ${missing.join(', ')}`);

  return {
    apiKey: process.env.X_API_KEY!,
    apiSecret: process.env.X_API_SECRET!,
    accessToken: process.env.X_ACCESS_TOKEN!,
    accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET!,
    bearerToken: process.env.X_BEARER_TOKEN!,
  };
}

// ---------------------------------------------------------------------------
// HTTP + OAuth (copied from x-post-utility.ts pattern)
// ---------------------------------------------------------------------------
function pct(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function buildOAuthHeader(
  method: string, url: string,
  creds: XCredentials,
  extraParams: Record<string, string> = {}
): string {
  const op: Record<string, string> = {
    oauth_consumer_key:     creds.apiKey,
    oauth_nonce:            crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
    oauth_token:            creds.accessToken,
    oauth_version:          '1.0',
  };
  const all = { ...op, ...extraParams };
  const base = [
    method.toUpperCase(),
    pct(url),
    pct(Object.keys(all).sort().map(k => `${pct(k)}=${pct(all[k])}`).join('&')),
  ].join('&');
  const sigKey = `${pct(creds.apiSecret)}&${pct(creds.accessTokenSecret)}`;
  op['oauth_signature'] = crypto.createHmac('sha1', sigKey).update(base).digest('base64');
  return 'OAuth ' + Object.keys(op).sort().map(k => `${pct(k)}="${pct(op[k])}"`).join(', ');
}

function httpsGet(url: string, bearerToken: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname, port: 443,
      path: parsed.pathname + parsed.search, method: 'GET',
      headers: { Authorization: `Bearer ${bearerToken}`, 'User-Agent': 'x-dm-outreach/1.0' },
    }, res => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function httpsPost(url: string, headers: Record<string, string>, bodyObj: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(bodyObj);
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname, port: 443,
      path: parsed.pathname + parsed.search, method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body).toString(), 'User-Agent': 'x-dm-outreach/1.0' },
    }, res => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
```

**Step 2: Add tweet search function**

```typescript
// ---------------------------------------------------------------------------
// Account Discovery
// ---------------------------------------------------------------------------
interface Candidate {
  userId: string;
  username: string;
  name: string;
  bio: string;
  followersCount: number;
  matchingTweet: string;
}

const SEARCH_QUERIES = [
  '(x402 OR "HTTP 402" OR "agent payments" OR "AI agent invoicing") lang:en -is:retweet',
  '("Base network" OR "Base L2" OR "USDC" OR "autonomous agents") (billing OR payments OR invoicing) lang:en -is:retweet',
];

async function searchTargetAccounts(bearerToken: string): Promise<Candidate[]> {
  const seen = new Set<string>();
  const candidates: Candidate[] = [];

  for (const query of SEARCH_QUERIES) {
    if (candidates.length >= MAX_CANDIDATES) break;

    const url = new URL('https://api.twitter.com/2/tweets/search/recent');
    url.searchParams.set('query', query);
    url.searchParams.set('max_results', '20');
    url.searchParams.set('tweet.fields', 'author_id,text');
    url.searchParams.set('expansions', 'author_id');
    url.searchParams.set('user.fields', 'id,username,name,description,public_metrics');

    console.log(`  [search] Query: ${query.slice(0, 60)}...`);
    const res = await httpsGet(url.toString(), bearerToken);

    if (res.status !== 200) {
      console.log(`  [search] Failed ${res.status}: ${JSON.stringify(res.body).slice(0, 200)}`);
      continue;
    }

    const tweets: any[] = res.body.data || [];
    const users: any[] = res.body.includes?.users || [];
    const userMap = new Map(users.map((u: any) => [u.id, u]));

    for (const tweet of tweets) {
      if (candidates.length >= MAX_CANDIDATES) break;
      const user = userMap.get(tweet.author_id);
      if (!user) continue;
      if (seen.has(user.id)) continue;
      seen.add(user.id);

      // Filters
      if (!user.description || user.description.trim().length < 10) continue; // no bio
      if ((user.public_metrics?.followers_count ?? 0) < 50) continue;        // too small
      if (user.username.toLowerCase() === 'invoica_ai') continue;            // skip self

      candidates.push({
        userId: user.id,
        username: user.username,
        name: user.name,
        bio: user.description,
        followersCount: user.public_metrics?.followers_count ?? 0,
        matchingTweet: tweet.text,
      });
    }

    console.log(`  [search] Found ${candidates.length} candidates so far`);
    await new Promise(r => setTimeout(r, 1000)); // brief pause between searches
  }

  return candidates;
}
```

**Step 3: Verify it compiles**

```bash
cd /Users/tarekmnif/Invoica
npx ts-node --transpile-only scripts/x-dm-outreach.ts --help 2>&1 | head -5
```

Expected: no TypeScript errors (may error on missing CLI handler — that's fine, add placeholder at bottom):
```typescript
// Placeholder — CLI added in Task 3
if (require.main === module) {
  console.log('x-dm-outreach: use --run, --dry-run, or --status');
}
```

**Step 4: Commit**

```bash
cd /Users/tarekmnif/Invoica
git add scripts/x-dm-outreach.ts
git commit -m "feat(x-dm): scaffold script with search + OAuth helpers"
```

---

### Task 2: State management + candidate filtering

**Files:**
- Modify: `scripts/x-dm-outreach.ts`

**Step 1: Add state types and load/save functions**

```typescript
// ---------------------------------------------------------------------------
// State Management
// ---------------------------------------------------------------------------
interface ContactedEntry {
  username: string;
  sentAt: string;
  dmText: string;
}

interface RunEntry {
  date: string;
  candidates: number;
  sent: number;
}

interface OutreachState {
  contacted: Record<string, ContactedEntry>; // keyed by userId
  runs: RunEntry[];
}

function ensureDir(d: string) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function loadState(): OutreachState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch { /* reset on parse error */ }
  return { contacted: {}, runs: [] };
}

function saveState(state: OutreachState): void {
  ensureDir(REPORTS_DIR);
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}
```

**Step 2: Add filterNewCandidates function**

```typescript
function filterNewCandidates(candidates: Candidate[], state: OutreachState): Candidate[] {
  return candidates.filter(c => !state.contacted[c.userId]);
}
```

**Step 3: Add --status CLI handler (partial CLI — full in Task 4)**

Add near the bottom of the file:
```typescript
function printStatus(): void {
  const state = loadState();
  const contacted = Object.entries(state.contacted);
  console.log(`\n=== X DM Outreach Status ===`);
  console.log(`Total accounts contacted: ${contacted.length}`);
  if (contacted.length > 0) {
    console.log('\nContacted accounts:');
    contacted.forEach(([userId, entry]) => {
      console.log(`  @${entry.username} — ${entry.sentAt.slice(0, 10)}`);
      console.log(`    DM: ${entry.dmText.slice(0, 80)}...`);
    });
  }
  console.log(`\nRun history (last 5):`);
  state.runs.slice(-5).forEach(r => {
    console.log(`  ${r.date}: ${r.candidates} candidates, ${r.sent} sent`);
  });
}
```

**Step 4: Verify manually**

```bash
cd /Users/tarekmnif/Invoica
npx ts-node --transpile-only scripts/x-dm-outreach.ts --status
```

Expected output: `Total accounts contacted: 0`

**Step 5: Commit**

```bash
cd /Users/tarekmnif/Invoica
git add scripts/x-dm-outreach.ts
git commit -m "feat(x-dm): add state management and candidate dedup"
```

---

### Task 3: DM personalization via Claude

**Files:**
- Modify: `scripts/x-dm-outreach.ts`

**Context:** The Anthropic API call pattern is identical to what's in `run-x-admin.ts` — `POST api.anthropic.com/v1/messages` with `x-api-key` header. Use `claude-haiku-4-5` (fast, cheap). The goal is a short, specific DM — max 280 chars.

**Step 1: Add generatePersonalizedDM function**

```typescript
// ---------------------------------------------------------------------------
// DM Personalization
// ---------------------------------------------------------------------------
async function generatePersonalizedDM(candidate: Candidate): Promise<string> {
  const firstName = candidate.name.split(' ')[0] || candidate.username;

  const body = JSON.stringify({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    system: `You write cold outreach DMs for @invoica_ai — the Financial OS for AI Agents (automated invoicing, on-chain settlement on Base, pay-per-use AI inference at 0.003 USDC/call, free beta).

Rules:
- 1-2 sentences max. Under 280 characters total.
- Start with their first name (no "Hey there!" or "Hi!")
- Reference ONE specific thing from their bio or tweet — not generic
- Describe Invoica in 1 clause: "financial OS for AI agents — automated invoicing + on-chain settlement"
- End with: "Free beta at invoica.ai — happy to walk you through it."
- No hashtags. No emoji. No filler phrases like "great work" or "love what you're building".
- Return ONLY the DM text, no JSON, no quotes.`,
    messages: [{
      role: 'user',
      content: `Target account: @${candidate.username} (${candidate.name})
Bio: ${candidate.bio}
Their recent tweet: "${candidate.matchingTweet}"

Write the DM.`
    }],
  });

  const res = await httpsPost('https://api.anthropic.com/v1/messages', {
    'x-api-key': process.env.ANTHROPIC_API_KEY!,
    'anthropic-version': '2023-06-01',
  }, JSON.parse(body)); // re-parse since httpsPost re-stringifies

  // Actually fix: pass body as object
  const response = await (async () => {
    const chunks: Buffer[] = [];
    return new Promise<any>((resolve, reject) => {
      const parsed = new URL('https://api.anthropic.com/v1/messages');
      const req = https.request({
        hostname: parsed.hostname, port: 443,
        path: '/v1/messages', method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(body).toString(),
        },
      }, res => {
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString())));
        res.on('error', reject);
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  })();

  const text = response.content?.[0]?.text?.trim() || '';
  if (!text) throw new Error('Claude returned empty DM');
  if (text.length > 280) return text.slice(0, 277) + '...';
  return text;
}
```

Note: the `httpsPost` helper above double-encodes. Simplify by inlining the Anthropic call directly (raw https) as shown in `run-x-admin.ts` pattern (`apiCall` function). The exact pattern is in `run-x-admin.ts:74-93`.

**Step 2: Test personalization manually in dry-run (add temp main)**

Temporarily add at the bottom to test:
```typescript
// TEMP TEST — remove before Task 4
if (require.main === module) {
  generatePersonalizedDM({
    userId: 'test', username: 'testuser', name: 'Alice Dev',
    bio: 'Building AI agent workflows on Base. Shipping autonomous payment systems.',
    followersCount: 200,
    matchingTweet: 'Just wired up my first agent-to-agent USDC transfer on Base mainnet 🔥',
  }).then(dm => {
    console.log('Generated DM:');
    console.log(dm);
    console.log(`Length: ${dm.length} chars`);
  });
}
```

Run:
```bash
cd /Users/tarekmnif/Invoica
ANTHROPIC_API_KEY=$(grep ANTHROPIC_API_KEY .env | cut -d= -f2) npx ts-node --transpile-only scripts/x-dm-outreach.ts
```

Expected: a personalized 1-2 sentence DM under 280 chars referencing Base/agents.

**Step 3: Remove temp test, commit**

```bash
cd /Users/tarekmnif/Invoica
git add scripts/x-dm-outreach.ts
git commit -m "feat(x-dm): add Claude personalization for DMs"
```

---

### Task 4: DM sending via Twitter API v2

**Files:**
- Modify: `scripts/x-dm-outreach.ts`

**Context:** Twitter API v2 DM endpoint: `POST /2/dm_conversations`. Requires OAuth 1.0a (same as tweet posting). Returns 201 on success with `{ data: { dm_conversation_id, dm_event_id } }`. Returns 403 if app doesn't have DM permissions — in that case stop immediately.

**Prerequisite note:** The X Developer Portal app must have "Read and Write and Direct Messages" permission. If it only has "Read and Write", all DM calls will return 403. The script will detect this and print instructions.

**Step 1: Add sendDM function**

```typescript
// ---------------------------------------------------------------------------
// DM Sending
// ---------------------------------------------------------------------------
interface SendDMResult {
  success: boolean;
  dmConversationId?: string;
  error?: string;
  permissionError?: boolean;
}

async function sendDM(userId: string, message: string, creds: XCredentials): Promise<SendDMResult> {
  const url = 'https://api.twitter.com/2/dm_conversations';
  const payload = {
    participant_ids: [userId],
    message: { text: message },
  };
  const body = JSON.stringify(payload);
  const authHeader = buildOAuthHeader('POST', url, creds);

  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname, port: 443,
      path: parsed.pathname, method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body).toString(),
        'User-Agent': 'x-dm-outreach/1.0',
      },
    }, res => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString();
        let parsed: any;
        try { parsed = JSON.parse(rawBody); } catch { parsed = rawBody; }

        if (res.statusCode === 201) {
          resolve({
            success: true,
            dmConversationId: parsed?.data?.dm_conversation_id,
          });
        } else if (res.statusCode === 403) {
          resolve({
            success: false,
            permissionError: true,
            error: `403 Forbidden — your X app likely needs "Direct Messages" permission.\n` +
              `Go to: https://developer.twitter.com/en/portal/projects-and-apps\n` +
              `Enable: "Read and Write and Direct Messages"\n` +
              `Then regenerate access tokens and update .env`,
          });
        } else {
          resolve({
            success: false,
            error: `${res.statusCode}: ${JSON.stringify(parsed).slice(0, 200)}`,
          });
        }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
```

**Step 2: Commit**

```bash
cd /Users/tarekmnif/Invoica
git add scripts/x-dm-outreach.ts
git commit -m "feat(x-dm): add sendDM via POST /2/dm_conversations"
```

---

### Task 5: Main run loop + logging

**Files:**
- Modify: `scripts/x-dm-outreach.ts`

**Step 1: Add logging helper**

```typescript
// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------
function appendRunLog(entries: string[]): void {
  ensureDir(REPORTS_DIR);
  const date = new Date().toISOString().slice(0, 10);
  const logPath = path.join(REPORTS_DIR, `dm-outreach-${date}.md`);
  if (!fs.existsSync(logPath)) {
    fs.writeFileSync(logPath, `# DM Outreach Log — ${date}\n\n`);
  }
  fs.appendFileSync(logPath, entries.join('\n') + '\n\n');
}
```

**Step 2: Add main run function**

```typescript
// ---------------------------------------------------------------------------
// Main Run
// ---------------------------------------------------------------------------
async function run(dryRun: boolean): Promise<void> {
  console.log(`\n[x-dm-outreach] Starting ${dryRun ? 'DRY RUN' : 'LIVE RUN'}`);
  const creds = loadCredentials();
  const state = loadState();
  const date = new Date().toISOString().slice(0, 10);

  // Step 1: Discover candidates
  console.log('\n→ Discovering target accounts...');
  const allCandidates = await searchTargetAccounts(creds.bearerToken);
  console.log(`  Found ${allCandidates.length} candidates from search`);

  // Step 2: Filter already-contacted
  const newCandidates = filterNewCandidates(allCandidates, state);
  console.log(`  ${newCandidates.length} new (not yet contacted)`);

  const toContact = newCandidates.slice(0, MAX_DMS_PER_RUN);
  console.log(`  Will contact: ${toContact.length} (cap: ${MAX_DMS_PER_RUN})`);

  if (toContact.length === 0) {
    console.log('\n  No new candidates to contact. Done.');
    return;
  }

  const logEntries: string[] = [`## Run at ${new Date().toISOString()}\n**Mode:** ${dryRun ? 'dry-run' : 'live'}\n**Candidates:** ${allCandidates.length} found, ${toContact.length} selected\n`];

  let sentCount = 0;

  // Step 3: Generate + send
  for (const candidate of toContact) {
    console.log(`\n→ @${candidate.username} (${candidate.followersCount} followers)`);
    console.log(`  Bio: ${candidate.bio.slice(0, 80)}`);
    console.log(`  Tweet: ${candidate.matchingTweet.slice(0, 80)}`);

    let dmText: string;
    try {
      console.log('  Generating personalized DM...');
      dmText = await generatePersonalizedDM(candidate);
      console.log(`  DM (${dmText.length} chars): ${dmText}`);
    } catch (e: any) {
      console.log(`  ❌ Generation failed: ${e.message}`);
      logEntries.push(`### @${candidate.username}\n❌ DM generation failed: ${e.message}\n`);
      continue;
    }

    logEntries.push(`### @${candidate.username} (${candidate.userId})\n**Bio:** ${candidate.bio}\n**Tweet:** ${candidate.matchingTweet}\n**DM:** ${dmText}\n`);

    if (dryRun) {
      console.log('  [DRY RUN] Would send — skipping');
      logEntries.push('**Result:** DRY RUN — not sent\n');
      continue;
    }

    console.log('  Sending DM...');
    const result = await sendDM(candidate.userId, dmText, creds);

    if (result.success) {
      console.log(`  ✅ Sent! Conversation: ${result.dmConversationId}`);
      sentCount++;

      // Record in state
      state.contacted[candidate.userId] = {
        username: candidate.username,
        sentAt: new Date().toISOString(),
        dmText,
      };
      saveState(state);

      logEntries.push(`**Result:** ✅ Sent — conversation ${result.dmConversationId}\n`);

      // Rate limit: wait 30s between DMs
      if (sentCount < toContact.length) {
        console.log(`  Waiting ${DM_DELAY_MS / 1000}s before next DM...`);
        await new Promise(r => setTimeout(r, DM_DELAY_MS));
      }
    } else if (result.permissionError) {
      console.log(`\n  ❌ PERMISSION ERROR — stopping run\n`);
      console.log(result.error);
      logEntries.push(`**Result:** ❌ Permission error — run stopped\n${result.error}\n`);
      break; // stop on permission error
    } else {
      console.log(`  ❌ Failed: ${result.error}`);
      logEntries.push(`**Result:** ❌ Failed: ${result.error}\n`);
    }
  }

  // Record run in state
  state.runs.push({ date, candidates: allCandidates.length, sent: sentCount });
  saveState(state);

  appendRunLog(logEntries);

  console.log(`\n[x-dm-outreach] Done. Sent: ${sentCount}/${toContact.length}`);
  console.log(`Log: ${path.join(REPORTS_DIR, `dm-outreach-${date}.md`)}`);
}
```

**Step 3: Commit**

```bash
cd /Users/tarekmnif/Invoica
git add scripts/x-dm-outreach.ts
git commit -m "feat(x-dm): add main run loop with logging"
```

---

### Task 6: CLI entry point

**Files:**
- Modify: `scripts/x-dm-outreach.ts`

**Step 1: Replace placeholder CLI with full entry point**

```typescript
// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function printUsage(): void {
  console.log(`
x-dm-outreach.ts — X/Twitter DM Outreach for Invoica

Usage:
  ts-node scripts/x-dm-outreach.ts --run        Full cycle: discover → generate → send
  ts-node scripts/x-dm-outreach.ts --dry-run    Discover + preview DMs, no sending
  ts-node scripts/x-dm-outreach.ts --status     Show contacted accounts and run history

Environment variables (same as x-post-utility):
  INVOICA_X_API_KEY, INVOICA_X_API_SECRET
  INVOICA_X_ACCESS_TOKEN, INVOICA_X_ACCESS_TOKEN_SECRET
  INVOICA_X_BEARER_TOKEN
  ANTHROPIC_API_KEY

Note: X app must have "Read and Write and Direct Messages" permission for --run.
Max ${MAX_DMS_PER_RUN} DMs per run, ${DM_DELAY_MS / 1000}s delay between sends.
`);
}

if (require.main === module) {
  const arg = process.argv[2];
  if (arg === '--run') {
    run(false).catch(e => { console.error('[x-dm-outreach] Fatal:', e); process.exit(1); });
  } else if (arg === '--dry-run') {
    run(true).catch(e => { console.error('[x-dm-outreach] Fatal:', e); process.exit(1); });
  } else if (arg === '--status') {
    printStatus();
  } else {
    printUsage();
    if (arg && arg !== '--help' && arg !== '-h') process.exit(1);
  }
}
```

**Step 2: Test dry-run end to end**

```bash
cd /Users/tarekmnif/Invoica
npx ts-node --transpile-only scripts/x-dm-outreach.ts --dry-run 2>&1 | head -60
```

Expected:
```
[x-dm-outreach] Starting DRY RUN

→ Discovering target accounts...
  [search] Query: (x402 OR "HTTP 402" OR "agent payments"...
  Found N candidates from search
  M new (not yet contacted)
  Will contact: K (cap: 5)

→ @someuser (1234 followers)
  Bio: Building on Base...
  Generating personalized DM...
  DM (N chars): Hey Alice — saw you're...
  [DRY RUN] Would send — skipping
```

**Step 3: Test --status**

```bash
npx ts-node --transpile-only scripts/x-dm-outreach.ts --status
```

Expected: shows run history with dry-run entry.

**Step 4: Commit**

```bash
cd /Users/tarekmnif/Invoica
git add scripts/x-dm-outreach.ts
git commit -m "feat(x-dm): complete CLI with --run, --dry-run, --status"
```

---

### Task 7: Update agent.yaml and prompt.md

**Files:**
- Modify: `agents/x-admin/agent.yaml`
- Modify: `agents/x-admin/prompt.md`

**Step 1: Add dm-outreach to agent.yaml on_demand section**

In `agents/x-admin/agent.yaml`, find the `on_demand:` block (currently lines ~51-54) and add:

```yaml
    - dm-outreach
```

After the existing on_demand items, the block should read:
```yaml
  on_demand:
    - draft-content
    - trend-monitor
    - engagement-reply
    - dm-outreach
```

**Step 2: Add DM Outreach section to prompt.md**

Append to `agents/x-admin/prompt.md`:

```markdown
## DM Outreach

You can identify and reach out to X accounts that could benefit from Invoica.

**When asked to run DM outreach:**
- Run `ts-node scripts/x-dm-outreach.ts --dry-run` first and show the preview
- Only run `ts-node scripts/x-dm-outreach.ts --run` with explicit owner approval
- Check `--status` to avoid contacting the same accounts twice
- Max 5 DMs per run (enforced by script)

**Target profiles:** builders working on AI agents, x402/HTTP 402, Base network payments, USDC settlement, autonomous agent infrastructure.

**DM tone:** Personal, specific, technical. Never generic. Always under 280 chars.
```

**Step 3: Commit**

```bash
cd /Users/tarekmnif/Invoica
git add agents/x-admin/agent.yaml agents/x-admin/prompt.md
git commit -m "feat(x-dm): update x-admin agent with dm-outreach capability"
```

---

### Task 8: Push to remote

**Step 1: Push all commits**

```bash
cd /Users/tarekmnif/Invoica
git push origin main
```

**Step 2: Pull on server (if running)**

```bash
ssh invoica-server "cd /home/invoica/apps/Invoica && git pull --rebase"
```

**Step 3: Verify script exists on server**

```bash
ssh invoica-server "ls /home/invoica/apps/Invoica/scripts/x-dm-outreach.ts"
```

---

## Verification

After all tasks:

```bash
# 1. Help works
ts-node scripts/x-dm-outreach.ts --help

# 2. Status works (empty state)
ts-node scripts/x-dm-outreach.ts --status

# 3. Dry run finds candidates and generates DMs without sending
ts-node scripts/x-dm-outreach.ts --dry-run

# 4. Compiled TypeScript has no errors
npx tsc --noEmit
```

## Note on X App Permissions

Before `--run` can send DMs, the X Developer App must be upgraded:
1. Go to https://developer.twitter.com/en/portal/projects-and-apps
2. Select the Invoica app → Settings → User authentication settings
3. Change permissions to **"Read and Write and Direct Messages"**
4. Regenerate Access Token + Secret
5. Update `INVOICA_X_ACCESS_TOKEN` and `INVOICA_X_ACCESS_TOKEN_SECRET` in `.env`

The script will detect 403 errors and print these instructions automatically.
